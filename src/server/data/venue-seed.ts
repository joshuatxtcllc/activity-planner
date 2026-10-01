/**
 * Heights + inner-loop venue pack for the watched-venue registry.
 *
 * Addresses were checked against each venue's own site or a major
 * listing (Yelp / TripAdvisor / Apple Maps) in September 2026.
 * Coordinates are deliberately left null: the Places backfill
 * (`enrich_venue_geo`) resolves them to rooftop precision. Seeding ZIP
 * centroids instead would put pins up to a mile off.
 *
 * `primarySource` is null for venues where we haven't confirmed which
 * ticketing platform they use. The scrapers match events to venues by
 * name/alias, so this field is informational only.
 *
 * The four original venues (Toyota Center, House of Blues, 713 Music
 * Hall, Houston Improv) are still seeded by the inline SQL in db.ts.
 */
import { db } from "../db";
import { watchedVenues, type NewWatchedVenue } from "../../shared/schema";
import logger from "../utils/logger";

export type VenueSeed = Pick<
  NewWatchedVenue,
  "slug" | "name" | "aliases" | "address" | "neighborhood" | "website" | "primarySource"
>;

export const HEIGHTS_INNER_LOOP_VENUES: VenueSeed[] = [
  // --- Heights / Northside -------------------------------------------
  {
    slug: "white-oak-music-hall",
    name: "White Oak Music Hall",
    aliases: ["WOMH", "White Oak Music Hall Lawn", "White Oak Upstairs", "White Oak Downstairs"],
    address: "2915 N Main St, Houston, TX 77009",
    neighborhood: "Near Northside",
    website: "https://whiteoakmusichall.com",
    primarySource: null,
  },
  {
    slug: "raven-tower",
    name: "Raven Tower",
    aliases: ["The Raven Tower"],
    address: "310 North St, Houston, TX 77009",
    neighborhood: "Near Northside",
    website: "https://raventower.net",
    primarySource: null,
  },
  {
    slug: "heights-theater",
    name: "The Heights Theater",
    aliases: ["Heights Theater", "Heights Theatre"],
    address: "339 W 19th St, Houston, TX 77008",
    neighborhood: "Heights",
    website: "https://theheightstheater.com",
    primarySource: null,
  },
  {
    slug: "big-star-bar",
    name: "Big Star Bar",
    aliases: ["Big Star"],
    address: "1005 W 19th St, Houston, TX 77008",
    neighborhood: "Heights",
    website: "http://www.bigstarbar.com",
    primarySource: null,
  },
  {
    slug: "eight-row-flint",
    name: "Eight Row Flint",
    aliases: ["8 Row Flint", "8RF"],
    address: "1039 Yale St, Houston, TX 77008",
    neighborhood: "Heights",
    website: "https://www.agricolehospitality.com/eight-row-flint/",
    primarySource: null,
  },
  // --- Washington Ave / Sixth Ward -----------------------------------
  {
    slug: "holler-brewing",
    name: "Holler Brewing",
    aliases: ["Holler Brewing Co", "Holler Beer"],
    address: "2206 Edwards St Ste A, Houston, TX 77007",
    neighborhood: "Sixth Ward",
    website: "https://hollerbeer.com",
    primarySource: null,
  },
  {
    slug: "platypus-brewing",
    name: "Platypus Brewing",
    aliases: ["Platypus Brewing Houston"],
    address: "1902 Washington Ave Ste E, Houston, TX 77007",
    neighborhood: "Washington Ave",
    website: "https://www.platypusbrewing.com",
    primarySource: null,
  },
  // --- Montrose / Upper Kirby ----------------------------------------
  {
    slug: "rudyards-pub",
    name: "Rudyard's British Pub",
    aliases: ["Rudyard's", "Rudyards", "Rudz"],
    address: "2010 Waugh Dr, Houston, TX 77006",
    neighborhood: "Montrose",
    website: null,
    primarySource: null,
  },
  {
    slug: "mcgonigels-mucky-duck",
    name: "McGonigel's Mucky Duck",
    aliases: ["Mucky Duck", "McGonigels"],
    address: "2425 Norfolk St, Houston, TX 77098",
    neighborhood: "Upper Kirby",
    website: "https://www.mcgonigels.com",
    primarySource: null,
  },
  // --- Midtown / Museum District -------------------------------------
  {
    slug: "continental-club-houston",
    name: "The Continental Club",
    aliases: ["Continental Club", "Continental Club Houston"],
    address: "3700 Main St, Houston, TX 77002",
    neighborhood: "Midtown",
    website: "https://continentalclub.com",
    primarySource: null,
  },
  {
    slug: "under-the-radar-brewery",
    name: "Under the Radar Brewery",
    aliases: ["Under the Radar", "UTR Brewery"],
    address: "1506 Truxillo St, Houston, TX 77004",
    neighborhood: "Midtown",
    website: "https://www.undertheradarbrewery.com",
    primarySource: null,
  },
  // --- EaDo ------------------------------------------------------------
  {
    slug: "warehouse-live",
    name: "Warehouse Live",
    aliases: ["Warehouse Live Ballroom", "Warehouse Live Studio"],
    address: "813 St Emanuel St, Houston, TX 77003",
    neighborhood: "EaDo",
    website: null,
    primarySource: null,
  },
  {
    slug: "the-secret-group",
    name: "The Secret Group",
    aliases: ["Secret Group"],
    address: "2101 Polk St, Houston, TX 77003",
    neighborhood: "EaDo",
    website: "https://thesecretgrouphtx.com",
    primarySource: null,
  },
];

/**
 * Insert the venue pack. Idempotent: existing slugs are left alone so
 * any manual edits (or geocoded coordinates) are never overwritten.
 */
export async function seedHeightsInnerLoopVenues(): Promise<number> {
  const inserted = await db
    .insert(watchedVenues)
    .values(HEIGHTS_INNER_LOOP_VENUES)
    .onConflictDoNothing({ target: watchedVenues.slug })
    .returning({ id: watchedVenues.id });
  if (inserted.length > 0) {
    logger.info(`Seeded ${inserted.length} Heights/inner-loop venues`);
  }
  return inserted.length;
}
