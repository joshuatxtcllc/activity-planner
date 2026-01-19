import { Router } from 'express';
import { db } from '../db';
import { curatorConversations, houstonActivities } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import {
  parseUserInput,
  generateFollowUpQuestions,
  hasEnoughInfo,
  ParsedPreferences,
} from '../services/preference-parser';
import {
  getHoustonWeather,
  getTimeOfDay,
  getSeason,
  getDayOfWeek,
} from '../services/weather-adapter';
import {
  generateRecommendations,
  getFallbackRecommendations,
  getNeighborhoodRecommendations,
  RecommendationContext,
} from '../services/recommendation-engine';
import {
  generateGreeting,
  formatRecommendations,
  generateQuestionPrompt,
  generateVibeModePrompt,
  generateNoResultsMessage,
  generateNeighborhoodIntro,
} from '../services/curator-prompts';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/curator/start
 * Start a new curator conversation
 */
router.post('/start', async (req, res) => {
  try {
    const sessionId = req.sessionID || req.body.sessionId || 'anonymous';

    // Get current context
    const weather = await getHoustonWeather();
    const timeOfDay = getTimeOfDay();
    const season = getSeason();
    const dayOfWeek = getDayOfWeek();

    if (!weather) {
      return res.status(500).json({ error: 'Failed to fetch weather data' });
    }

    // Create new conversation
    const [conversation] = await db
      .insert(curatorConversations)
      .values({
        sessionId,
        timeOfDay,
        season,
        dayOfWeek,
        weatherCondition: weather.condition,
        temperature: weather.temperature,
        conversationState: 'started',
        questionsAsked: 0,
      })
      .returning();

    // Generate greeting
    const greeting = generateGreeting(timeOfDay, weather);
    const vibeModes = generateVibeModePrompt();

    res.json({
      conversationId: conversation.id,
      message: greeting,
      vibeModes,
      context: {
        weather: {
          temperature: weather.temperature,
          condition: weather.condition,
          description: weather.description,
        },
        timeOfDay,
        season,
      },
    });
  } catch (error) {
    logger.error('Failed to start curator conversation:', error);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

/**
 * POST /api/curator/respond
 * Respond to user input and progress conversation
 */
router.post('/respond', async (req, res) => {
  try {
    const { conversationId, userInput } = req.body;

    if (!conversationId || !userInput) {
      return res.status(400).json({ error: 'conversationId and userInput required' });
    }

    // Get conversation
    const [conversation] = await db
      .select()
      .from(curatorConversations)
      .where(eq(curatorConversations.id, conversationId))
      .limit(1);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Parse user input
    const parsedPreferences = parseUserInput(userInput);

    // Merge with existing preferences
    const existingPrefs: ParsedPreferences = conversation.preferences
      ? JSON.parse(conversation.preferences)
      : {};
    const mergedPreferences = { ...existingPrefs, ...parsedPreferences };

    // Check if we have enough info
    const enoughInfo = hasEnoughInfo(mergedPreferences);
    const questionsAsked = conversation.questionsAsked || 0;

    if (!enoughInfo && questionsAsked < 2) {
      // Ask follow-up question
      const questions = generateFollowUpQuestions(
        mergedPreferences,
        questionsAsked
      );

      if (questions.length > 0) {
        // Update conversation
        await db
          .update(curatorConversations)
          .set({
            preferences: JSON.stringify(mergedPreferences),
            energyLevel: mergedPreferences.energyLevel,
            budget: mergedPreferences.budget,
            socialContext: mergedPreferences.socialContext,
            indoorOutdoorPref: mergedPreferences.indoorOutdoorPref,
            vibeMode: mergedPreferences.vibeMode,
            questionsAsked: questionsAsked + 1,
            conversationState: 'collecting',
            updatedAt: new Date(),
          })
          .where(eq(curatorConversations.id, conversationId));

        return res.json({
          needsMoreInfo: true,
          question: generateQuestionPrompt(questions, mergedPreferences),
          preferences: mergedPreferences,
        });
      }
    }

    // We have enough info - generate recommendations
    const weather = await getHoustonWeather();
    if (!weather) {
      return res.status(500).json({ error: 'Failed to fetch weather data' });
    }

    const context: RecommendationContext = {
      preferences: mergedPreferences,
      weather,
      timeOfDay: conversation.timeOfDay || getTimeOfDay(),
      season: conversation.season || getSeason(),
      dayOfWeek: conversation.dayOfWeek || getDayOfWeek(),
    };

    const sessionId = req.sessionID || req.body.sessionId || 'anonymous';
    const recommendations = await generateRecommendations(context, 5, sessionId);

    // If no recommendations, try fallback
    const finalRecommendations =
      recommendations.length > 0
        ? recommendations
        : await getFallbackRecommendations(context.timeOfDay, weather);

    // Update conversation
    await db
      .update(curatorConversations)
      .set({
        preferences: JSON.stringify(mergedPreferences),
        energyLevel: mergedPreferences.energyLevel,
        budget: mergedPreferences.budget,
        socialContext: mergedPreferences.socialContext,
        indoorOutdoorPref: mergedPreferences.indoorOutdoorPref,
        vibeMode: mergedPreferences.vibeMode,
        recommendedActivityIds: finalRecommendations.map((r) => r.activity.id),
        conversationState: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(curatorConversations.id, conversationId));

    // Format response
    const message =
      finalRecommendations.length > 0
        ? formatRecommendations(finalRecommendations, context)
        : generateNoResultsMessage(mergedPreferences);

    res.json({
      needsMoreInfo: false,
      message,
      recommendations: finalRecommendations.map((r) => ({
        ...r.activity,
        reasoning: r.reasoning,
        score: r.score,
      })),
      preferences: mergedPreferences,
    });
  } catch (error) {
    logger.error('Failed to respond to user input:', error);
    res.status(500).json({ error: 'Failed to process response' });
  }
});

/**
 * GET /api/curator/quick-recommend
 * Quick recommendations by vibe or neighborhood (no conversation)
 */
router.get('/quick-recommend', async (req, res) => {
  try {
    const { vibe, neighborhood } = req.query;

    if (neighborhood) {
      const activities = await getNeighborhoodRecommendations(
        neighborhood as string,
        5
      );
      const intro = generateNeighborhoodIntro(neighborhood as string);

      return res.json({
        message: intro,
        activities,
      });
    }

    // Get context
    const weather = await getHoustonWeather();
    const timeOfDay = getTimeOfDay();
    const season = getSeason();
    const dayOfWeek = getDayOfWeek();

    if (!weather) {
      return res.status(500).json({ error: 'Failed to fetch weather data' });
    }

    // Parse vibe into preferences
    const preferences: ParsedPreferences = vibe
      ? { vibeMode: vibe as any }
      : { energyLevel: 'medium' };

    const context: RecommendationContext = {
      preferences,
      weather,
      timeOfDay,
      season,
      dayOfWeek,
    };

    const sessionId = req.sessionID || (req.query.sessionId as string) || 'anonymous';
    const recommendations = await generateRecommendations(context, 5, sessionId);
    const message = formatRecommendations(recommendations, context);

    res.json({
      message,
      recommendations: recommendations.map((r) => ({
        ...r.activity,
        reasoning: r.reasoning,
        score: r.score,
      })),
    });
  } catch (error) {
    logger.error('Failed to generate quick recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

/**
 * GET /api/curator/activities
 * Get all Houston activities (for browsing)
 */
router.get('/activities', async (req, res) => {
  try {
    const { neighborhood, type, priceLevel } = req.query;

    let query = db.select().from(houstonActivities).where(eq(houstonActivities.isActive, true));

    // Apply filters if provided
    // Note: This is a simplified version, real implementation would handle multiple filters
    const activities = await query.limit(50);

    res.json(activities);
  } catch (error) {
    logger.error('Failed to fetch activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

/**
 * GET /api/curator/neighborhoods
 * Get list of Houston neighborhoods
 */
router.get('/neighborhoods', async (_req, res) => {
  try {
    const neighborhoods = [
      'Montrose',
      'Heights',
      'Midtown',
      'Downtown',
      'Museum District',
      'EaDo',
      'Washington Avenue',
      'Rice Village',
      'Upper Kirby',
      'Galleria',
      'Memorial Park',
      'Chinatown',
      'Clear Lake',
    ];

    res.json(neighborhoods);
  } catch (error) {
    logger.error('Failed to fetch neighborhoods:', error);
    res.status(500).json({ error: 'Failed to fetch neighborhoods' });
  }
});

/**
 * GET /api/curator/vibes
 * Get list of available vibe modes
 */
router.get('/vibes', async (_req, res) => {
  try {
    const vibes = [
      { id: 'high-energy', name: 'High Energy', emoji: '🔥' },
      { id: 'late-night', name: 'Late Night', emoji: '🌙' },
      { id: 'cheap-fun', name: 'Cheap Fun', emoji: '💰' },
      { id: 'date-night', name: 'Date Night', emoji: '💕' },
      { id: 'tourist', name: 'Tourist', emoji: '📸' },
      { id: 'local-hidden-gems', name: 'Local Gems', emoji: '🗺️' },
      { id: 'artsy', name: 'Artsy', emoji: '🎨' },
      { id: 'foodie', name: 'Foodie', emoji: '🍽️' },
      { id: 'nature-lover', name: 'Nature', emoji: '🌳' },
      { id: 'chill', name: 'Chill', emoji: '😌' },
    ];

    res.json(vibes);
  } catch (error) {
    logger.error('Failed to fetch vibes:', error);
    res.status(500).json({ error: 'Failed to fetch vibes' });
  }
});

export default router;
