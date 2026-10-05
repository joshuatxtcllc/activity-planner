/**
 * Pure helpers behind /api/map: parse viewport bounds, group geocoded
 * events into one marker per venue, and match events to a clicked
 * Google place. Kept free of DB/Express so they can be unit-tested.
 */
import { distanceMiles } from "./geo";

export interface Bounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

/** Parse "minLat,minLng,maxLat,maxLng". Returns null on anything malformed. */
export function parseBounds(raw: unknown): Bounds | null {
  if (typeof raw !== "string") return null;
  const parts = raw.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minLat, minLng, maxLat, maxLng] = parts;
  if (minLat < -90 || maxLat > 90 || minLat > maxLat) return null;
  if (minLng < -180 || maxLng > 180 || minLng > maxLng) return null;
  // Refuse whole-planet viewports; the map never needs more than a metro.
  if (maxLat - minLat > 5 || maxLng - minLng > 5) return null;
  return { minLat, minLng, maxLat, maxLng };
}

export interface MarkerEventInput {
  id: string;
  title: string;
  startDate: Date | string;
  venue: string | null;
  address: string | null;
  category: string | null;
  source: string;
  url: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
}

export interface WatchedVenueInput {
  slug: string;
  name: string;
  aliases: string[] | null;
  address: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
}

export interface VenueMarker {
  key: string;
  name: string;
  address: string | null;
  neighborhood: string | null;
  lat: number;
  lng: number;
  placeId: string | null;
  watchedSlug: string | null;
  eventCount: number;
  categories: Record<string, number>;
  /** Most common category, or null for a watched venue with no events. */
  primaryCategory: string | null;
  nextEvent: { id: string; title: string; startDate: string } | null;
}

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();

function venueNames(v: WatchedVenueInput): string[] {
  return [v.name, ...(v.aliases ?? [])].map(norm).filter(Boolean);
}

/** Find the watched venue an event belongs to (by placeId, then name/alias). */
export function matchWatchedVenue(
  e: Pick<MarkerEventInput, "venue" | "placeId">,
  watched: WatchedVenueInput[]
): WatchedVenueInput | null {
  if (e.placeId) {
    const byPlace = watched.find((w) => w.placeId && w.placeId === e.placeId);
    if (byPlace) return byPlace;
  }
  const n = norm(e.venue);
  if (!n) return null;
  return watched.find((w) => venueNames(w).includes(n)) ?? null;
}

/**
 * Group events into one marker per venue. Venue identity is the Google
 * placeId when we have one, else the normalized venue name plus rounded
 * coordinates (~11 m). Watched venues with coordinates always get a
 * marker, even with zero upcoming events, so the map shows the rooms the
 * user follows.
 */
export function groupIntoMarkers(
  rows: MarkerEventInput[],
  watched: WatchedVenueInput[],
  bounds: Bounds | null = null
): VenueMarker[] {
  const inBounds = (lat: number, lng: number) =>
    !bounds ||
    (lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng);

  const markers = new Map<string, VenueMarker>();

  const keyFor = (placeId: string | null, name: string | null, lat: number, lng: number) =>
    placeId ? `place:${placeId}` : `name:${norm(name)}@${lat.toFixed(4)},${lng.toFixed(4)}`;

  for (const w of watched) {
    if (w.latitude == null || w.longitude == null || !inBounds(w.latitude, w.longitude)) continue;
    const key = keyFor(w.placeId, w.name, w.latitude, w.longitude);
    markers.set(key, {
      key,
      name: w.name,
      address: w.address,
      neighborhood: w.neighborhood,
      lat: w.latitude,
      lng: w.longitude,
      placeId: w.placeId,
      watchedSlug: w.slug,
      eventCount: 0,
      categories: {},
      primaryCategory: null,
      nextEvent: null,
    });
  }

  for (const e of rows) {
    if (e.latitude == null || e.longitude == null) continue;
    const w = matchWatchedVenue(e, watched);
    // Snap events at a watched venue onto the venue's own pin.
    const lat = w?.latitude ?? e.latitude;
    const lng = w?.longitude ?? e.longitude;
    if (!inBounds(lat, lng)) continue;
    const key = w && w.latitude != null
      ? keyFor(w.placeId, w.name, lat, lng)
      : keyFor(e.placeId, e.venue, lat, lng);

    let m = markers.get(key);
    if (!m) {
      m = {
        key,
        name: e.venue?.trim() || e.title,
        address: e.address,
        neighborhood: null,
        lat,
        lng,
        placeId: e.placeId,
        watchedSlug: null,
        eventCount: 0,
        categories: {},
        primaryCategory: null,
        nextEvent: null,
      };
      markers.set(key, m);
    }
    m.eventCount++;
    const cat = e.category || "other";
    m.categories[cat] = (m.categories[cat] ?? 0) + 1;
    const start = new Date(e.startDate).toISOString();
    if (!m.nextEvent || start < m.nextEvent.startDate) {
      m.nextEvent = { id: e.id, title: e.title, startDate: start };
    }
    if (!m.address && e.address) m.address = e.address;
  }

  for (const m of markers.values()) {
    const entries = Object.entries(m.categories);
    m.primaryCategory = entries.length
      ? entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
      : null;
  }

  return [...markers.values()].sort((a, b) => b.eventCount - a.eventCount || a.name.localeCompare(b.name));
}

/**
 * Decide whether an event belongs to a clicked place. Match on Google
 * placeId first; otherwise require the venue name to match AND, when both
 * sides have coordinates, sit within 0.25 mi (so "Punch Line" in Houston
 * never matches a Punch Line elsewhere).
 */
export function eventMatchesPlace(
  e: Pick<MarkerEventInput, "venue" | "placeId" | "latitude" | "longitude">,
  place: { placeId?: string | null; names: string[]; lat?: number | null; lng?: number | null }
): boolean {
  if (place.placeId && e.placeId && e.placeId === place.placeId) return true;
  const n = norm(e.venue);
  if (!n) return false;
  const names = place.names.map(norm).filter(Boolean);
  const nameHit = names.some(
    (p) => p === n || (Math.min(p.length, n.length) >= 6 && (n.includes(p) || p.includes(n)))
  );
  if (!nameHit) return false;
  if (place.lat != null && place.lng != null && e.latitude != null && e.longitude != null) {
    return distanceMiles({ lat: place.lat, lng: place.lng }, { lat: e.latitude, lng: e.longitude }) <= 0.25;
  }
  return true;
}
