import axios from "axios";
import * as cheerio from "cheerio";
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";

/**
 * Scrapes events from Do713.com - Houston's premier local events website
 * Do713 is the most popular resource for Houston locals to discover events
 */
export async function scrapeDo713(): Promise<NewEvent[]> {
  try {
    logger.info("Starting Do713 scraper for Houston events");

    const events: NewEvent[] = [];

    // Get this Friday's events from Do713
    // Note: Do713 now uses date-specific URLs: /events/YYYY/MM/DD
    const friday = getNextFriday(new Date());
    const year = friday.getFullYear();
    const month = friday.getMonth() + 1;
    const day = friday.getDate();

    const response = await axios.get(`https://do713.com/events/${year}/${month}/${day}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);

    // Do713 uses a card-based layout for events
    $("article.event-card, .event-item, [class*='event']").each((_, element) => {
      try {
        const $el = $(element);

        // Extract title
        const title = $el.find("h2, h3, .event-title, [class*='title']").first().text().trim();
        if (!title || title.length < 3) return;

        // Extract URL
        const urlPath = $el.find("a").first().attr("href");
        if (!urlPath) return;
        const url = urlPath.startsWith("http") ? urlPath : `https://www.do713.com${urlPath}`;

        // Extract date/time
        const dateText = $el.find(".event-date, .date, time, [class*='date']").first().text().trim();
        let startDate = parseDo713Date(dateText);
        if (!startDate) return;

        // Extract venue/location
        const venue = $el.find(".event-venue, .venue, [class*='venue']").first().text().trim();
        const location = venue ? `${venue}, Houston, TX` : "Houston, TX";

        // Extract image
        const imageUrl = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src");
        const fullImageUrl = imageUrl && imageUrl.startsWith("http")
          ? imageUrl
          : imageUrl
          ? `https://www.do713.com${imageUrl}`
          : undefined;

        // Extract description
        const description = $el.find(".event-description, .description, p").first().text().trim();

        // Extract category
        const categoryText = $el.find(".event-category, .category, [class*='category']").first().text().trim().toLowerCase();
        const category = mapCategory(categoryText);

        // Check if free
        const priceText = $el.find(".price, [class*='price']").text().toLowerCase();
        const isFree = priceText.includes("free") || priceText.includes("$0");

        const newEvent: NewEvent = {
          title,
          description: description || undefined,
          startDate,
          location,
          venue: venue || undefined,
          url,
          imageUrl: fullImageUrl,
          source: "do713",
          category,
          isFree,
          uniqueKey: generateEventHash(title, startDate, location),
        };

        events.push(newEvent);
      } catch (error) {
        logger.debug("Error parsing Do713 event", { error });
      }
    });

    logger.info(`Successfully scraped ${events.length} Do713 events`);
    return events;
  } catch (error) {
    logger.error("Failed to scrape Do713", {
      error: error instanceof Error ? error.message : String(error),
      errorDetails: error,
    });
    return [];
  }
}

/**
 * Parse Do713 date formats
 * Examples: "Today at 7:00 PM", "Tomorrow at 8:00 PM", "Friday, Dec 6 at 9:00 PM"
 */
function parseDo713Date(dateText: string): Date | null {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Handle "Today" or "Tonight"
    if (dateText.toLowerCase().includes("today") || dateText.toLowerCase().includes("tonight")) {
      const timeMatch = dateText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const isPM = timeMatch[3].toLowerCase() === "pm";
        const hour24 = isPM && hours !== 12 ? hours + 12 : !isPM && hours === 12 ? 0 : hours;

        const date = new Date(today);
        date.setHours(hour24, minutes, 0, 0);
        return date;
      }
      return today;
    }

    // Handle "Tomorrow"
    if (dateText.toLowerCase().includes("tomorrow")) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const timeMatch = dateText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const isPM = timeMatch[3].toLowerCase() === "pm";
        const hour24 = isPM && hours !== 12 ? hours + 12 : !isPM && hours === 12 ? 0 : hours;

        tomorrow.setHours(hour24, minutes, 0, 0);
        return tomorrow;
      }
      return tomorrow;
    }

    // Handle day names (Monday, Tuesday, etc.)
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const lowerDateText = dateText.toLowerCase();

    for (let i = 0; i < daysOfWeek.length; i++) {
      if (lowerDateText.includes(daysOfWeek[i])) {
        const targetDay = i;
        const currentDay = now.getDay();
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7;

        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + daysToAdd);

        const timeMatch = dateText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const isPM = timeMatch[3].toLowerCase() === "pm";
          const hour24 = isPM && hours !== 12 ? hours + 12 : !isPM && hours === 12 ? 0 : hours;

          targetDate.setHours(hour24, minutes, 0, 0);
        }
        return targetDate;
      }
    }

    // Try parsing as a standard date
    const parsedDate = new Date(dateText);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }

    return null;
  } catch (error) {
    logger.debug("Failed to parse Do713 date", { dateText, error });
    return null;
  }
}

/**
 * Map Do713 categories to our standard categories
 */
function mapCategory(categoryText: string): string | undefined {
  const lower = categoryText.toLowerCase();

  if (lower.includes("music") || lower.includes("concert")) return "music";
  if (lower.includes("food") || lower.includes("dining")) return "food";
  if (lower.includes("art") || lower.includes("gallery")) return "arts";
  if (lower.includes("sport") || lower.includes("game")) return "sports";
  if (lower.includes("comedy") || lower.includes("theatre") || lower.includes("theater")) return "arts";
  if (lower.includes("festival") || lower.includes("market")) return "festival";
  if (lower.includes("family") || lower.includes("kids")) return "family";

  return undefined;
}

/**
 * Get the next Friday from a given date
 */
function getNextFriday(from: Date): Date {
  const result = new Date(from);
  const dayOfWeek = result.getDay();
  const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
  result.setDate(result.getDate() + daysUntilFriday);
  result.setHours(0, 0, 0, 0);
  return result;
}
