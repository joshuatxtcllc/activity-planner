import { Router } from 'express';
import { db } from '../db';
import { userSubmittedActivities, insertUserSubmittedActivitySchema } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/user-activities
 * Create a new user-submitted activity
 */
router.post('/', async (req, res) => {
  try {
    const sessionId = req.sessionID || req.body.sessionId || 'anonymous';

    // Validate request body
    const validationResult = insertUserSubmittedActivitySchema.safeParse({
      ...req.body,
      sessionId,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid activity data',
        details: validationResult.error.errors
      });
    }

    // Create activity
    const [activity] = await db
      .insert(userSubmittedActivities)
      .values(validationResult.data)
      .returning();

    logger.info(`User activity created: ${activity.id} by session ${sessionId}`);

    res.status(201).json(activity);
  } catch (error) {
    logger.error('Failed to create user activity:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

/**
 * GET /api/user-activities
 * Get all user-submitted activities for the current session
 */
router.get('/', async (req, res) => {
  try {
    const sessionId = req.sessionID || req.query.sessionId || 'anonymous';

    const activities = await db
      .select()
      .from(userSubmittedActivities)
      .where(eq(userSubmittedActivities.sessionId, sessionId as string))
      .orderBy(userSubmittedActivities.createdAt);

    res.json(activities);
  } catch (error) {
    logger.error('Failed to fetch user activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

/**
 * GET /api/user-activities/:id
 * Get a specific user-submitted activity
 */
router.get('/:id', async (req, res) => {
  try {
    const sessionId = req.sessionID || 'anonymous';
    const { id } = req.params;

    const [activity] = await db
      .select()
      .from(userSubmittedActivities)
      .where(
        and(
          eq(userSubmittedActivities.id, id),
          eq(userSubmittedActivities.sessionId, sessionId)
        )
      )
      .limit(1);

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json(activity);
  } catch (error) {
    logger.error('Failed to fetch user activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

/**
 * PUT /api/user-activities/:id
 * Update a user-submitted activity
 */
router.put('/:id', async (req, res) => {
  try {
    const sessionId = req.sessionID || req.body.sessionId || 'anonymous';
    const { id } = req.params;

    // Check if activity exists and belongs to user
    const [existing] = await db
      .select()
      .from(userSubmittedActivities)
      .where(
        and(
          eq(userSubmittedActivities.id, id),
          eq(userSubmittedActivities.sessionId, sessionId)
        )
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Activity not found or unauthorized' });
    }

    // Update activity
    const [updated] = await db
      .update(userSubmittedActivities)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(eq(userSubmittedActivities.id, id))
      .returning();

    logger.info(`User activity updated: ${id} by session ${sessionId}`);

    res.json(updated);
  } catch (error) {
    logger.error('Failed to update user activity:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

/**
 * DELETE /api/user-activities/:id
 * Delete a user-submitted activity
 */
router.delete('/:id', async (req, res) => {
  try {
    const sessionId = req.sessionID || 'anonymous';
    const { id } = req.params;

    // Check if activity exists and belongs to user
    const [existing] = await db
      .select()
      .from(userSubmittedActivities)
      .where(
        and(
          eq(userSubmittedActivities.id, id),
          eq(userSubmittedActivities.sessionId, sessionId)
        )
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Activity not found or unauthorized' });
    }

    // Delete activity
    await db
      .delete(userSubmittedActivities)
      .where(eq(userSubmittedActivities.id, id));

    logger.info(`User activity deleted: ${id} by session ${sessionId}`);

    res.json({ success: true, message: 'Activity deleted' });
  } catch (error) {
    logger.error('Failed to delete user activity:', error);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

/**
 * PATCH /api/user-activities/:id/toggle-recommendations
 * Toggle whether an activity should be used in recommendations
 */
router.patch('/:id/toggle-recommendations', async (req, res) => {
  try {
    const sessionId = req.sessionID || 'anonymous';
    const { id } = req.params;

    // Check if activity exists and belongs to user
    const [existing] = await db
      .select()
      .from(userSubmittedActivities)
      .where(
        and(
          eq(userSubmittedActivities.id, id),
          eq(userSubmittedActivities.sessionId, sessionId)
        )
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Activity not found or unauthorized' });
    }

    // Toggle useInRecommendations
    const [updated] = await db
      .update(userSubmittedActivities)
      .set({
        useInRecommendations: !existing.useInRecommendations,
        updatedAt: new Date(),
      })
      .where(eq(userSubmittedActivities.id, id))
      .returning();

    logger.info(`User activity recommendation toggle: ${id} -> ${updated.useInRecommendations}`);

    res.json(updated);
  } catch (error) {
    logger.error('Failed to toggle activity recommendations:', error);
    res.status(500).json({ error: 'Failed to toggle recommendations' });
  }
});

export default router;
