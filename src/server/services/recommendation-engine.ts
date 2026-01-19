import { db } from '../db';
import { houstonActivities, HoustonActivity, userSubmittedActivities, UserSubmittedActivity } from '../../shared/schema';
import { eq, and, inArray, sql, desc } from 'drizzle-orm';
import {
  ParsedPreferences,
  getPriceLevelRange,
  getSocialSettings,
  vibeModeTemplates,
} from './preference-parser';
import { WeatherData, isGoodOutdoorWeather } from './weather-adapter';
import { getNeighborhoodCluster, getNeighborhoodDistance } from './neighborhood-clusters';
import logger from '../utils/logger';

// Type for activities that can be either curated or user-submitted
export type RecommendableActivity = (HoustonActivity | UserSubmittedActivity) & { isUserSubmitted?: boolean };

export interface ActivityRecommendation {
  activity: RecommendableActivity;
  score: number;
  reasoning: string;
}

export interface RecommendationContext {
  preferences: ParsedPreferences;
  weather: WeatherData;
  timeOfDay: string;
  season: string;
  dayOfWeek: string;
}

/**
 * Main recommendation engine - generates ranked activity recommendations
 */
export async function generateRecommendations(
  context: RecommendationContext,
  limit: number = 5,
  sessionId?: string
): Promise<ActivityRecommendation[]> {
  try {
    // Fetch all active curated activities
    const curatedActivities = await db
      .select()
      .from(houstonActivities)
      .where(eq(houstonActivities.isActive, true));

    // Fetch user-submitted activities if sessionId provided
    let userActivities: UserSubmittedActivity[] = [];
    if (sessionId) {
      userActivities = await db
        .select()
        .from(userSubmittedActivities)
        .where(
          and(
            eq(userSubmittedActivities.sessionId, sessionId),
            eq(userSubmittedActivities.useInRecommendations, true)
          )
        );
    }

    // Merge activities and mark user-submitted ones
    const allActivities: RecommendableActivity[] = [
      ...curatedActivities.map(a => ({ ...a, isUserSubmitted: false })),
      ...userActivities.map(a => ({ ...a, isUserSubmitted: true }))
    ];

    if (allActivities.length === 0) {
      logger.warn('No activities found in database');
      return [];
    }

    // Score each activity
    const scoredActivities = allActivities.map((activity) => ({
      activity,
      score: scoreActivity(activity, context),
      reasoning: generateReasoning(activity, context),
    }));

    // Sort by score descending to find primary neighborhood
    const sorted = scoredActivities.sort((a, b) => b.score - a.score);

    // Apply geographic clustering: boost activities near the top-scored activity's neighborhood
    const clustered = applyGeographicClustering(sorted);

    // Re-sort after clustering adjustments
    const resorted = clustered.sort((a, b) => b.score - a.score);

    // Apply diversity filter to ensure variety
    const diverse = ensureDiversity(resorted);

    return diverse.slice(0, limit);
  } catch (error) {
    logger.error('Failed to generate recommendations:', error);
    return [];
  }
}

/**
 * Score an activity based on how well it matches user preferences and context
 * Higher score = better match
 */
