/**
 * LocalBeat event source.
 *
 * LocalBeat (https://localbeat.com) aggregates neighborhood-level events —
 * trivia at bars, karaoke, open mics, small-room live music — that the
 * ticketing APIs never see. It publishes a public, read-only MCP server at
 * https://localbeat.com/api/mcp with three tools: search_events,
 * get_event_details and get_search_facets. We call that interface directly
 * (JSON-RPC over HTTP) rather than parsing HTML.
 *
 * Terms of use (https://localbeat.com/terms, checked Sep 2026): the MCP
 * server is one of the "interfaces we provide"; clients must not overload
 * it or extract data beyond those interfaces, and commercial use requires a
 * separate agreement. So this scraper:
 *   - uses only the official MCP tools
 *   - identifies itself with an honest User-Agent
 *   - runs a small, fixed set of interest queries sequentially with a delay
 *   - links every event back to its LocalBeat page
 * Set LOCALBEAT_DISABLED=true to turn it off entirely.
 */
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";

const LOCALBEAT_MCP_URL = "https://localbeat.com/api/mcp";
const USER_AGENT =
  "ActivityPlanner/0.2 (+https://github.com/joshuatxtcllc/activity-planner)";
const SOURCE = "localbeat";
const TIMEZONE = "America/Chicago";
const REQUEST_DELAY_MS = 750;
const DETAILS_BATCH_SIZE = 25;
const PAGE_SIZE = 50;

/**
 * Interest queries, matched to the user's stated interests: live music
 * (all genres), comedy, and game nights (trivia, bingo). `maxPages` caps
 * how deep we page per query — live music has far more results than the
 * others.
 */
export const INTEREST_QUERIES: Array<{ query: string; maxPages: number }> = [
  { query: "live music", maxPages: 3 },
  { query: "comedy", maxPages: 2 },
  { query: "trivia", maxPages: 1 },
  { query: "bingo", maxPages: 1 },
  { query: "game night", maxPages: 1 },
  { query: "karaoke", maxPages: 1 },
  { query: "open mic", maxPages: 1 },
];

// ---------------------------------------------------------------------------
// Types mirroring LocalBeat's published output schemas (subset we use)
// ---------------------------------------------------------------------------
export interface LocalBeatSearchEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  allDay: boolean;
  venue: string;
  location: string;
  tags: string[];
  eventUrl: string;
  otherOccurrences?: Array<{ id: string; date: string; time: string }>;
}

