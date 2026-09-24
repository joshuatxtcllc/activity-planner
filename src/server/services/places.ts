/**
 * Google Places (v1) resolver with a Postgres cache.
 *
 * We use Places v1 rather than legacy Geocoding because it handles both
 * pure addresses ("1204 Caroline St, Houston, TX") and venue names
 * ("White Oak Music Hall, Houston") uniformly through a single
 * `searchText` call. Every lookup writes a row into `place_lookups`
 * keyed by SHA-256 of the normalized input, so repeated requests for
 * the same address never re-hit the API — critical for staying inside
 * the free-tier quota when the backfill sweeps thousands of events.
 *
 * The API key comes from `GOOGLE_MAPS_API_KEY`. Without it, the module
 * is disabled: every call returns `{ status: "error", error: "no api key" }`
 * without hitting the network and without writing to the cache, so the
 * server still boots and non-geo features stay functional.
 */
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { placeLookups, type PlaceLookup } from "../../shared/schema";
import logger from "../utils/logger";

// v1 endpoint. Field mask keeps the response tiny and cheap; per the
// Places pricing table, "Text Search (Essentials)" is the lowest tier.
const PLACES_SEARCHTEXT_URL = "https://places.googleapis.com/v1/places:searchText";
const PLACES_FIELD_MASK = [
  "places.id",
  "places.formattedAddress",
  "places.location",
].join(",");

export type PlaceLookupStatus = "ok" | "not_found" | "error";

export interface PlaceResolution {
  status: PlaceLookupStatus;
  placeId: string | null;
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  error?: string;
  cached: boolean;
}

function normalize(input: string): string {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

function hashInput(normalized: string): string {
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function readEnvKey(): string | null {
  const raw = process.env.GOOGLE_MAPS_API_KEY;
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Force a fresh call the next time this input is resolved. */
export async function invalidatePlace(input: string): Promise<void> {
  const hash = hashInput(normalize(input));
  await db.delete(placeLookups).where(eq(placeLookups.inputHash, hash));
}

/**
 * Resolve an address / venue string to a Places result, using cache
 * when possible. Never throws — returns `{ status: "error", ... }` on
 * any failure so callers can degrade gracefully.
 */
export async function resolvePlace(rawInput: string): Promise<PlaceResolution> {
  const input = rawInput?.trim();
  if (!input) {
    return {
      status: "error",
      placeId: null,
      formattedAddress: null,
      latitude: null,
      longitude: null,
      error: "empty input",
      cached: false,
    };
  }
  const normalized = normalize(input);
  const hash = hashInput(normalized);

  // Cache hit?
  const cached = await db
    .select()
    .from(placeLookups)
    .where(eq(placeLookups.inputHash, hash))
    .limit(1);
  if (cached.length > 0) {
    return toResolution(cached[0], /* cached */ true);
  }

  const apiKey = readEnvKey();
  if (!apiKey) {
    // No key configured — return an uncached error so we retry once the
    // operator provisions one. We deliberately don't write a cache row
    // here, otherwise the whole DB would fill with false negatives.
    return {
      status: "error",
      placeId: null,
      formattedAddress: null,
      latitude: null,
      longitude: null,
      error: "GOOGLE_MAPS_API_KEY not set",
      cached: false,
    };
  }

  let apiResult: PlaceResolution;
  try {
    apiResult = await callPlacesSearchText(input, apiKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("Places lookup failed, writing error row to cache", { input, message });
    apiResult = {
      status: "error",
      placeId: null,
      formattedAddress: null,
      latitude: null,
      longitude: null,
      error: message,
      cached: false,
    };
  }

  // Persist to cache regardless of status. `not_found` and transient
  // `error` both become rows, so we don't hammer the API on repeated
  // queries. If you need to retry a specific input, call
  // `invalidatePlace(input)` first.
  try {
    await db
      .insert(placeLookups)
      .values({
        inputHash: hash,
        input: normalized,
        status: apiResult.status,
        placeId: apiResult.placeId,
        formattedAddress: apiResult.formattedAddress,
        latitude: apiResult.latitude,
        longitude: apiResult.longitude,
        errorMessage: apiResult.error ?? null,
      })
      .onConflictDoNothing({ target: placeLookups.inputHash });
  } catch (persistError) {
    logger.warn("Failed to persist Places cache row", {
      input,
      error: persistError instanceof Error ? persistError.message : String(persistError),
    });
  }

  return { ...apiResult, cached: false };
}

async function callPlacesSearchText(
  input: string,
  apiKey: string
): Promise<PlaceResolution> {
  const body = {
    textQuery: input,
    // Bias to Houston to reduce ambiguous matches (e.g. "House of Blues"
    // resolving to Chicago). The bias is soft — Places will still return
    // matches outside this rectangle if the text is highly specific.
    locationBias: {
      rectangle: {
        low: { latitude: 29.5, longitude: -95.85 },
        high: { latitude: 30.15, longitude: -95.0 },
      },
    },
    maxResultCount: 1,
    languageCode: "en",
  };

  const response = await fetch(PLACES_SEARCHTEXT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": PLACES_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await safeReadBody(response);
    throw new Error(`Places API ${response.status}: ${detail}`);
  }

  const json = (await response.json()) as {
    places?: Array<{
      id?: string;
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
    }>;
  };

  const first = json.places?.[0];
  if (!first || !first.location) {
    return {
      status: "not_found",
      placeId: null,
      formattedAddress: null,
      latitude: null,
      longitude: null,
      cached: false,
    };
  }

  const lat = first.location.latitude;
  const lng = first.location.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return {
      status: "not_found",
      placeId: first.id ?? null,
      formattedAddress: first.formattedAddress ?? null,
      latitude: null,
      longitude: null,
      cached: false,
    };
  }

  return {
    status: "ok",
    placeId: first.id ?? null,
    formattedAddress: first.formattedAddress ?? null,
    latitude: lat,
    longitude: lng,
    cached: false,
  };
}

function toResolution(row: PlaceLookup, cached: boolean): PlaceResolution {
  return {
    status: (row.status as PlaceLookupStatus) ?? "error",
    placeId: row.placeId ?? null,
    formattedAddress: row.formattedAddress ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    error: row.errorMessage ?? undefined,
    cached,
  };
}

async function safeReadBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 500);
  } catch {
    return "<unreadable body>";
  }
}

/**
 * Compose the most informative input string for Places from an event
 * row. Prefers explicit address, falls back to venue+location, then
 * bare title.
 */
export function eventLookupInput(event: {
  address?: string | null;
  venue?: string | null;
  location?: string | null;
  title?: string | null;
}): string | null {
  const address = event.address?.trim();
  const venue = event.venue?.trim();
  const location = event.location?.trim();
  if (address && venue) return `${venue}, ${address}`;
  if (address) return address;
  if (venue && location) return `${venue}, ${location}`;
  if (venue) return venue;
  if (event.title && location) return `${event.title}, ${location}`;
  return null;
}
