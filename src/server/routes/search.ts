import { Router } from "express";
import { db } from "../db";
import { events, houstonActivities } from "../../shared/schema";
import { and, or, ilike, eq, gte } from "drizzle-orm";
import logger from "../utils/logger";

const router = Router();

/**
 * GET /api/search
 * Search real upcoming events and curated Houston activities by keyword.
 */
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q as string || "").trim();

    if (!q) {
      return res.json({ query: q, events: [], activities: [] });
    }

    const term = `%${q}%`;

    const [matchedEvents, matchedActivities] = await Promise.all([
      db
        .select()
        .from(events)
        .where(
          and(
            gte(events.startDate, new Date()),
            or(
              ilike(events.title, term),
              ilike(events.description, term),
              ilike(events.venue, term),
              ilike(events.category, term)
            )
          )
        )
        .orderBy(events.startDate)
        .limit(20),
      db
        .select()
        .from(houstonActivities)
        .where(
          and(
            eq(houstonActivities.isActive, true),
            or(
              ilike(houstonActivities.name, term),
              ilike(houstonActivities.description, term),
              ilike(houstonActivities.category, term),
              ilike(houstonActivities.neighborhood, term)
            )
          )
        )
        .limit(20),
    ]);

    res.json({ query: q, events: matchedEvents, activities: matchedActivities });
  } catch (error) {
    logger.error("Search failed", { error });
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
