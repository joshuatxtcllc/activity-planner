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

const HOUSTON_IMPROV_URL = "https://improv.com/houston/";
const CANONICAL_VENUE = "Houston Improv";
const CANONICAL_LOCATION = "Houston, TX";
const CANONICAL_ADDRESS = "7620 Katy Fwy #431, Houston, TX 77024";

/**
 * Parse an Improv date like "Wed, Sep 23" or "Sun, Oct 4" into a Date at 20:00
 * local. Improv omits the year, so if the parsed month is earlier than
 * the current month we assume next year.
 */
function parseImprovDate(text: string): Date | null {
  const match = text.match(/([A-Za-z]{3,9})\s+(\d{1,2})/);
  if (!match) return null;
  const monthKey = match[1].toLowerCase();
  const monthIdx =
    MONTHS[monthKey] ?? MONTHS[monthKey.slice(0, 4)] ?? MONTHS[monthKey.slice(0, 3)];
  const day = parseInt(match[2], 10);
  if (monthIdx === undefined || Number.isNaN(day)) return null;

  const now = new Date();
  const year =
    monthIdx < now.getMonth() ||
    (monthIdx === now.getMonth() && day < now.getDate())
      ? now.getFullYear() + 1
      : now.getFullYear();

  // Improv headliner slot is 20:00 local. Individual ticket pages carry
  // the authoritative time; the alert copy links to the ticket page.
  return new Date(year, monthIdx, day, 20, 0, 0, 0);
}

/**
 * Scrape the Houston Improv show calendar (https://improv.com/houston/).
 *
 * The page has a WordPress "promo" grid at the top with clean anchor
 * cards, plus a full showcase grid below. The showcase grid is emitted
 * with malformed HTML (unbalanced </a> closers) that cheerio can't tree,
 * so we parse the promo anchors via cheerio and back-fill the showcase
 * grid with a regex sweep over the raw HTML. This gives us the widest
 * possible coverage of upcoming shows without a headless browser.
 */
export async function scrapeHoustonImprov(): Promise<NewEvent[]> {
  const events: NewEvent[] = [];
  const seenKeys = new Set<string>();

  try {
    logger.info("Starting Houston Improv scraper");

    const response = await axios.get(HOUSTON_IMPROV_URL, {
      headers: BROWSER_HEADERS,
      timeout: 15000,
    });
    const html: string = response.data;

    // -- Pass 1: promo anchors (cheerio-parseable) --
    const $ = cheerio.load(html);
    $('a[href*="/houston/event/"]').each((_, el) => {
      try {
        const $el = $(el);
        const href = $el.attr("href") || "";
        if (!href) return;
        const url = href.startsWith("http") ? href : `https://improvtx.com${href}`;

        const h3Text = $el.find("h3").first().text().replace(/\s+/g, " ").trim();
        if (!h3Text) return;

        // h3 format: "Wed, Sep 23 | Houston Improv"
        const [dateChunk, ...rest] = h3Text.split("|").map((s) => s.trim());
        const startDate = parseImprovDate(dateChunk);
        if (!startDate) return;

        // Derive a title from the URL slug when the h3 lacks it.
        const slugMatch = href.match(/\/event\/([^/]+)/);
        // Title-case only after ASCII word boundaries so we don't
        // uppercase letters that already follow diacritics (e.g. "ñO").
        const slugTitle = slugMatch
          ? decodeURIComponent(slugMatch[1])
              .replace(/\+/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .replace(/(^|[\s\-"'([])([a-z])/g, (_, pre, c) => pre + c.toUpperCase())
          : "";
        const title = slugTitle || rest.join(" ").trim();
        if (!title) return;

        const key = generateEventHash(title, startDate, CANONICAL_LOCATION);
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        events.push({
          title,
          description: "Stand-up comedy at the Houston Improv.",
          startDate,
          location: CANONICAL_LOCATION,
          venue: CANONICAL_VENUE,
          address: CANONICAL_ADDRESS,
          url,
          source: "houstonimprov",
          category: "comedy",
          uniqueKey: key,
        });
      } catch (error) {
        logger.debug("Improv promo card parse failed", { error });
      }
    });

    // -- Pass 2: showcase grid via regex (HTML is malformed for cheerio) --
    // Anchor + date badge + h3, in that order, within one <a class="item showcase ...">...</a>
    const showcaseRe =
      /<a\s+class="item\s+showcase[^"]*"\s+href="([^"]+)"[\s\S]*?<dt>([A-Za-z]{3,9})<\/dt>\s*<dd>(\d{1,2})[\s\S]*?<h3>([^<]+)<\/h3>/g;
    let m: RegExpExecArray | null;
    while ((m = showcaseRe.exec(html)) !== null) {
      try {
        const href = m[1];
        const monthText = m[2];
        const dayText = m[3];
        const title = m[4].replace(/\s+/g, " ").trim();

        const startDate = parseImprovDate(`${monthText} ${dayText}`);
        if (!startDate || !title) continue;

        const url = href.startsWith("http") ? href : `https://improvtx.com${href}`;
        const key = generateEventHash(title, startDate, CANONICAL_LOCATION);
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        events.push({
          title,
          description: "Stand-up comedy at the Houston Improv.",
          startDate,
          location: CANONICAL_LOCATION,
          venue: CANONICAL_VENUE,
          address: CANONICAL_ADDRESS,
          url,
          source: "houstonimprov",
          category: "comedy",
          uniqueKey: key,
        });
      } catch (error) {
        logger.debug("Improv showcase regex parse failed", { error });
      }
    }

    logger.info(`Successfully parsed ${events.length} Houston Improv events`);
    return events;
  } catch (error) {
    logger.error("Failed to scrape Houston Improv", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
