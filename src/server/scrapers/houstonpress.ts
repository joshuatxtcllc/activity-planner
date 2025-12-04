import axios from "axios";
import * as cheerio from "cheerio";
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";

/**
 * Scrapes events from Houston Press - Local news and events publication
 * Houston Press has a comprehensive events calendar for the Houston area
 */
export async function scrapeHoustonPress(): Promise<NewEvent[]> {
  try {
    logger.info("Starting Houston Press scraper for Houston events");

    const events: NewEvent[] = [];

    // Get events from Houston Press calendar
    const response = await axios.get("https://www.houstonpress.com/events", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);

    // Houston Press uses event cards
    $("article[class*='event'], .event-card, .calendar-event, [data-event]").each((_, element) => {
      try {
        const $el = $(element);

        // Extract title
        const title =
          $el.find("h2, h3, .event-title, [class*='title']").first().text().trim() ||
          $el.find("a[class*='title']").first().text().trim();

        if (!title || title.length < 3) return;

        // Extract URL
        const urlPath =
          $el.find("a[href*='/events/']").first().attr("href") || $el.find("a").first().attr("href");
        if (!urlPath) return;
        const url = urlPath.startsWith("http")
          ? urlPath
          : `https://www.houstonpress.com${urlPath}`;

        // Extract date
        const dateText =
          $el.find("time, .date, [class*='date']").first().text().trim() ||
          $el.find("time").first().attr("datetime") ||
          "";

        let startDate = parseHoustonPressDate(dateText);
        if (!startDate) return;

        // Extract venue
        const venue =
          $el.find(".venue, [class*='venue']").first().text().trim() ||
          $el.find("address").first().text().trim();
        const location = venue ? `${venue}, Houston, TX` : "Houston, TX";

        // Extract image
        const imageUrl =
          $el.find("img").first().attr("src") ||
          $el.find("img").first().attr("data-src") ||
          $el.find("[style*='background-image']").first().attr("style")?.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1];

        const fullImageUrl =
          imageUrl && imageUrl.startsWith("http")
            ? imageUrl
            : imageUrl
            ? `https://www.houstonpress.com${imageUrl}`
            : undefined;

        // Extract description
        const description =
          $el.find(".description, [class*='description'], p").first().text().trim() ||
          $el.find(".excerpt").first().text().trim();

        // Extract category
        const categoryText =
          $el.find(".category, [class*='category'], .tag").first().text().trim().toLowerCase() ||
          $el.find("a[href*='/category/']").first().text().trim().toLowerCase();
        const category = mapCategory(categoryText);

        // Check if free
        const priceText = $el.text().toLowerCase();
        const isFree = priceText.includes("free admission") || priceText.includes("free event");

        const newEvent: NewEvent = {
          title,
          description: description || undefined,
          startDate,
          location,
          venue: venue || undefined,
          url,
          imageUrl: fullImageUrl,
          source: "houstonpress",
          category,
          isFree,
          uniqueKey: generateEventHash(title, startDate, location),
        };

        events.push(newEvent);
      } catch (error) {
        logger.debug("Error parsing Houston Press event", { error });
      }
    });

    logger.info(`Successfully scraped ${events.length} Houston Press events`);
    return events;
  } catch (error) {
    logger.error("Failed to scrape Houston Press", {
      error: error instanceof Error ? error.message : String(error),
      errorDetails: error,
    });
    return [];
  }
}

/**
 * Parse Houston Press date formats
 */
function parseHoustonPressDate(dateText: string): Date | null {
  try {
    if (!dateText) return null;

    // Try parsing ISO format first (from datetime attribute)
    const isoDate = new Date(dateText);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Handle "Today", "Tonight", "Tomorrow"
    const lowerText = dateText.toLowerCase();

    if (lowerText.includes("today") || lowerText.includes("tonight")) {
      const timeMatch = dateText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        const date = new Date(today);
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const isPM = timeMatch[3].toLowerCase() === "pm";
        const hour24 = isPM && hours !== 12 ? hours + 12 : !isPM && hours === 12 ? 0 : hours;
        date.setHours(hour24, minutes, 0, 0);
        return date;
      }
      return today;
    }

    if (lowerText.includes("tomorrow")) {
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

    // Try parsing common date formats
    // "December 6, 2025", "Dec 6, 2025", "12/6/2025"
    const monthNames = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];

    for (let i = 0; i < monthNames.length; i++) {
      if (lowerText.includes(monthNames[i]) || lowerText.includes(monthNames[i].substring(0, 3))) {
        // Try to extract day and year
        const dayMatch = dateText.match(/(\d{1,2})/);
        const yearMatch = dateText.match(/(\d{4})/);

        if (dayMatch) {
          const day = parseInt(dayMatch[1]);
          const year = yearMatch ? parseInt(yearMatch[1]) : now.getFullYear();
          const date = new Date(year, i, day);

          // Try to extract time
          const timeMatch = dateText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (timeMatch) {
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const isPM = timeMatch[3].toLowerCase() === "pm";
            const hour24 = isPM && hours !== 12 ? hours + 12 : !isPM && hours === 12 ? 0 : hours;
            date.setHours(hour24, minutes, 0, 0);
          }

          return date;
        }
      }
    }

    return null;
  } catch (error) {
    logger.debug("Failed to parse Houston Press date", { dateText, error });
    return null;
  }
}

/**
 * Map Houston Press categories to our standard categories
 */
function mapCategory(categoryText: string): string | undefined {
  const lower = categoryText.toLowerCase();

  if (lower.includes("music") || lower.includes("concert") || lower.includes("band")) return "music";
  if (lower.includes("food") || lower.includes("dining") || lower.includes("restaurant"))
    return "food";
  if (lower.includes("art") || lower.includes("gallery") || lower.includes("exhibit"))
    return "arts";
  if (lower.includes("sport") || lower.includes("game")) return "sports";
  if (
    lower.includes("comedy") ||
    lower.includes("theatre") ||
    lower.includes("theater") ||
    lower.includes("performance")
  )
    return "arts";
  if (lower.includes("festival") || lower.includes("fair")) return "festival";
  if (lower.includes("family") || lower.includes("kids") || lower.includes("children"))
    return "family";
  if (lower.includes("nightlife") || lower.includes("bar") || lower.includes("club"))
    return "nightlife";

  return undefined;
}
