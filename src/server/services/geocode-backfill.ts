/**
 * Backfill lat/lng on `events` and `watched_venues` rows that don't
 * have coordinates yet.
 *
 * Runs sequentially with a small delay between API calls to keep well
 * under the Places QPS caps. Skips rows whose previous lookup returned
 * `not_found` — those are known-bad addresses and re-hitting them just
 * burns quota. Callers can force a retry by clearing `place_id_status`
 * on the row (or by calling `invalidatePlace` on the input string).
 *
 * This is designed to be called from an admin route or a one-off
 * script, not on every server boot. Backfill of the full events table
 * (thousands of rows) would blow past free-tier quota if it ran
 * unconditionally at startup.
 */
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "../db";
import { events, watchedVenues } from "../../shared/schema";
import { eventLookupInput, resolvePlace } from "./places";
import logger from "../utils/logger";

export interface BackfillResult {
  scope: "events" | "watched_venues";
  scanned: number;
  resolved: number;
  notFound: number;
  errors: number;
  skipped: number;
  cachedHits: number;
  usedApiCalls: number;
}

interface BackfillOptions {
  limit?: number;
  delayMs?: number;
  dryRun?: boolean;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function backfillWatchedVenueGeo(
  opts: BackfillOptions = {}
): Promise<BackfillResult> {
  const limit = opts.limit ?? 100;
  const delayMs = opts.delayMs ?? 200;
  const dryRun = opts.dryRun ?? false;

  const rows = await db
    .select()
    .from(watchedVenues)
    .where(
      and(
        isNull(watchedVenues.latitude),
        // Skip rows we've already tried and failed on.
        or(isNull(watchedVenues.placeIdStatus), eq(watchedVenues.placeIdStatus, "ok"))!
      )
    )
    .limit(limit);

  const result: BackfillResult = {
    scope: "watched_venues",
    scanned: rows.length,
    resolved: 0,
    notFound: 0,
    errors: 0,
    skipped: 0,
    cachedHits: 0,
    usedApiCalls: 0,
  };

  for (const row of rows) {
    const input = row.address
      ? `${row.name}, ${row.address}`
      : `${row.name}, Houston, TX`;
    const resolution = await resolvePlace(input);
    if (resolution.cached) result.cachedHits++;
    else result.usedApiCalls++;

    if (resolution.status === "ok" && resolution.latitude != null && resolution.longitude != null) {
      result.resolved++;
      if (!dryRun) {
        await db
          .update(watchedVenues)
          .set({
            latitude: resolution.latitude,
            longitude: resolution.longitude,
            placeId: resolution.placeId,
            placeIdStatus: "ok",
            geocodedAt: new Date(),
          })
          .where(eq(watchedVenues.id, row.id));
      }
    } else if (resolution.status === "not_found") {
      result.notFound++;
      if (!dryRun) {
        await db
          .update(watchedVenues)
          .set({ placeIdStatus: "not_found", geocodedAt: new Date() })
          .where(eq(watchedVenues.id, row.id));
      }
    } else {
      result.errors++;
      // Don't stamp an error status — we want to retry transient failures.
    }

    if (!resolution.cached) await sleep(delayMs);
  }

  logger.info("Watched-venue geo backfill complete", result);
  return result;
}

export async function backfillEventGeo(
  opts: BackfillOptions = {}
): Promise<BackfillResult> {
  const limit = opts.limit ?? 200;
  const delayMs = opts.delayMs ?? 150;
  const dryRun = opts.dryRun ?? false;

  const rows = await db
    .select()
    .from(events)
    .where(
      and(
        isNull(events.latitude),
        or(isNull(events.placeIdStatus), eq(events.placeIdStatus, "ok"))!
      )
    )
    .orderBy(sql`${events.startDate} DESC`) // freshest events first
    .limit(limit);

  const result: BackfillResult = {
    scope: "events",
    scanned: rows.length,
    resolved: 0,
    notFound: 0,
    errors: 0,
    skipped: 0,
    cachedHits: 0,
    usedApiCalls: 0,
  };

  for (const row of rows) {
    const input = eventLookupInput(row);
    if (!input) {
      result.skipped++;
      continue;
    }
    const resolution = await resolvePlace(input);
    if (resolution.cached) result.cachedHits++;
    else result.usedApiCalls++;

    if (resolution.status === "ok" && resolution.latitude != null && resolution.longitude != null) {
      result.resolved++;
      if (!dryRun) {
        await db
          .update(events)
          .set({
            latitude: resolution.latitude,
            longitude: resolution.longitude,
            placeId: resolution.placeId,
            placeIdStatus: "ok",
            geocodedAt: new Date(),
          })
          .where(eq(events.id, row.id));
      }
    } else if (resolution.status === "not_found") {
      result.notFound++;
      if (!dryRun) {
        await db
          .update(events)
          .set({ placeIdStatus: "not_found", geocodedAt: new Date() })
          .where(eq(events.id, row.id));
      }
    } else {
      result.errors++;
    }

    if (!resolution.cached) await sleep(delayMs);
  }

  logger.info("Event geo backfill complete", result);
  return result;
}
