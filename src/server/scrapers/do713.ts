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

/**
 * Scrapes events from Do713.com - Houston's popular local events aggregator
 * (part of the DoStuff Media network). Do713 serves date-specific pages at
 * /events/YYYY/M/D with all of that day's events rendered server-side.
 */
export async function scrapeDo713(): Promise<NewEvent[]> {
  const events: NewEvent[] = [];
  const dates = getUpcomingWeekendDates();

  for (const date of dates) {
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      logger.info(`Starting Do713 scraper for ${year}-${month}-${day}`);

      const response = await axios.get(`https://do713.com/events/${year}/${month}/${day}`, {
        headers: BROWSER_HEADERS,
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);

      $(".ds-listing.event-card").each((_, element) => {
        try {
          const $el = $(element);

          const titleText = $el.find(".ds-listing-event-title-text").first().text().trim();
          if (!titleText) return;

          const link = $el.find("a.ds-listing-event-title").first();
          const href = link.attr("href") || "";
          const url = href.startsWith("http") ? href : `https://do713.com${href}`;

          const venue = $el.find(".ds-venue-name").first().text().trim() || "Houston, TX";
          const timeText = $el.find(".ds-event-time").first().text().trim();

          const startDate = new Date(year, month - 1, day);
          const timeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (timeMatch) {
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const isPM = timeMatch[3].toLowerCase() === "pm";
            const hour24 = isPM && hours !== 12 ? hours + 12 : !isPM && hours === 12 ? 0 : hours;
            startDate.setHours(hour24, minutes, 0, 0);
          } else {
            startDate.setHours(19, 0, 0, 0);
          }

          const classAttr = $el.attr("class") || "";
          const categoryMatch = classAttr.match(/ds-event-category-([a-z0-9-]+)/i);
          const category = categoryMatch ? mapCategory(categoryMatch[1]) : undefined;

          const isFree = /\bfree\b/i.test($el.text());

          const location = "Houston, TX";

          const newEvent: NewEvent = {
            title: titleText,
            startDate,
            location,
            venue,
            url,
            source: "do713",
            category,
            isFree,
            uniqueKey: generateEventHash(titleText, startDate, location),
          };

          events.push(newEvent);
        } catch (error) {
          logger.debug("Error parsing Do713 event", { error });
        }
      });
    } catch (error) {
      logger.error("Failed to scrape Do713", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info(`Successfully scraped ${events.length} Do713 events`);
  return events;
}

/**
 * Returns the upcoming Friday, Saturday, and Sunday (this weekend)
 */
function getUpcomingWeekendDates(): Date[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;

  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFriday);
  friday.setHours(0, 0, 0, 0);

  const saturday = new Date(friday);
  saturday.setDate(friday.getDate() + 1);

  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);

  return [friday, saturday, sunday];
}

function mapCategory(raw: string): string | undefined {
  const lower = raw.toLowerCase();
  // Game night category maps ahead of "music"/"arts" so a "trivia + live
  // music" tag combination still surfaces as game_night for alert rules.
  if (
    lower.includes("bingo") ||
    lower.includes("trivia") ||
    lower.includes("karaoke") ||
    lower.includes("board game") ||
    lower.includes("game night") ||
    lower.includes("pub games")
  )
    return "game_night";
  if (lower.includes("comedy")) return "comedy";
  if (lower.includes("music")) return "music";
  if (lower.includes("food") || lower.includes("drink")) return "food";
  if (lower.includes("art")) return "arts";
  if (lower.includes("sport")) return "sports";
  if (lower.includes("festival")) return "festival";
  if (lower.includes("family") || lower.includes("kids")) return "family";
  if (lower.includes("nightlife") || lower.includes("bar")) return "nightlife";
  return undefined;
}
