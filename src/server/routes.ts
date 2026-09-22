import { Router } from "express";
import { db } from "./db";
import { events, houstonActivities } from "../shared/schema";
import { desc, and, gte, lte, eq, ilike, or } from "drizzle-orm";
import logger from "./utils/logger";
import { getNextFriday } from "./utils/date-utils";
import type { ItineraryPreferences } from "./services/itinerary-generator";
import { startItineraryJob, getItineraryJob } from "./services/itinerary-jobs";
import { startScrapeJob, getScrapeJob } from "./services/scrape-jobs";
import { generateRecommendations, getFallbackRecommendations, type RecommendationContext } from "./services/recommendation-engine";
import { getHoustonWeather, getTimeOfDay, getSeason, getDayOfWeek } from "./services/weather-adapter";
import curatorRoutes from "./routes/curator";
import userActivitiesRoutes from "./routes/user-activities";
import verifyUrlRoutes from "./routes/verify-url";
import preferencesRoutes from "./routes/preferences";
import searchRoutes from "./routes/search";
import alertRulesRoutes from "./routes/alert-rules";

const router = Router();

// Mount curator routes
router.use("/curator", curatorRoutes);

// Mount user activities routes
router.use("/user-activities", userActivitiesRoutes);

// Mount URL verification routes
router.use("/verify-url", verifyUrlRoutes);

// Mount preference tracking routes (event like/dislike)
router.use("/preferences", preferencesRoutes);

// Mount internal search routes (real events + curated activities)
router.use("/search", searchRoutes);

// Mount alert-rule CRUD routes
router.use("/alert-rules", alertRulesRoutes);

/**
 * GET /api/events
 * Get all upcoming events
 */
router.get("/events", async (req, res) => {
  try {
    const {
      source,
      category,
      upcoming,
      venue,
      dateStart,
      dateEnd,
      search,
      sort,
      limit,
    } = req.query;

    const filters = [];

    if (source) filters.push(eq(events.source, source as string));
    if (category) filters.push(eq(events.category, category as string));
    if (upcoming === "true") filters.push(gte(events.startDate, new Date()));

    // Venue: substring match so "House of Blues" catches
    // "House of Blues Houston" without users hunting the exact spelling.
    if (venue) filters.push(ilike(events.venue, `%${venue as string}%`));

    // Optional date window (ISO strings).
    if (dateStart) {
      const d = new Date(dateStart as string);
      if (!isNaN(d.getTime())) filters.push(gte(events.startDate, d));
    }
    if (dateEnd) {
      const d = new Date(dateEnd as string);
      if (!isNaN(d.getTime())) filters.push(lte(events.startDate, d));
    }

    // Free-text search over title + description.
    if (search) {
      const term = `%${search as string}%`;
      filters.push(or(ilike(events.title, term), ilike(events.description, term))!);
    }

    const orderBy = (() => {
      switch (sort) {
        case "date_desc":
          return desc(events.startDate);
        case "newest":
          return desc(events.scrapedAt);
        case "title":
          return events.title;
        case "date_asc":
        default:
          return events.startDate; // ascending is the useful default for a calendar
      }
    })();

    const cap = Math.min(parseInt((limit as string) || "200", 10) || 200, 500);

    const allEvents = await db
      .select()
      .from(events)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(orderBy)
      .limit(cap);

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
 * Kick off a scrape as a background job (one AI-assisted scraper uses live
 * web search and can take a while - longer than a synchronous HTTP request
 * should hold open). Returns a jobId to poll for the result.
 */
router.post("/scrape", async (_req, res) => {
  logger.info("Manual scrape triggered");
  const jobId = startScrapeJob();
  res.status(202).json({ jobId });
});

/**
 * GET /api/scrape/status/:jobId
 * Poll the status of a background scrape job.
 */
router.get("/scrape/status/:jobId", (req, res) => {
  const job = getScrapeJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: "Job not found or expired" });
  }

  if (job.status === "completed") {
    return res.json({ status: "completed", result: job.result });
  }

  if (job.status === "failed") {
    return res.json({ status: "failed", error: job.error });
  }

  res.json({ status: "pending" });
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
 * Kick off itinerary generation as a background job (the underlying AI call,
 * with live web search, can take several minutes - longer than a synchronous
 * HTTP request should hold open). Returns a jobId to poll for the result.
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

    logger.info("Starting itinerary job", { preferences });

    const jobId = startItineraryJob(preferences);

    res.status(202).json({ jobId });
  } catch (error) {
    logger.error("Failed to start itinerary job", { error });
    res.status(500).json({ error: "Failed to start itinerary generation" });
  }
});

/**
 * GET /api/itinerary/status/:jobId
 * Poll the status of a background itinerary generation job.
 */
router.get("/itinerary/status/:jobId", (req, res) => {
  const job = getItineraryJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: "Job not found or expired" });
  }

  if (job.status === "completed") {
    return res.json({ status: "completed", result: job.result });
  }

  if (job.status === "failed") {
    return res.json({ status: "failed", error: job.error });
  }

  res.json({ status: "pending" });
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