function scoreActivity(
  activity: RecommendableActivity,
  context: RecommendationContext
): number {
  let score = activity.popularityScore || 50; // Base score

  // Boost user-submitted activities to increase their chances
  if (activity.isUserSubmitted) {
    score += 15; // Moderate boost for personalization
  }

  const { preferences, weather, timeOfDay, season } = context;

  // Apply vibe mode template if specified
  if (preferences.vibeMode && vibeModeTemplates[preferences.vibeMode]) {
    const template = vibeModeTemplates[preferences.vibeMode];

    // Activity type match (strong signal)
    if (template.activityTypes.includes(activity.type)) {
      score += 25;
    }

    // Neighborhood match
    if (template.neighborhoods.includes(activity.neighborhood)) {
      score += 15;
    }

    // Vibe keyword match - check if activity vibes align with vibe mode
    // E.g., 'date-night' vibe mode should match activities with 'romantic', 'date-night' vibes
    if (activity.vibes && activity.vibes.length > 0) {
      const vibeKeywords = preferences.vibeMode.split('-');
      const vibeMatches = activity.vibes.filter((v) =>
        vibeKeywords.some(keyword => v.toLowerCase().includes(keyword)) ||
        v.toLowerCase() === preferences.vibeMode
      ).length;
      score += vibeMatches * 5;
    }
  }

  // Energy level match
  if (preferences.energyLevel) {
    if (activity.energyLevel === preferences.energyLevel) {
      score += 20;
    } else {
      score -= 10;
    }
  }

  // Budget match
  if (preferences.budget) {
    const { min, max } = getPriceLevelRange(preferences.budget);
    if (activity.priceLevel >= min && activity.priceLevel <= max) {
      score += 15;
    } else {
      score -= 15;
    }
  }

  // Social setting match
  if (preferences.socialContext) {
    const appropriateSettings = getSocialSettings(preferences.socialContext);
    const hasMatchingSetting = activity.socialSetting?.some((s) =>
      appropriateSettings.includes(s)
    );
    if (hasMatchingSetting) {
      score += 15;
    }
  }

  // Time of day match
  if (activity.bestTimeOfDay?.includes(timeOfDay)) {
    score += 20;
  } else if (activity.bestTimeOfDay && activity.bestTimeOfDay.length > 0) {
    score -= 10;
  }

  // Season match
  if (
    activity.bestSeason?.includes(season) ||
    activity.bestSeason?.includes('all')
  ) {
    score += 10;
  }

  // Weather considerations
  const goodOutdoorWeather = isGoodOutdoorWeather(weather);

  if (preferences.indoorOutdoorPref === 'outdoor') {
    if (activity.indoorOutdoor === 'outdoor' || activity.indoorOutdoor === 'both') {
      score += 20;

      // Penalize if weather is bad for outdoor
      if (activity.weatherDependent && !goodOutdoorWeather) {
        score -= 40;
      }
    } else {
      score -= 20;
    }
  }

  if (preferences.indoorOutdoorPref === 'indoor') {
    if (activity.indoorOutdoor === 'indoor' || activity.indoorOutdoor === 'both') {
      score += 20;
    } else {
      score -= 20;
    }
  }

  // Weather-based adjustments for no preference
  if (!preferences.indoorOutdoorPref) {
    if (weather.condition === 'rainy' || weather.condition === 'stormy') {
      // Strongly prefer indoor in bad weather
      if (activity.indoorOutdoor === 'indoor') {
        score += 30;
      } else if (activity.weatherDependent) {
        score -= 40;
      }
    } else if (weather.condition === 'hot' && weather.temperature >= 95) {
      // Prefer indoor or water activities in extreme heat
      if (activity.indoorOutdoor === 'indoor') {
        score += 20;
      } else if (activity.weatherDependent) {
        score -= 20;
      }
    }
  }

  // Late night adjustments
  if (timeOfDay === 'late-night') {
    if (activity.type === 'restaurant' || activity.type === 'bar') {
      score += 25;
    } else {
      score -= 30; // Most things closed
    }
  }

  return Math.max(score, 0); // Never negative
}

/**
 * Generate human-readable reasoning for why activity was recommended
 */
function generateReasoning(
  activity: RecommendableActivity,
  context: RecommendationContext
): string {
  const reasons: string[] = [];
  const { preferences, weather, timeOfDay } = context;

  // User-submitted activity
  if (activity.isUserSubmitted) {
    reasons.push('Your personal activity');
  }

  // Vibe mode reasoning
  if (preferences.vibeMode) {
    const template = vibeModeTemplates[preferences.vibeMode];
    if (template.activityTypes.includes(activity.type)) {
      reasons.push(`Perfect for ${preferences.vibeMode} vibe`);
    }
  }

  // Energy match
  if (preferences.energyLevel && activity.energyLevel === preferences.energyLevel) {
    reasons.push(`${activity.energyLevel}-energy activity matches your mood`);
  }

  // Budget
  if (preferences.budget) {
    const priceDesc = ['', '$', '$$', '$$$', '$$$$'][activity.priceLevel];
    reasons.push(`${priceDesc} price point fits your budget`);
  }

  // Time of day
  if (activity.bestTimeOfDay?.includes(timeOfDay)) {
    reasons.push(`Great for ${timeOfDay}`);
  }

  // Weather
  if (weather.condition === 'rainy' && activity.indoorOutdoor === 'indoor') {
    reasons.push('Indoor option for rainy day');
  } else if (weather.condition === 'hot' && activity.indoorOutdoor === 'indoor') {
    reasons.push('Air-conditioned escape from Houston heat');
  } else if (
    weather.condition === 'sunny' &&
    (activity.indoorOutdoor === 'outdoor' || activity.indoorOutdoor === 'both')
  ) {
    reasons.push('Perfect weather for this');
  }

  // Neighborhood
  reasons.push(`Located in ${activity.neighborhood}`);

  if (reasons.length === 0) {
    return 'Popular Houston spot';
  }

  return reasons.slice(0, 3).join('. ') + '.';
}

/**
 * Apply geographic clustering to keep recommendations close together
 * Identifies the primary neighborhood cluster and boosts nearby activities
 */