export interface LocalBeatEventDetail {
  id: string;
  name: string;
  description?: string;
  start?: string; // "yyyy-MM-ddTHH:mm:ss" local, or "yyyy-MM-dd" when allDay
  end?: string;
  allDay: boolean;
  venue?: { name?: string; address?: string; city?: string; state?: string };
  tags: string[];
  eventUrl: string;
  ticketUrl?: string;
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

/**
 * Map LocalBeat tag labels to Activity Planner categories. Returns null
 * when nothing matches, and the caller drops the event — that's what
 * filters out the fitness classes and church services that dominate
 * LocalBeat's raw Houston feed.
 */
export function categoryFromTags(tags: string[] | undefined): string | null {
  if (!tags || tags.length === 0) return null;
  const t = tags.map((x) => x.toLowerCase());
  const has = (...needles: string[]) => t.some((x) => needles.includes(x));
  if (has("comedy", "stand up", "improv")) return "comedy";
  if (has("trivia", "bingo", "board games", "gaming", "game night", "pub quiz")) {
    return "game_night";
  }
  if (has("music", "karaoke", "concerts", "live music", "rock/pop", "jazz", "country", "hip hop")) {
    return "music";
  }
  return null;
}

const EXCLUDED_TAGS = new Set([
  "kids and family",
  "education",
  "religion and spirituality",
  "christianity",
]);
const EXCLUDED_TITLE =
  /\b(practice|rehearsal|class|classes|study session|bible study|lesson|lessons|mtg|meeting|choir|praise band)\b/i;
// Campus room-booking feeds: "PDR, Rice Philharmonics, …", "Upper Commons, Cabinet".
const ROOM_BOOKING_TITLE = /^(PDR|[\w ]*(Room|Classroom|Commons)),\s/;
// Houses of worship publish their whole internal calendar (staff meetings,
// praise band). Trade-off: this also drops the occasional church concert.
const EXCLUDED_VENUE = /\b(church|lutheran|methodist|baptist|chapel|ministries|ministry|parish|cathedral)\b/i;
// Some statewide organizers list every city's edition under one venue.
const OTHER_TX_CITY = /\b(dallas|austin|san antonio|fort worth|el paso|lubbock)\b/i;

/**
 * True when an event is out of scope for a nightlife feed even though
 * its tags map to a category: kids' music classes, choir practice,
 * church bingo fellowships, campus room bookings, other-city editions.
 */
export function isExcluded(
  title: string,
  tags: string[] | undefined,
  venue?: string | null
): boolean {
  if (tags?.some((t) => EXCLUDED_TAGS.has(t.toLowerCase()))) return true;
  if (EXCLUDED_TITLE.test(title)) return true;
  if (ROOM_BOOKING_TITLE.test(title)) return true;
  if (venue && EXCLUDED_VENUE.test(venue)) return true;
  if (OTHER_TX_CITY.test(title)) return true;
  return false;
}

/** Offset (minutes) of `timeZone` from UTC at the given instant. */
function tzOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/**
 * Convert a wall-clock time in America/Chicago ("2026-10-10T19:30:00" or
 * "2026-10-10") to a UTC Date, DST-correct. Returns null on bad input.
 */
export function chicagoLocalToUtc(local: string | undefined): Date | null {
  if (!local) return null;
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const [, y, mo, d, h = "00", mi = "00", s = "00"] = m;
  const wallAsUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  if (Number.isNaN(wallAsUtc)) return null;
  // Two passes handle instants near a DST transition.
  let guess = wallAsUtc - tzOffsetMinutes(new Date(wallAsUtc), TIMEZONE) * 60000;
  guess = wallAsUtc - tzOffsetMinutes(new Date(guess), TIMEZONE) * 60000;
  return new Date(guess);
}

function normalizeState(state: string | undefined): string {
  if (!state) return "";
  return state.trim().toLowerCase() === "texas" ? "TX" : state.trim();
}

/**
 * Convert a LocalBeat detail record to an Activity Planner event row.
 * Returns null when the record is unusable (no start, not in Texas, or
 * outside the interest categories).
 */
export function detailToEvent(
  detail: LocalBeatEventDetail,
  fallbackTags: string[] = []
): NewEvent | null {
  const tags = detail.tags?.length ? detail.tags : fallbackTags;
  const category = categoryFromTags(tags);
  if (!category) return null;
  if (isExcluded(detail.name, tags, detail.venue?.name)) return null;

  const startDate = chicagoLocalToUtc(detail.start);
  if (!startDate) return null;
  const endDate = detail.allDay ? null : chicagoLocalToUtc(detail.end);

  const state = normalizeState(detail.venue?.state);
  if (state && state !== "TX") return null;

  const city = detail.venue?.city?.trim() || "Houston";
  const location = `${city}, TX`;
  const street = detail.venue?.address?.trim();
  const address = street ? `${street}, ${city}, TX` : null;

  // LocalBeat marks events without a listed start time as all-day. We
  // store them at local midnight and say so in the description, rather
  // than inventing a showtime.
  const baseDescription = detail.description?.trim() || null;
  const description = detail.allDay
    ? `Start time not listed; check the event page.${baseDescription ? `\n\n${baseDescription}` : ""}`
    : baseDescription;

  const title = detail.name.trim();
  return {
    title,
    description,
    startDate,
    endDate,
    location,
    venue: detail.venue?.name?.trim() || null,
    address,
    url: detail.eventUrl,
    imageUrl: null,
    source: SOURCE,
    category,
    externalId: detail.id,
    uniqueKey: generateEventHash(title, startDate, location),
  };
}

/** Local (America/Chicago) calendar date, e.g. "2026-10-09". */
function chicagoDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * LocalBeat sometimes carries the same show twice: once from the venue's
 * own calendar with a showtime, once from an aggregator as an all-day
 * listing. Collapse rows with the same title on the same local date,
 * keeping the one that has a real start time.
 */
export function collapseSameDayDuplicates(rows: NewEvent[]): NewEvent[] {
  const isUntimed = (r: NewEvent) => !!r.description?.startsWith("Start time not listed");
  const best = new Map<string, NewEvent>();
  for (const row of rows) {
    const key = `${row.title.toLowerCase().trim()}|${chicagoDateKey(row.startDate as Date)}`;
    const prior = best.get(key);
    if (!prior || (isUntimed(prior) && !isUntimed(row))) best.set(key, row);
  }
  return [...best.values()];
}

/** Parse a JSON-RPC response that may arrive as plain JSON or SSE. */
export function parseRpcBody(text: string): any {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const dataLines = trimmed
    .split("\n")
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trim());
  if (dataLines.length === 0) throw new Error("Empty MCP response");
  return JSON.parse(dataLines[dataLines.length - 1]);
}

