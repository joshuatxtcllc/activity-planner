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

const NRG_LOCATION = "NRG Park, One NRG Park, Houston, TX 77054";

/**
 * Scrapes upcoming events from NRG Park's "Events & Tickets" listing page.
 * The page is a server-rendered WordPress site (WPBakery), so the full
 * event list — including multi-day date ranges — is present in the raw HTML.
 */
export async function scrapeNrgPark(): Promise<NewEvent[]> {
  const events: NewEvent[] = [];

  try {
    logger.info("Starting NRG Park scraper");

    const response = await axios.get("https://www.nrgpark.com/events-tickets/", {
      headers: BROWSER_HEADERS,
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const seen = new Set<string>();

    $(".list_wrapper .list_item").each((_, element) => {
      try {
        const $el = $(element);

        const title = $el.find("h2").first().text().trim();
        const url = $el.find("a").first().attr("href") || "";
        if (!title || !url || seen.has(url)) return;
        seen.add(url);

        const startDateText = $el.find(".startdate").first().text().trim();
        const endDateText = $el.find(".enddate").first().text().trim();

        const startDate = parseNrgDate(startDateText);
        if (!startDate) return;

        const endDate = endDateText ? parseNrgDate(endDateText) ?? undefined : undefined;

        const newEvent: NewEvent = {
          title,
          description: `${title} at NRG Park.`,
          startDate,
          endDate,
          location: NRG_LOCATION,
          venue: "NRG Park",
          address: "One NRG Park, Houston, TX 77054",
          url,
          source: "nrgpark",
          category: "other",
          isFree: false,
          uniqueKey: generateEventHash(title, startDate, NRG_LOCATION),
        };

        events.push(newEvent);
      } catch (error) {
        logger.debug("Error parsing NRG Park event", { error });
      }
    });

    logger.info(`Successfully scraped ${events.length} NRG Park events`);
  } catch (error) {
    logger.error("Failed to scrape NRG Park", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return events;
}

/**
 * NRG Park renders dates as "MM/DD/YYYY"
 */
function parseNrgDate(text: string): Date | null {
  const match = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;

  const month = parseInt(match[1], 10) - 1;
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  const date = new Date(year, month, day, 10, 0, 0, 0);
  return isNaN(date.getTime()) ? null : date;
}
