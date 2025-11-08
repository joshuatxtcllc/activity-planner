import { Router } from "express";
import { db } from "./db";
import { events } from "../shared/schema";
import { desc, and, gte, lte, eq } from "drizzle-orm";
import { runAllScrapers } from "./scrapers";
import logger from "./utils/logger";

const router = Router();

/**
 * GET /api/events
 * Get all upcoming events
 */
router.get("/events", async (req, res) => {
  try {
    const { source, category, upcoming } = req.query;

    // Build query filters
    const filters = [];

    if (source) {
      filters.push(eq(events.source, source as string));
    }

    if (category) {
      filters.push(eq(events.category, category as string));
    }

    if (upcoming === "true") {
      filters.push(gte(events.startDate, new Date()));
    }

    const allEvents = await db
      .select()
      .from(events)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(events.startDate))
      .limit(100);

    res.json(allEvents);
  } catch (error) {
    logger.error("Failed to fetch events", { error });
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

/**
 * GET /api/events/weekend
 * Get events for upcoming weekend
 */
router.get("/events/weekend", async (_req, res) => {
  try {
    const friday = getNextFriday(new Date());
    const sunday = new Date(friday);
    sunday.setDate(sunday.getDate() + 2);
    sunday.setHours(23, 59, 59);

    const weekendEvents = await db
      .select()
      .from(events)
      .where(
        and(gte(events.startDate, friday), lte(events.startDate, sunday))
      )
      .orderBy(events.startDate);

    res.json(weekendEvents);
  } catch (error) {
    logger.error("Failed to fetch weekend events", { error });
    res.status(500).json({ error: "Failed to fetch weekend events" });
  }
});

/**
 * POST /api/scrape
 * Manually trigger scraping (admin only in production)
 */
router.post("/scrape", async (_req, res) => {
  try {
    logger.info("Manual scrape triggered");
    const result = await runAllScrapers();
    res.json(result);
  } catch (error) {
    logger.error("Manual scrape failed", { error });
    res.status(500).json({ error: "Scraping failed" });
  }
});

/**
 * GET /api/stats
 * Get statistics about events
 */
router.get("/stats", async (_req, res) => {
  try {
    const totalEvents = await db.select().from(events);

    const stats = {
      total: totalEvents.length,
      bySource: totalEvents.reduce(
        (acc, event) => {
          acc[event.source] = (acc[event.source] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      byCategory: totalEvents.reduce(
        (acc, event) => {
          const cat = event.category || "uncategorized";
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      freeEvents: totalEvents.filter((e) => e.isFree).length,
    };

    res.json(stats);
  } catch (error) {
    logger.error("Failed to fetch stats", { error });
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

function getNextFriday(from: Date): Date {
  const result = new Date(from);
  const dayOfWeek = result.getDay();
  const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
  result.setDate(result.getDate() + daysUntilFriday);
  result.setHours(0, 0, 0, 0);
  return result;
}

export default router;
