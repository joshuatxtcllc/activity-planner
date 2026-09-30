import { describe, expect, it, vi } from "vitest";

// The seed module imports the DB client; stub it so the pure data can
// be tested without DATABASE_URL.
vi.mock("../db", () => ({ db: {} }));

import { HEIGHTS_INNER_LOOP_VENUES } from "./venue-seed";
import { centroidForZip } from "../services/geo";

const ORIGINAL_SLUGS = ["toyota-center", "house-of-blues-houston", "713-music-hall", "houston-improv"];
const ORIGINAL_NAMES_AND_ALIASES = [
  "Toyota Center", "Toyota Ctr",
  "House of Blues Houston", "HOB Houston", "House of Blues",
  "713 Music Hall", "713 Music", "713MH",
  "Houston Improv", "The Improv Houston", "Improv Houston",
];

describe("Heights / inner-loop venue pack", () => {
  const venues = HEIGHTS_INNER_LOOP_VENUES;

  it("has 13 venues", () => {
    expect(venues).toHaveLength(13);
  });

  it("uses unique, kebab-case slugs that don't collide with the original four", () => {
    const slugs = venues.map((v) => v.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) {
      expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(ORIGINAL_SLUGS).not.toContain(s);
    }
  });

  it("has no alias or name that collides across venues (case-insensitive)", () => {
    const seen = new Map<string, string>();
    const all = [
      ...ORIGINAL_NAMES_AND_ALIASES.map((n) => ({ key: n.toLowerCase(), owner: "original" })),
      ...venues.flatMap((v) =>
        [v.name, ...(v.aliases ?? [])].map((n) => ({ key: n.toLowerCase(), owner: v.slug }))
      ),
    ];
    for (const { key, owner } of all) {
      const prior = seen.get(key);
      if (prior && prior !== owner) {
        throw new Error(`"${key}" is claimed by both ${prior} and ${owner}`);
      }
      seen.set(key, owner);
    }
  });

  it("every address is a full Houston, TX street address", () => {
    for (const v of venues) {
      expect(v.address, v.slug).toMatch(/^\d+ .+, Houston, TX \d{5}$/);
    }
  });

  it("every ZIP resolves in the bundled centroid table (so ZIP queries find them)", () => {
    for (const v of venues) {
      const zip = v.address!.slice(-5);
      expect(centroidForZip(zip), `${v.slug} (${zip})`).not.toBeNull();
    }
  });

  it("every venue has a neighborhood", () => {
    for (const v of venues) {
      expect(v.neighborhood, v.slug).toBeTruthy();
    }
  });

  it("websites, when present, are absolute http(s) URLs", () => {
    for (const v of venues) {
      if (v.website) expect(v.website, v.slug).toMatch(/^https?:\/\//);
    }
  });
});
