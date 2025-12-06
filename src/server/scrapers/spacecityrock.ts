import axios from "axios";
import * as cheerio from "cheerio";
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";

/**
 * Scrapes events from Space City Rock - Houston's indie music scene
 * Space City Rock is the go-to source for local and indie music shows in Houston
 */
export async function scrapeSpaceCityRock(): Promise<NewEvent[]> {
  try {
    logger.info("Starting Space City Rock scraper for Houston music events");

    const events: NewEvent[] = [];

    // Get events from Space City Rock shows calendar
    const response = await axios.get("https://www.spacecityrock.com/shows-2/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);

    // Space City Rock uses a list-based shows format
    $(".show-listing, .event-item, article, [class*='show'], [class*='event']").each((_, element) => {
      try {
        const $el = $(element);

        // Extract title (usually the band/artist name)
        const title =
          $el.find("h2, h3, .band-name, .artist, [class*='title']").first().text().trim() ||
          $el.find(".headliner").first().text().trim() ||
          $el.find("a").first().text().trim();

        if (!title || title.length < 2) return;

        // Extract URL
        const urlPath =
          $el.find("a[href*='/shows/']").first().attr("href") ||
          $el.find("a[href*='/event']").first().attr("href") ||
          $el.find("a").first().attr("href");

        if (!urlPath) return;
        const url = urlPath.startsWith("http")
          ? urlPath
          : `https://www.spacecityrock.com${urlPath}`;

        // Extract date
        const dateText =
          $el.find("time, .date, [class*='date']").first().text().trim() ||
          $el.find("time").first().attr("datetime") ||
          "";

        let startDate = parseSpaceCityRockDate(dateText);
        if (!startDate) return;

        // Extract venue
        const venue =
          $el.find(".venue, [class*='venue']").first().text().trim() ||
          $el.find(".location").first().text().trim();

        const location = venue ? `${venue}, Houston, TX` : "Houston, TX";

        // Extract image
        const imageUrl =
          $el.find("img").first().attr("src") ||
          $el.find("img").first().attr("data-src") ||
          $el.find("[style*='background-image']")
            .first()
            .attr("style")
            ?.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1];

        const fullImageUrl =
          imageUrl && imageUrl.startsWith("http")
            ? imageUrl
            : imageUrl
            ? `https://www.spacecityrock.com${imageUrl}`
            : undefined;

        // Extract description (supporting acts, event details)
        const description =
          $el.find(".description, .support, .lineup, p").first().text().trim() ||
          $el.find(".supporting-acts").first().text().trim();

        // Extract price info
        const priceText = $el.find(".price, [class*='price'], .cost").text().trim();
        let priceMin: number | undefined;
        let priceMax: number | undefined;
        let isFree = false;

        if (priceText) {
          if (priceText.toLowerCase().includes("free") || priceText.includes("$0")) {
            isFree = true;
          } else {
            // Try to extract price: "$10", "$10-$15", "$10 - $15"
            const priceMatch = priceText.match(/\$(\d+)(?:\s*-\s*\$?(\d+))?/);
            if (priceMatch) {
              priceMin = parseInt(priceMatch[1]) * 100; // Convert to cents
              if (priceMatch[2]) {
                priceMax = parseInt(priceMatch[2]) * 100;
              }
            }
          }
        }

        // Space City Rock is primarily music events
        const category = "music";

        const newEvent: NewEvent = {
          title,
          description: description || undefined,
          startDate,
          location,
          venue: venue || undefined,
          url,
          imageUrl: fullImageUrl,
          source: "spacecityrock",
          category,
          isFree,
          priceMin,
          priceMax,
          uniqueKey: generateEventHash(title, startDate, location),
        };

        events.push(newEvent);
      } catch (error) {
        logger.debug("Error parsing Space City Rock event", { error });
      }
    });

    logger.info(`Successfully scraped ${events.length} Space City Rock events`);
    return events;
  } catch (error) {
    logger.error("Failed to scrape Space City Rock", {
      error: error instanceof Error ? error.message : String(error),
      errorDetails: error,
    });
    return [];
  }
}

/**
 * Parse Space City Rock date formats
 */
function parseSpaceCityRockDate(dateText: string): Date | null {
  try {
    if (!dateText) return null;

    // Try parsing ISO format first
    const isoDate = new Date(dateText);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Handle common formats
    const lowerText = dateText.toLowerCase();

    // "Today", "Tonight", "Tomorrow"
    if (lowerText.includes("today") || lowerText.includes("tonight")) {
      const date = new Date(today);
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
      }
      return tomorrow;
    }

    // Day of week parsing
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < daysOfWeek.length; i++) {
      if (lowerText.includes(daysOfWeek[i])) {
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

    // Try month/day format: "Dec 6", "December 6, 2025"
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
      const fullMonth = monthNames[i];
      const shortMonth = fullMonth.substring(0, 3);

      if (lowerText.includes(fullMonth) || lowerText.includes(shortMonth)) {
        const dayMatch = dateText.match(/(\d{1,2})/);
        const yearMatch = dateText.match(/(\d{4})/);

        if (dayMatch) {
          const day = parseInt(dayMatch[1]);
          const year = yearMatch ? parseInt(yearMatch[1]) : now.getFullYear();
          const date = new Date(year, i, day);

          const timeMatch = dateText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (timeMatch) {
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const isPM = timeMatch[3].toLowerCase() === "pm";
            const hour24 = isPM && hours !== 12 ? hours + 12 : !isPM && hours === 12 ? 0 : hours;
            date.setHours(hour24, minutes, 0, 0);
          } else {
            // Default to 8 PM for music shows if no time specified
            date.setHours(20, 0, 0, 0);
          }

          return date;
        }
      }
    }

    return null;
  } catch (error) {
    logger.debug("Failed to parse Space City Rock date", { dateText, error });
    return null;
  }
}
