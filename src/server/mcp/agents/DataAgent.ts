import { AgentBase } from '../AgentBase.js';
import { AgentCapability, AgentContext, AgentResponse } from '../types.js';
import { getDb } from '../../db.js';
import { houstonActivities, events, userSubmittedActivities, curatorConversations } from '../../../shared/schema.js';
import { count, sql } from 'drizzle-orm';

export class DataAgent extends AgentBase {
  name = 'DataAgent';

  capabilities: AgentCapability[] = [
    {
      name: 'get_statistics',
      description: 'Get statistics about the site and database',
      parameters: {},
    },
    {
      name: 'get_categories',
      description: 'List all activity categories',
      parameters: {},
    },
    {
      name: 'get_vibes',
      description: 'List all available vibe modes',
      parameters: {},
    },
  ];

  protected getKeywords(): string[] {
    return [
      'statistics', 'stats', 'how many', 'count', 'total',
      'data', 'database', 'information about site',
      'categories', 'types', 'kinds',
      'vibes', 'moods', 'atmosphere',
      'about this site', 'about the site'
    ];
  }

  async processMessage(message: string, context: AgentContext): Promise<AgentResponse> {
    const lowerMessage = message.toLowerCase();

    try {
      if (this.isStatsQuery(lowerMessage)) {
        return await this.getStatistics(context);
      } else if (this.isCategoriesQuery(lowerMessage)) {
        return await this.getCategories(context);
      } else if (this.isVibesQuery(lowerMessage)) {
        return await this.getVibes(context);
      } else {
        return await this.getStatistics(context);
      }
    } catch (error) {
      console.error('DataAgent error:', error);
      return this.createResponse(
        'I encountered an error while retrieving site data. Please try again.'
      );
    }
  }

  private isStatsQuery(message: string): boolean {
    return message.includes('statistic') || message.includes('stats') ||
           message.includes('how many') || message.includes('count');
  }

  private isCategoriesQuery(message: string): boolean {
    return message.includes('categor') || message.includes('type') || message.includes('kind');
  }

  private isVibesQuery(message: string): boolean {
    return message.includes('vibe') || message.includes('mood') || message.includes('atmosphere');
  }

  private async getStatistics(context: AgentContext): Promise<AgentResponse> {
    const db = await getDb();

    const [activitiesCount] = await db.select({ count: count() }).from(houstonActivities);
    const [eventsCount] = await db.select({ count: count() }).from(events);
    const [userActivitiesCount] = await db.select({ count: count() }).from(userSubmittedActivities);
    const [conversationsCount] = await db.select({ count: count() }).from(curatorConversations);

    // Get upcoming events count
    const [upcomingEventsCount] = await db
      .select({ count: count() })
      .from(events)
      .where(sql`${events.startDate} >= CURRENT_DATE`);

    const response = `📊 **Site Statistics**\n\n` +
      `• **Houston Activities**: ${activitiesCount.count} curated activities\n` +
      `• **Total Events**: ${eventsCount.count} events (${upcomingEventsCount.count} upcoming)\n` +
      `• **User Activities**: ${userActivitiesCount.count} user-submitted\n` +
      `• **Conversations**: ${conversationsCount.count} curator sessions\n\n` +
      `I have access to a rich database of Houston activities and events to help you plan your perfect day!`;

    return this.createResponse(response);
  }

  private async getCategories(context: AgentContext): Promise<AgentResponse> {
    const db = await getDb();

    const categories = await db
      .selectDistinct({ category: houstonActivities.category })
      .from(houstonActivities)
      .where(sql`${houstonActivities.category} IS NOT NULL`);

    const response = `📋 **Activity Categories**\n\n` +
      categories.map(c => `• ${c.category}`).join('\n') +
      `\n\nYou can ask me for activities in any of these categories!`;

    return this.createResponse(response);
  }

  private async getVibes(context: AgentContext): Promise<AgentResponse> {
    const vibes = [
      'Adventurous',
      'Relaxed',
      'Cultural',
      'Social',
      'Active',
      'Romantic',
      'Family-friendly',
      'Foodie',
      'Artsy',
      'Nature-lover'
    ];

    const response = `🎭 **Available Vibes**\n\n` +
      vibes.map(v => `• ${v}`).join('\n') +
      `\n\nTell me what vibe you're feeling, and I'll recommend activities that match!`;

    return this.createResponse(response);
  }
}