function applyGeographicClustering(
  recommendations: ActivityRecommendation[]
): ActivityRecommendation[] {
  if (recommendations.length === 0) return [];

  // Find the primary neighborhood from top 3 scored activities
  const topActivities = recommendations.slice(0, 3);
  const neighborhoodScores: Record<string, number> = {};

  // Count weighted scores by neighborhood
  topActivities.forEach((rec, index) => {
    const weight = 3 - index; // Top activity gets weight 3, second gets 2, etc.
    const neighborhood = rec.activity.neighborhood;
    neighborhoodScores[neighborhood] = (neighborhoodScores[neighborhood] || 0) + (rec.score * weight);
  });

  // Find primary neighborhood
  let primaryNeighborhood = topActivities[0].activity.neighborhood;
  let maxScore = 0;
  for (const [neighborhood, score] of Object.entries(neighborhoodScores)) {
    if (score > maxScore) {
      maxScore = score;
      primaryNeighborhood = neighborhood;
    }
  }

  logger.info(`Primary neighborhood for clustering: ${primaryNeighborhood}`);

  // Apply distance-based score adjustments
  return recommendations.map((rec) => {
    const distance = getNeighborhoodDistance(primaryNeighborhood, rec.activity.neighborhood);

    if (distance === 0) {
      // Same neighborhood - small boost
      rec.score += 10;
    } else if (distance === 1) {
      // Adjacent cluster - neutral
      // No change
    } else {
      // Far away - significant penalty
      rec.score -= 25;
      logger.debug(`Penalized ${rec.activity.name} for being far from ${primaryNeighborhood}`);
    }

    return rec;
  });
}

/**
 * Ensure diversity in recommendations
 * Don't recommend 5 bars or 5 restaurants - mix it up
 */
function ensureDiversity(
  recommendations: ActivityRecommendation[]
): ActivityRecommendation[] {
  const diverse: ActivityRecommendation[] = [];
  const typeCount: Record<string, number> = {};
  const neighborhoodCount: Record<string, number> = {};

  for (const rec of recommendations) {
    const { type, neighborhood } = rec.activity;

    // Limit same type (max 2 of each type in top results)
    const currentTypeCount = typeCount[type] || 0;
    const currentNeighborhoodCount = neighborhoodCount[neighborhood] || 0;

    // Prefer diversity but don't be too strict
    if (currentTypeCount < 2 || diverse.length < 5) {
      diverse.push(rec);
      typeCount[type] = currentTypeCount + 1;
      neighborhoodCount[neighborhood] = currentNeighborhoodCount + 1;
    }

    // Stop when we have enough
    if (diverse.length >= 10) break;
  }

  return diverse;
}

/**
 * Get fallback recommendations when user preferences are too restrictive
 */
export async function getFallbackRecommendations(
  timeOfDay: string,
  weather: WeatherData
): Promise<ActivityRecommendation[]> {
  try {
    // Get top-rated activities that are appropriate for current conditions
    const activities = await db
      .select()
      .from(houstonActivities)
      .where(eq(houstonActivities.isActive, true))
      .orderBy(desc(houstonActivities.popularityScore))
      .limit(10);

    // Filter by weather and time
    const filtered = activities.filter((activity) => {
      // Check time of day
      if (
        activity.bestTimeOfDay &&
        !activity.bestTimeOfDay.includes(timeOfDay)
      ) {
        return false;
      }

      // Check weather dependency
      if (activity.weatherDependent && !isGoodOutdoorWeather(weather)) {
        return false;
      }

      return true;
    });

    return filtered.slice(0, 5).map((activity) => ({
      activity,
      score: activity.popularityScore || 50,
      reasoning: 'Popular Houston activity',
    }));
  } catch (error) {
    logger.error('Failed to get fallback recommendations:', error);
    return [];
  }
}

/**
 * Quick recommendations by neighborhood
 */
export async function getNeighborhoodRecommendations(
  neighborhood: string,
  limit: number = 5
): Promise<HoustonActivity[]> {
  try {
    const activities = await db
      .select()
      .from(houstonActivities)
      .where(
        and(
          eq(houstonActivities.neighborhood, neighborhood),
          eq(houstonActivities.isActive, true)
        )
      )
      .orderBy(desc(houstonActivities.popularityScore))
      .limit(limit);

    return activities;
  } catch (error) {
    logger.error('Failed to get neighborhood recommendations:', error);
    return [];
  }
}

/**
 * Get activities by vibe
 */
export async function getActivitiesByVibe(
  vibe: string,
  limit: number = 5
): Promise<HoustonActivity[]> {
  try {
    // Use raw SQL to query array column with proper parameter binding
    const activities = await db
      .select()
      .from(houstonActivities)
      .where(
        and(
          sql`${houstonActivities.vibes} && ARRAY[${sql.raw(`'${vibe.replace(/'/g, "''")}'`)}]::text[]`,
          eq(houstonActivities.isActive, true)
        )
      )
      .orderBy(desc(houstonActivities.popularityScore))
      .limit(limit);

    return activities;
  } catch (error) {
    logger.error('Failed to get activities by vibe:', error);
    return [];
  }
}
