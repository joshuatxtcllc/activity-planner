import { db } from '../db';
import { houstonActivities } from '../../shared/schema';
import { houstonActivitiesData } from '../data/houston-activities';
import logger from '../utils/logger';

/**
 * Seed the database with Houston activities
 * This can be run manually or on server startup
 */
export async function seedHoustonActivities(): Promise<void> {
  try {
    logger.info('Seeding Houston activities...');

    // Check if activities already exist
    const existing = await db.select().from(houstonActivities).limit(1);

    if (existing.length > 0) {
      logger.info('Activities already seeded, skipping...');
      return;
    }

    // Insert all activities
    const inserted = await db
      .insert(houstonActivities)
      .values(houstonActivitiesData)
      .returning();

    logger.info(`✅ Seeded ${inserted.length} Houston activities`);
  } catch (error) {
    logger.error('Failed to seed activities:', error);
    throw error;
  }
}

/**
 * Update existing activities (for when data changes)
 */
export async function updateActivities(): Promise<void> {
  try {
    logger.info('Updating Houston activities...');

    // For now, just delete and re-insert
    // In production, you might want a more sophisticated merge strategy
    await db.delete(houstonActivities);

    const inserted = await db
      .insert(houstonActivities)
      .values(houstonActivitiesData)
      .returning();

    logger.info(`✅ Updated ${inserted.length} Houston activities`);
  } catch (error) {
    logger.error('Failed to update activities:', error);
    throw error;
  }
}
