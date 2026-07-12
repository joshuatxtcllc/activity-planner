import axios from "axios";
import * as cheerio from "cheerio";
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const ZOO_LOCATION = "Houston Zoo, 6200 Hermann Park Dr, Houston, TX 77030";

/**
 * Scrapes upcoming special events from the Houston Zoo's "Calendar of Events"
 * page. Unlike the site's /events/ archive (which mixes old and new posts and
 * shows stale post dates rather than real event dates), this calendar page
 * only surfaces currently relevant events, each with real date/time text.
 *
 * Note: this page returns a stripped-down response (missing dynamic content)
 * to requests that don't look like a real browser, so full browser-like
 * headers are required.
 */
export async function scrapeHoustonZoo(): Promise<NewEvent[]> {
  const events: NewEvent[] = [];

  try {
    logger.info("Starting Houston Zoo scraper");

    const response = await axios.get("https://www.houstonzoo.org/plan-your-visit/calendar/", {
      headers: BROWSER_HEADERS,
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const seen = new Set<string>();

    $("a.card").each((_, element) => {
      try {
        const $el = $(element);
        const url = $el.attr("href") || "";
        const title = $el.find(".cardContent h2").first().text().trim();
        const dateText = $el.find(".cardContent .date").first().text().trim();

        if (!url || !title || !dateText || seen.has(url)) return;
        seen.add(url);

        const startDate = parseZooDateText(dateText);
        if (!startDate) return;

        const imageUrl =
          $el.find("img").first().attr("data-src") ||
          $el.find("img").first().attr("src") ||
          undefined;

        const newEvent: NewEvent = {
          title,
          description: `${title} at the Houston Zoo (${dateText}). Included with Zoo admission unless noted otherwise.`,
          startDate,
          location: ZOO_LOCATION,
          venue: "Houston Zoo",
          address: "6200 Hermann Park Dr, Houston, TX 77030",
          url,
          imageUrl,
          source: "houstonzoo",
          category: mapCategory(title),
          isFree: /\bfree\b/i.test(title),
          uniqueKey: generateEventHash(title, startDate, ZOO_LOCATION),
        };

        events.push(newEvent);
      } catch (error) {
        logger.debug("Error parsing Houston Zoo event", { error });
      }
    });

    logger.info(`Successfully scraped ${events.length} Houston Zoo events`);
  } catch (error) {
    logger.error("Failed to scrape Houston Zoo", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return events;
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/**
 * Parses the loosely-formatted date/time text shown on Houston Zoo event
 * cards, e.g. "Saturday, July 18, 2026, 9:00 a.m. to 5:00 p.m." or
 * "Saturday, Nov. 7, 6:00 p.m. to midnight" or "Saturday, August 15 at 7:45 a.m."
 * For date ranges, the last mentioned date is used so multi-day/ongoing
 * events keep showing as upcoming until they actually end.
 */
function parseZooDateText(text: string): Date | null {
  const monthDayPattern =
    /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})/gi;
  const matches = [...text.matchAll(monthDayPattern)];
  if (matches.length === 0) return null;

  const last = matches[matches.length - 1];
  const month = MONTHS[last[1].toLowerCase()];
  if (month === undefined) return null;
  const day = parseInt(last[2], 10);

  const yearMatch = text.match(/\b(20\d{2})\b/);
  const now = new Date();
  const year = yearMatch ? parseInt(yearMatch[1], 10) : now.getFullYear();

  let hours = 9;
  let minutes = 0;
  const timeMatches = [...text.matchAll(/(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?/gi)];
  if (timeMatches.length > 0) {
    const first = timeMatches[0];
    let h = parseInt(first[1], 10);
    const m = first[2] ? parseInt(first[2], 10) : 0;
    const isPM = first[3].toLowerCase() === "p";
    if (isPM && h !== 12) h += 12;
    if (!isPM && h === 12) h = 0;
    hours = h;
    minutes = m;
  }

  const date = new Date(year, month, day, hours, minutes, 0, 0);

  if (!yearMatch) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 3);
    if (date < cutoff) {
      date.setFullYear(date.getFullYear() + 1);
    }
  }

  return isNaN(date.getTime()) ? null : date;
}

function mapCategory(title: string): string | undefined {
  const lower = title.toLowerCase();
  if (lower.includes("ball") || lower.includes("gala")) return "nightlife";
  if (lower.includes("member")) return "family";
  if (lower.includes("pilates") || lower.includes("yoga")) return "sports";
  if (lower.includes("movie")) return "arts";
  return "family";
}
