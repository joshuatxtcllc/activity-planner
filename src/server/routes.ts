import { Router } from "express";
import { db } from "./db";
import { events, houstonActivities } from "../shared/schema";
import { desc, and, gte, lte, eq, ilike, or } from "drizzle-orm";
import { runAllScrapers } from "./scrapers";
import logger from "./utils/logger";
import { getNextFriday } from "./utils/date-utils";
import { generateItinerary, type ItineraryPreferences } from "./services/itinerary-generator";
import { generateRecommendations, getFallbackRecommendations, type RecommendationContext } from "./services/recommendation-engine";
import { getHoustonWeather, getTimeOfDay, getSeason, getDayOfWeek } from "./services/weather-adapter";
import curatorRoutes from "./routes/curator";
import userActivitiesRoutes from "./routes/user-activities";
import verifyUrlRoutes from "./routes/verify-url";
import preferencesRoutes from "./routes/preferences";

const router = Router();

// Mount curator routes
router.use("/curator", curatorRoutes);

// Mount user activities routes
router.use("/user-activities", userActivitiesRoutes);

// Mount URL verification routes
router.use("/verify-url", verifyUrlRoutes);

// Mount preference tracking routes (event like/dislike)
router.use("/preferences", preferencesRoutes);

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
 * GET /api/debug/env
 * Debug endpoint to check which API keys are configured
 */
router.get("/debug/env", async (_req, res) => {
  try {
    const envStatus = {
      TICKETMASTER_API_KEY: !!process.env.TICKETMASTER_API_KEY,
      TICKETMASTER_LENGTH: process.env.TICKETMASTER_API_KEY?.length || 0,
      TICKETMASTER_FIRST_4: process.env.TICKETMASTER_API_KEY?.substring(0, 4) || 'NOT SET',
      EVENTBRITE_API_KEY: !!process.env.EVENTBRITE_API_KEY,
      EVENTBRITE_LENGTH: process.env.EVENTBRITE_API_KEY?.length || 0,
      EVENTBRITE_FIRST_4: process.env.EVENTBRITE_API_KEY?.substring(0, 4) || 'NOT SET',
      SEATGEEK_API_KEY: !!process.env.SEATGEEK_API_KEY,
      SEATGEEK_LENGTH: process.env.SEATGEEK_API_KEY?.length || 0,
      SEATGEEK_FIRST_4: process.env.SEATGEEK_API_KEY?.substring(0, 4) || 'NOT SET',
      GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
      GOOGLE_LENGTH: process.env.GOOGLE_API_KEY?.length || 0,
      GOOGLE_SEARCH_ENGINE_ID: !!process.env.GOOGLE_SEARCH_ENGINE_ID,
      DATABASE_URL: !!process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      ALL_ENV_KEYS: Object.keys(process.env).filter(k =>
        k.includes('API') || k.includes('TICKET') || k.includes('EVENT') || k.includes('SEAT')
      ).sort(),
    };

    res.json(envStatus);
  } catch (error) {
    logger.error("Failed to fetch env debug info", { error });
    res.status(500).json({ error: "Failed to fetch env debug info" });
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

/**
 * POST /api/itinerary/generate
 * Generate a personalized Houston itinerary using AI
 */
router.post("/itinerary/generate", async (req, res) => {
  try {
    const preferences: ItineraryPreferences = req.body;

    // Validate required fields
    if (!preferences.date) {
      return res.status(400).json({ error: "Date is required" });
    }

    // Validate date is in the future
    const requestedDate = new Date(preferences.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestedDate < today) {
      return res.status(400).json({ error: "Date must be in the future" });
    }

    logger.info("Generating itinerary", { preferences });

    const itinerary = await generateItinerary(preferences);

    logger.info("Itinerary generated successfully", {
      itineraryId: itinerary.id,
      activityCount: itinerary.activities.length
    });

    res.json(itinerary);
  } catch (error) {
    logger.error("Failed to generate itinerary", { error });

    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to generate itinerary" });
    }
  }
});


/**
 * GET /api/voice-search
 * Combined search endpoint optimized for the voice assistant in Jay's Assistant.
 * Returns curated activities + upcoming events in a single call.
 *
 * Query params:
 *   q         - natural language hint (used for keyword matching)
 *   vibe      - one of: high-energy, late-night, cheap-fun, date-night, tourist,
 *               local-hidden-gems, artsy, foodie, nature-lover, chill
 *   neighborhood - Houston neighborhood name
 *   limit     - max results per category (default 8)
 */
router.get("/voice-search", async (req, res) => {
  try {
    const { q, vibe, neighborhood, limit = "8" } = req.query;
    const maxResults = Math.min(parseInt(limit as string, 10) || 8, 20);

    // ── Activities from the catalog ───────────────────────────────────────────
    let activityResults: any[] = [];
    try {
      const weather = await getHoustonWeather();
      const timeOfDay = getTimeOfDay();
      const season = getSeason();
      const dayOfWeek = getDayOfWeek();

      if (weather) {
        const prefs: Record<string, any> = {};
        if (vibe) prefs.vibeMode = vibe;
        if (neighborhood) prefs.neighborhood = neighborhood;

        const context: RecommendationContext = {
          preferences: prefs,
          weather,
          timeOfDay,
          season,
          dayOfWeek,
        };

        const recs = await generateRecommendations(context, maxResults, "voice-assistant");
        activityResults = recs.length > 0 ? recs : await getFallbackRecommendations(timeOfDay, weather);
      }
    } catch (err) {
      logger.warn("Activity recommendation failed in voice-search", { err });
    }

    // ── Keyword search across activity names/descriptions ────────────────────
    let keywordActivities: any[] = [];
    if (q) {
      const keyword = `%${String(q).toLowerCase()}%`;
      keywordActivities = await db
        .select()
        .from(houstonActivities)
        .where(
          and(
            eq(houstonActivities.isActive, true),
            or(
              ilike(houstonActivities.name, keyword),
              ilike(houstonActivities.description, keyword),
              ilike(houstonActivities.category, keyword),
              ilike(houstonActivities.neighborhood, keyword)
            )
          )
        )
        .limit(maxResults);
    }

    // ── Upcoming scraped events ───────────────────────────────────────────────
    const upcomingEvents = await db
      .select()
      .from(events)
      .where(gte(events.startDate, new Date()))
      .orderBy(events.startDate)
      .limit(maxResults);

    res.json({
      activities: activityResults.map((r: any) => ({
        ...(r.activity ?? r),
        reasoning: r.reasoning,
        score: r.score,
      })),
      keywordMatches: keywordActivities,
      upcomingEvents,
      meta: {
        vibe: vibe ?? null,
        neighborhood: neighborhood ?? null,
        query: q ?? null,
        activityCount: activityResults.length,
        eventCount: upcomingEvents.length,
      },
    });
  } catch (error) {
    logger.error("Failed voice-search", { error });
    res.status(500).json({ error: "Voice search failed" });
  }
});

export default router;