// ---------------------------------------------------------------------------
// MCP client
// ---------------------------------------------------------------------------
let rpcId = 0;

async function callTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const response = await fetch(LOCALBEAT_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: ++rpcId,
      method: "tools/call",
      params: { name, arguments: args },
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(`LocalBeat ${name} HTTP ${response.status}`);
  }
  const body = parseRpcBody(await response.text());
  if (body.error) {
    throw new Error(`LocalBeat ${name} error: ${body.error.message ?? JSON.stringify(body.error)}`);
  }
  if (body.result?.isError) {
    const msg = body.result.content?.[0]?.text ?? "tool error";
    throw new Error(`LocalBeat ${name} tool error: ${msg}`);
  }
  const structured = body.result?.structuredContent;
  if (!structured) throw new Error(`LocalBeat ${name} returned no structuredContent`);
  return structured as T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Scraper entry point
// ---------------------------------------------------------------------------
export async function scrapeLocalBeat(): Promise<NewEvent[]> {
  if (process.env.LOCALBEAT_DISABLED === "true") {
    logger.info("LocalBeat scraper disabled via LOCALBEAT_DISABLED");
    return [];
  }

  const location = process.env.LOCALBEAT_LOCATION || "Houston, TX";
  const radiusMiles = Number(process.env.LOCALBEAT_RADIUS_MILES) || 25;
  const dateRange = process.env.LOCALBEAT_DATE_RANGE || "next 14 days";

  logger.info("Starting LocalBeat scraper", { location, radiusMiles, dateRange });

  // id → tags seen in search results (used when details omit tags)
  const candidates = new Map<string, string[]>();

  for (const { query, maxPages } of INTEREST_QUERIES) {
    for (let page = 0; page < maxPages; page++) {
      try {
        const result = await callTool<{
          events: LocalBeatSearchEvent[];
          hasMore?: boolean;
        }>("search_events", {
          location,
          radiusMiles,
          dateRange,
          query,
          pageNumber: page,
          pageSize: PAGE_SIZE,
          sortBy: "RELEVANCE",
          timezone: TIMEZONE,
        });
        for (const ev of result.events ?? []) {
          // Pre-filter on the search row's tags so we don't fetch details
          // for fitness classes and the like.
          if (!categoryFromTags(ev.tags) || isExcluded(ev.name, ev.tags, ev.venue)) continue;
          candidates.set(ev.id, ev.tags);
          for (const occ of ev.otherOccurrences ?? []) {
            if (!candidates.has(occ.id)) candidates.set(occ.id, ev.tags);
          }
        }
        await sleep(REQUEST_DELAY_MS);
        if (!result.hasMore) break;
      } catch (error) {
        logger.warn("LocalBeat search failed; continuing with other queries", {
          query,
          page,
          error: error instanceof Error ? error.message : String(error),
        });
        break;
      }
    }
  }

  logger.info(`LocalBeat: ${candidates.size} candidate events after tag filter`);

  const results: NewEvent[] = [];
  const seenKeys = new Set<string>();
  const ids = [...candidates.keys()];

  for (let i = 0; i < ids.length; i += DETAILS_BATCH_SIZE) {
    const batch = ids.slice(i, i + DETAILS_BATCH_SIZE);
    try {
      const { events: details } = await callTool<{ events: LocalBeatEventDetail[] }>(
        "get_event_details",
        { eventIds: batch }
      );
      for (const detail of details ?? []) {
        const row = detailToEvent(detail, candidates.get(detail.id) ?? []);
        if (!row || !row.uniqueKey || seenKeys.has(row.uniqueKey)) continue;
        seenKeys.add(row.uniqueKey);
        results.push(row);
      }
    } catch (error) {
      logger.warn("LocalBeat details batch failed; skipping batch", {
        batchStart: i,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    await sleep(REQUEST_DELAY_MS);
  }

  const collapsed = collapseSameDayDuplicates(results);
  logger.info(`LocalBeat scraper complete: ${collapsed.length} events`, {
    collapsedDuplicates: results.length - collapsed.length,
  });
  return collapsed;
}
