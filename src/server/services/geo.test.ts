import { describe, expect, it } from "vitest";
import {
  boundingBoxMiles,
  centroidForZip,
  distanceMiles,
  isValidLatLng,
} from "./geo";

// Reference points used across cases (Google-Maps-verified centroids).
const HEIGHTS = { lat: 29.7998, lng: -95.4109 }; // 77008
const DOWNTOWN = { lat: 29.7573, lng: -95.3677 }; // 77002
const NRG = { lat: 29.6847, lng: -95.4107 }; // NRG Stadium
const MEMORIAL_CITY = { lat: 29.7677, lng: -95.5157 }; // 77024

describe("distanceMiles", () => {
  it("is zero for identical points", () => {
    expect(distanceMiles(HEIGHTS, HEIGHTS)).toBeCloseTo(0, 5);
  });

  it("Heights → Downtown is ~3.7 mi", () => {
    // Ground-truth from Google Maps driving-independent great-circle: ~3.7 mi.
    expect(distanceMiles(HEIGHTS, DOWNTOWN)).toBeGreaterThan(3.3);
    expect(distanceMiles(HEIGHTS, DOWNTOWN)).toBeLessThan(4.1);
  });

  it("Heights → NRG Stadium is ~8.0 mi", () => {
    // Great-circle Heights → NRG is ~7.9-8.1 mi.
    expect(distanceMiles(HEIGHTS, NRG)).toBeGreaterThan(7.5);
    expect(distanceMiles(HEIGHTS, NRG)).toBeLessThan(8.5);
  });

  it("is symmetric", () => {
    const a = distanceMiles(HEIGHTS, NRG);
    const b = distanceMiles(NRG, HEIGHTS);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe("boundingBoxMiles", () => {
  it("contains the center", () => {
    const bb = boundingBoxMiles(HEIGHTS, 3);
    expect(HEIGHTS.lat).toBeGreaterThanOrEqual(bb.minLat);
    expect(HEIGHTS.lat).toBeLessThanOrEqual(bb.maxLat);
    expect(HEIGHTS.lng).toBeGreaterThanOrEqual(bb.minLng);
    expect(HEIGHTS.lng).toBeLessThanOrEqual(bb.maxLng);
  });

  it("contains every point within the radius (soundness)", () => {
    const bb = boundingBoxMiles(HEIGHTS, 5);
    // Downtown is ~3.7 mi from Heights → inside a 5-mi radius, so must
    // be inside the bounding box too.
    expect(DOWNTOWN.lat).toBeGreaterThanOrEqual(bb.minLat);
    expect(DOWNTOWN.lat).toBeLessThanOrEqual(bb.maxLat);
    expect(DOWNTOWN.lng).toBeGreaterThanOrEqual(bb.minLng);
    expect(DOWNTOWN.lng).toBeLessThanOrEqual(bb.maxLng);
  });

  it("excludes points obviously outside the radius", () => {
    const bb = boundingBoxMiles(HEIGHTS, 3);
    // Memorial City is ~7 mi west of Heights → outside a 3-mi radius,
    // and (importantly for the bbox prefilter) outside the bounding
    // box on the longitude axis.
    const outsideLng =
      MEMORIAL_CITY.lng < bb.minLng || MEMORIAL_CITY.lng > bb.maxLng;
    expect(outsideLng).toBe(true);
  });

  it("scales linearly with radius", () => {
    const bb1 = boundingBoxMiles(HEIGHTS, 1);
    const bb10 = boundingBoxMiles(HEIGHTS, 10);
    const latSpan1 = bb1.maxLat - bb1.minLat;
    const latSpan10 = bb10.maxLat - bb10.minLat;
    expect(latSpan10 / latSpan1).toBeCloseTo(10, 5);
  });
});

describe("centroidForZip", () => {
  it("resolves 77008 to Heights", () => {
    const c = centroidForZip("77008");
    expect(c).not.toBeNull();
    expect(c!.lat).toBeCloseTo(HEIGHTS.lat, 3);
    expect(c!.lng).toBeCloseTo(HEIGHTS.lng, 3);
  });

  it("is tolerant of ZIP+4", () => {
    const c = centroidForZip("77008-1234");
    expect(c).not.toBeNull();
    expect(c!.lat).toBeCloseTo(HEIGHTS.lat, 3);
  });

  it("returns null for unknown ZIPs", () => {
    expect(centroidForZip("99999")).toBeNull();
    expect(centroidForZip("")).toBeNull();
  });
});

describe("isValidLatLng", () => {
  it("accepts real coordinates", () => {
    expect(isValidLatLng(HEIGHTS)).toBe(true);
  });
  it("rejects out-of-range", () => {
    expect(isValidLatLng({ lat: 91, lng: 0 })).toBe(false);
    expect(isValidLatLng({ lat: 0, lng: -181 })).toBe(false);
  });
  it("rejects NaN and Infinity", () => {
    expect(isValidLatLng({ lat: NaN, lng: 0 })).toBe(false);
    expect(isValidLatLng({ lat: 0, lng: Infinity })).toBe(false);
  });
  it("rejects missing fields", () => {
    expect(isValidLatLng({ lat: 29 } as any)).toBe(false);
    expect(isValidLatLng({} as any)).toBe(false);
  });
});
