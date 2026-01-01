import { Router } from "express";
import { db } from "../db";
import { events, userPreferences, userProfiles } from "../../shared/schema";
import { and, eq } from "drizzle-orm";
import logger from "../utils/logger";
import { randomUUID } from "crypto";

const router = Router();

/**
 * POST /api/preferences
 * Track user preference for an event (like/dislike)
 */
router.post("/", async (req, res) => {
  try {
    const { eventId, liked } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    // Get or create session ID from cookie
    let sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      sessionId = randomUUID();
      res.cookie("sessionId", sessionId, {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        httpOnly: true,
        sameSite: "lax",
      });
    }

    // Upsert preference
    const existing = await db
      .select()
      .from(userPreferences)
      .where(
        and(
          eq(userPreferences.sessionId, sessionId),
          eq(userPreferences.eventId, eventId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing preference
      if (liked === null) {
        // Remove preference if toggling back to neutral
        await db
          .delete(userPreferences)
          .where(eq(userPreferences.id, existing[0].id));
      } else {
        await db
          .update(userPreferences)
          .set({ liked, updatedAt: new Date() })
          .where(eq(userPreferences.id, existing[0].id));
      }
    } else {
      // Create new preference (only if not null)
      if (liked !== null) {
        await db.insert(userPreferences).values({
          sessionId,
          eventId,
          liked,
        });
      }
    }

    // Update user profile stats
    await updateUserProfile(sessionId);

    res.json({ success: true, sessionId });
  } catch (error) {
    logger.error("Failed to save preference", { error });
    res.status(500).json({ error: "Failed to save preference" });
  }
});

/**
 * GET /api/preferences
 * Get user's preferences for filtering/recommendations
 */
router.get("/", async (req, res) => {
  try {
    const sessionId = req.cookies?.sessionId;

    if (!sessionId) {
      return res.json({ profile: null, preferences: [] });
    }

    const [profile, prefs] = await Promise.all([
      db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.sessionId, sessionId))
        .limit(1),
      db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.sessionId, sessionId)),
    ]);

    res.json({
      profile: profile[0] || null,
      preferences: prefs,
    });
  } catch (error) {
    logger.error("Failed to fetch preferences", { error });
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

/**
 * Helper function to update user profile based on preferences
 */
async function updateUserProfile(sessionId: string) {
  try {
    const prefs = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.sessionId, sessionId));

    const likes = prefs.filter((p) => p.liked === true);
    const dislikes = prefs.filter((p) => p.liked === false);

    if (likes.length === 0) {
      // No likes yet, nothing to learn from
      return;
    }

    // Get events for liked items to extract patterns
    const likedEventIds = likes.map((p) => p.eventId);
    const likedEvents = await db
      .select()
      .from(events)
      .where(
        and(
          ...likedEventIds.map((id: string) => eq(events.id, id))
        )
      );

    // Extract preferred categories and sources
    const categoryCount: Record<string, number> = {};
    const sourceCount: Record<string, number> = {};

    likedEvents.forEach((event) => {
      if (event.category) {
        categoryCount[event.category] =
          (categoryCount[event.category] || 0) + 1;
      }
      sourceCount[event.source] = (sourceCount[event.source] || 0) + 1;
    });

    const preferredCategories = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat]) => cat);

    const preferredSources = Object.entries(sourceCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([src]) => src);

    // Determine price range preference
    const freeCount = likedEvents.filter((e) => e.isFree).length;
    const paidCount = likedEvents.length - freeCount;
    const preferredPriceRange =
      freeCount > paidCount * 2 ? "free" : paidCount > 0 ? "any" : "free";

    // Upsert user profile
    const existing = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.sessionId, sessionId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userProfiles)
        .set({
          preferredCategories,
          preferredSources,
          preferredPriceRange,
          totalLikes: likes.length,
          totalDislikes: dislikes.length,
          totalViews: prefs.length,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.id, existing[0].id));
    } else {
      await db.insert(userProfiles).values({
        sessionId,
        preferredCategories,
        preferredSources,
        preferredPriceRange,
        totalLikes: likes.length,
        totalDislikes: dislikes.length,
        totalViews: prefs.length,
      });
    }
  } catch (error) {
    logger.error("Failed to update user profile", { error });
  }
}

export default router;
