import { AgentBase } from '../AgentBase.js';
import { AgentCapability, AgentContext, AgentResponse } from '../types.js';
import { generateRecommendations, getFallbackRecommendations, RecommendationContext } from '../../services/recommendation-engine.js';
import { parseUserInput } from '../../services/preference-parser.js';
import { getHoustonWeather, getTimeOfDay, getSeason } from '../../services/weather-adapter.js';
import { formatRecommendations } from '../../services/curator-prompts.js';
import { getDb } from '../../db.js';
import { houstonActivities, events, userSubmittedActivities } from '../../../shared/schema.js';
import { eq, or, like, sql } from 'drizzle-orm';

export class ActivityAgent extends AgentBase {
  name = 'ActivityAgent';

  capabilities: AgentCapability[] = [
    {
      name: 'recommend_activities',
      description: 'Recommend activities based on user preferences',
      parameters: { preferences: 'string', timeOfDay: 'string', weather: 'string' },
    },
    {
      name: 'search_activities',
      description: 'Search for specific activities by name or type',
      parameters: { query: 'string' },
    },
    {
      name: 'list_neighborhoods',
      description: 'List available Houston neighborhoods',
      parameters: {},
    },
    {
      name: 'get_events',
      description: 'Get upcoming events in Houston',
      parameters: { limit: 'number' },
    },
  ];

  protected getKeywords(): string[] {
    return [
      'activity', 'activities', 'event', 'events', 'do', 'doing',
      'recommend', 'suggestion', 'what to', 'where to go',
      'neighborhood', 'area', 'location', 'houston',
      'fun', 'entertainment', 'outdoor', 'indoor',
      'restaurant', 'food', 'dining', 'museum', 'park'
    ];
  }

  async processMessage(message: string, context: AgentContext): Promise<AgentResponse> {
    const db = await getDb();
    const lowerMessage = message.toLowerCase();

    try {
      // Handle different types of queries
      if (this.isSearchQuery(lowerMessage)) {
        return await this.searchActivities(message, context);
      } else if (this.isNeighborhoodQuery(lowerMessage)) {
        return await this.listNeighborhoods(context);
      } else if (this.isEventQuery(lowerMessage)) {
        return await this.getUpcomingEvents(context);
      } else {
        // Default to recommendation
        return await this.recommendActivities(message, context);
      }
    } catch (error) {
      console.error('ActivityAgent error:', error);
      return this.createResponse(
        'I encountered an error while processing your request about activities. Could you try rephrasing your question?'
      );
    }
  }

  private isSearchQuery(message: string): boolean {
    return message.includes('search') || message.includes('find') || message.includes('look for');
  }

  private isNeighborhoodQuery(message: string): boolean {
    return message.includes('neighborhood') || message.includes('area') || message.includes('where');
  }

  private isEventQuery(message: string): boolean {
    return message.includes('event') || message.includes('upcoming') || message.includes('happening');
  }

  private async searchActivities(query: string, context: AgentContext): Promise<AgentResponse> {
    const db = await getDb();

    // Extract search terms from query
    const searchTerms = query.toLowerCase().replace(/search|find|look for/g, '').trim();

    // Search in houston_activities
    const activities = await db
      .select()
      .from(houstonActivities)
      .where(
        or(
          like(houstonActivities.name, `%${searchTerms}%`),
          like(houstonActivities.description, `%${searchTerms}%`),
          like(houstonActivities.category, `%${searchTerms}%`),
          like(houstonActivities.neighborhood, `%${searchTerms}%`)
        )
      )
      .limit(5);

    if (activities.length === 0) {
      return this.createResponse(
        `I couldn't find any activities matching "${searchTerms}". Would you like me to recommend some popular activities instead?`
      );
    }

    const response = `I found ${activities.length} activities matching your search:\n\n` +
      activities.map((a, i) =>
        `${i + 1}. **${a.name}** - ${a.neighborhood}\n   ${a.description}\n   Category: ${a.category}`
      ).join('\n\n');

    return this.createResponse(response);
  }

  private async listNeighborhoods(context: AgentContext): Promise<AgentResponse> {
    const db = await getDb();

    const neighborhoods = await db
      .selectDistinct({ neighborhood: houstonActivities.neighborhood })
      .from(houstonActivities)
      .where(sql`${houstonActivities.neighborhood} IS NOT NULL`);

    const response = `Here are the Houston neighborhoods where we have activities:\n\n` +
      neighborhoods.map(n => `• ${n.neighborhood}`).join('\n') +
      `\n\nWould you like to explore activities in a specific neighborhood?`;

    return this.createResponse(response);
  }

  private async getUpcomingEvents(context: AgentContext): Promise<AgentResponse> {
    const db = await getDb();

    const upcomingEvents = await db
      .select()
      .from(events)
      .where(sql`${events.startDate} >= CURRENT_DATE`)
      .orderBy(events.startDate)
      .limit(5);

    if (upcomingEvents.length === 0) {
      return this.createResponse(
        'I don\'t have any upcoming events in my database right now. Would you like me to recommend some evergreen activities instead?'
      );
    }

    const response = `Here are the upcoming events in Houston:\n\n` +
      upcomingEvents.map((e, i) =>
        `${i + 1}. **${e.title}**\n   Date: ${new Date(e.startDate).toLocaleDateString()}\n   ${e.description || 'No description available'}`
      ).join('\n\n');

    return this.createResponse(response);
  }

  private async recommendActivities(message: string, context: AgentContext): Promise<AgentResponse> {
    // Use the existing preference parser
    const preferences = parseUserInput(message);

    const weather = await getHoustonWeather();
    const recommendationContext: RecommendationContext = {
      preferences,
      weather: weather ?? {
        temperature: 75,
        condition: 'sunny',
        description: 'Weather data unavailable',
        humidity: 50,
        windSpeed: 5,
        feelsLike: 75,
      },
      timeOfDay: getTimeOfDay(),
      season: getSeason(),
      dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    };

    // Generate recommendations using the existing engine
    let recommendations = await generateRecommendations(
      recommendationContext,
      5,
      context.sessionId
    );

    if (recommendations.length === 0) {
      recommendations = await getFallbackRecommendations(
        recommendationContext.timeOfDay,
        recommendationContext.weather
      );
    }

    if (recommendations.length === 0) {
      return this.createResponse(
        'I couldn\'t find activities matching your preferences. Could you tell me more about what you\'re looking for?'
      );
    }

    return this.createResponse(formatRecommendations(recommendations, recommendationContext));
  }
}
