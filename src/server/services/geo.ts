/**
 * Geo utilities: WGS-84 distance, bounding-box math, and Houston-area
 * ZIP → centroid resolution for the (very common) "events within N miles
 * of my ZIP" query.
 *
 * We deliberately keep this dependency-free and pure. The Places API
 * lookup lives in ./places.ts; this file just does the math.
 */
import { sql, type SQL } from "drizzle-orm";

const EARTH_RADIUS_MILES = 3958.7613;
const EARTH_RADIUS_KM = 6371.0088;

export interface LatLng {
  lat: number;
  lng: number;
}

/** Haversine distance in miles. */
export function distanceMiles(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Kilometers convenience (rarely used, but kept symmetric). */
export function distanceKm(a: LatLng, b: LatLng): number {
  return distanceMiles(a, b) * (EARTH_RADIUS_KM / EARTH_RADIUS_MILES);
}

/**
 * Approximate (min lat, max lat, min lng, max lng) bounding box for a
 * radius query. Used as a cheap first-pass filter in SQL before applying
 * the exact Haversine check.
 *
 * Latitude: 1° ≈ 69 miles everywhere.
 * Longitude: 1° = 69 miles * cos(lat), narrows as you move poleward.
 * We use cos(lat) at the box center to stay accurate at Houston's
 * ~29.76°N latitude (cos ≈ 0.867, so a 1-mile east/west step ≈ 0.0167°).
 */
export function boundingBoxMiles(
  center: LatLng,
  radiusMiles: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = radiusMiles / 69.0;
  const lngDelta =
    radiusMiles / (69.0 * Math.max(0.01, Math.cos((center.lat * Math.PI) / 180)));
  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}

/**
 * SQL fragment computing distance-in-miles from (event.lat, event.lng)
 * to the given center. Uses PostgreSQL's built-in trig, so no PostGIS
 * required. Returns NULL when either coordinate on the row is null.
 *
 * NOTE: `latCol` / `lngCol` MUST be pre-quoted column references —
 * callers pass e.g. `sql`"events"."latitude"``.
 */
export function haversineMilesSql(
  latCol: SQL,
  lngCol: SQL,
  center: LatLng
): SQL<number> {
  // Radians of the center point are constant → inline.
  const centerLatRad = (center.lat * Math.PI) / 180;
  const centerLngRad = (center.lng * Math.PI) / 180;
  return sql<number>`
    ${sql.raw(String(2 * EARTH_RADIUS_MILES))} *
    asin(
      sqrt(
        power(sin((radians(${latCol}) - ${sql.raw(centerLatRad.toString())}) / 2), 2)
        + cos(${sql.raw(centerLatRad.toString())}) * cos(radians(${latCol}))
          * power(sin((radians(${lngCol}) - ${sql.raw(centerLngRad.toString())}) / 2), 2)
      )
    )
  `;
}

/**
 * Static centroid table for Houston-area ZIPs. Sourced from the US
 * Census 2020 ZCTA gazetteer (public domain) and rounded to 4 decimals
 * (~11 m precision, plenty for radius queries).
 *
 * We keep this in-repo instead of hitting an external geocoder so ZIP
 * resolution always works, even without Places credentials. Non-Houston
 * ZIPs fall through to the Places lookup path.
 */
const HOUSTON_ZIP_CENTROIDS: Record<string, LatLng> = {
  // Inner Loop
  "77002": { lat: 29.7573, lng: -95.3677 }, // Downtown
  "77003": { lat: 29.7477, lng: -95.3423 }, // EaDo
  "77004": { lat: 29.7276, lng: -95.3654 }, // Museum District
  "77005": { lat: 29.7178, lng: -95.4243 }, // West University
  "77006": { lat: 29.7418, lng: -95.3901 }, // Montrose
  "77007": { lat: 29.7729, lng: -95.4014 }, // Rice Military / Washington
  "77008": { lat: 29.7998, lng: -95.4109 }, // Heights
  "77009": { lat: 29.7907, lng: -95.3775 }, // Northside / Woodland Heights
  "77010": { lat: 29.755, lng: -95.36 },
  "77011": { lat: 29.7404, lng: -95.3196 },
  "77012": { lat: 29.7118, lng: -95.3016 },
  "77018": { lat: 29.8305, lng: -95.4321 }, // Oak Forest
  "77019": { lat: 29.7521, lng: -95.4066 }, // River Oaks / Upper Kirby
  "77020": { lat: 29.7708, lng: -95.3288 },
  "77021": { lat: 29.6931, lng: -95.3608 },
  "77022": { lat: 29.8256, lng: -95.3888 },
  "77023": { lat: 29.7261, lng: -95.3268 },
  "77024": { lat: 29.7677, lng: -95.5157 }, // Memorial
  "77025": { lat: 29.6791, lng: -95.4304 },
  "77026": { lat: 29.802, lng: -95.3441 },
  "77027": { lat: 29.7398, lng: -95.4432 }, // Galleria-adjacent
  "77030": { lat: 29.7076, lng: -95.4001 }, // Med Center
  "77098": { lat: 29.7377, lng: -95.4155 }, // Upper Kirby
  // Ring roads
  "77056": { lat: 29.7442, lng: -95.4636 }, // Galleria
  "77057": { lat: 29.7413, lng: -95.4869 },
  "77063": { lat: 29.7398, lng: -95.5252 },
  "77077": { lat: 29.7385, lng: -95.6167 }, // Energy Corridor
  "77079": { lat: 29.7695, lng: -95.6014 },
  "77080": { lat: 29.8161, lng: -95.5303 },
  "77084": { lat: 29.833, lng: -95.6614 },
};

/** Return the centroid for a Houston-area ZIP, or null if unknown. */
export function centroidForZip(zip: string): LatLng | null {
  const key = zip.trim().slice(0, 5);
  return HOUSTON_ZIP_CENTROIDS[key] ?? null;
}

/** Coarse validity check to reject obvious junk before hitting SQL. */
export function isValidLatLng(p: Partial<LatLng>): p is LatLng {
  return (
    typeof p.lat === "number" &&
    typeof p.lng === "number" &&
    isFinite(p.lat) &&
    isFinite(p.lng) &&
    p.lat >= -90 &&
    p.lat <= 90 &&
    p.lng >= -180 &&
    p.lng <= 180
  );
}
