/**
 * /api/map — backing endpoints for the clickable map view.
 *
 *   GET /api/map/config         browser key + map id (or enabled:false)
 *   GET /api/map/venues         one marker per venue inside the viewport
 *   GET /api/map/venue-events   upcoming events at a clicked place
 */
import { Router } from "express";
import { and, gte, ilike, isNotNull, isNull, lte, or, eq, type SQL } from "drizzle-orm";
import { db } from "../db";
import { events, watchedVenues } from "../../shared/schema";
import logger from "../utils/logger";
import { eventMatchesPlace, groupIntoMarkers, matchWatchedVenue, parseBounds } from "../services/map-markers";

const router = Router();

const MAX_EVENTS_PER_QUERY = 3000;
const MAX_WINDOW_DAYS = 60;

/**
 * The Maps JavaScript API key necessarily ships to the browser. Use a
 * separate key restricted by HTTP referrer (GOOGLE_MAPS_BROWSER_KEY);
 * fall back to GOOGLE_MAPS_API_KEY so a single-key setup still works.
 */
router.get("/config", (_req, res) => {
  const browserKey = process.env.GOOGLE_MAPS_BROWSER_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
  res.json({
    enabled: browserKey.length > 0,
    browserKey: browserKey || null,
    // Advanced markers require a map id. DEMO_MAP_ID is Google's shared
    // testing id; set GOOGLE_MAPS_MAP_ID to your own for production.
    mapId: process.env.GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID",
    defaultCenter: { lat: 29.7998, lng: -95.4109 }, // Heights (77008)
  });
});

function parseWindow(q: Record<string, unknown>): { from: Date; to: Date } | { error: string } {
  const now = new Date();
  const from = q.from ? new Date(String(q.from)) : now;
  const to = q.to ? new Date(String(q.to)) : new Date(now.getTime() + 14 * 86400000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return { error: "from/to must be ISO dates" };
  if (to <= from) return { error: "to must be after from" };
  if (to.getTime() - from.getTime() > MAX_WINDOW_DAYS * 86400000) {
    return { error: `window may not exceed ${MAX_WINDOW_DAYS} days` };
  }
  return { from, to };
}

function parseCategories(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw.split(",").map((c) => c.trim()).filter(Boolean).slice(0, 10);
}

router.get("/venues", async (req, res) => {
  try {
    const bounds = parseBounds(req.query.bbox);
    if (!bounds) return res.status(400).json({ error: "bbox=minLat,minLng,maxLat,maxLng required (max 5° span)" });
    const window = parseWindow(req.query as Record<string, unknown>);
    if ("error" in window) return res.status(400).json(window);
    const categories = parseCategories(req.query.categories);

    const filters: SQL[] = [
      isNotNull(events.latitude),
      isNotNull(events.longitude),
      gte(events.latitude, bounds.minLat),
      lte(events.latitude, bounds.maxLat),
      gte(events.longitude, bounds.minLng),
      lte(events.longitude, bounds.maxLng),
      gte(events.startDate, window.from),
      lte(events.startDate, window.to),
    ];
    if (categories.length) filters.push(or(...categories.map((c) => eq(events.category, c)))!);

    const [rows, watched] = await Promise.all([
      db
        .select({
          id: events.id,
          title: events.title,
          startDate: events.startDate,
          venue: events.venue,
          address: events.address,
          category: events.category,
          source: events.source,
          url: events.url,
          latitude: events.latitude,
          longitude: events.longitude,
          placeId: events.placeId,
        })
        .from(events)
        .where(and(...filters))
        .limit(MAX_EVENTS_PER_QUERY),
      db.select().from(watchedVenues),
    ]);

    // If nothing is placeable, check whether that's because events in the
    // window simply lack coordinates, so the UI can point at the backfill.
    let ungeocodedInWindow = 0;
    if (rows.length === 0) {
      const pending = await db
        .select({ id: events.id })
        .from(events)
        .where(and(isNull(events.latitude), gte(events.startDate, window.from), lte(events.startDate, window.to)))
        .limit(500);
      ungeocodedInWindow = pending.length;
    }

    // When filtering by category, hide watched venues that have nothing
    // in that category so the map reflects the filter.
    const markers = groupIntoMarkers(rows, categories.length ? [] : watched, bounds);
    res.json({
      markers,
      eventCount: rows.length,
      truncated: rows.length >= MAX_EVENTS_PER_QUERY,
      ungeocodedInWindow,
      window: { from: window.from.toISOString(), to: window.to.toISOString() },
    });
  } catch (error) {
    logger.error("GET /api/map/venues failed", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Failed to load map venues" });
  }
});

router.get("/venue-events", async (req, res) => {
  try {
    const placeId = typeof req.query.placeId === "string" && req.query.placeId ? req.query.placeId : null;
    const name = typeof req.query.name === "string" ? req.query.name.trim().slice(0, 200) : "";
    const lat = req.query.lat != null ? Number(req.query.lat) : null;
    const lng = req.query.lng != null ? Number(req.query.lng) : null;
    if (!placeId && !name) return res.status(400).json({ error: "placeId or name required" });
    const window = parseWindow(req.query as Record<string, unknown>);
    if ("error" in window) return res.status(400).json(window);

    const watched = await db.select().from(watchedVenues);
    const watchedMatch =
      watched.find((w) => placeId && w.placeId === placeId) ??
      (name ? matchWatchedVenue({ venue: name, placeId: null }, watched) : null);
    const names = [name, ...(watchedMatch ? [watchedMatch.name, ...(watchedMatch.aliases ?? [])] : [])].filter(Boolean);

    // Candidate rows: same placeId, or venue text resembling any known name.
    const nameFilters = names.map((n) => ilike(events.venue, `%${n.replace(/^the\s+/i, "").replace(/[%_]/g, "")}%`));
    const candidates = await db
      .select()
      .from(events)
      .where(
        and(
          gte(events.startDate, window.from),
          lte(events.startDate, window.to),
          or(...(placeId ? [eq(events.placeId, placeId)] : []), ...nameFilters)!
        )
      )
      .orderBy(events.startDate)
      .limit(300);

    const place = {
      placeId,
      names,
      lat: Number.isFinite(lat) ? lat : watchedMatch?.latitude ?? null,
      lng: Number.isFinite(lng) ? lng : watchedMatch?.longitude ?? null,
    };
    const matched = candidates.filter((e) => eventMatchesPlace(e, place)).slice(0, 100);

    res.json({
      watchedVenue: watchedMatch
        ? { slug: watchedMatch.slug, name: watchedMatch.name, neighborhood: watchedMatch.neighborhood }
        : null,
      events: matched.map((e) => ({
        id: e.id,
        title: e.title,
        startDate: e.startDate,
        venue: e.venue,
        category: e.category,
        source: e.source,
        url: e.url,
        timeUnknown: !!e.description?.startsWith("Start time not listed"),
      })),
    });
  } catch (error) {
    logger.error("GET /api/map/venue-events failed", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Failed to load venue events" });
  }
});

export default router;
