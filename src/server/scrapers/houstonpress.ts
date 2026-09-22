import axios from "axios";
import * as cheerio from "cheerio";
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";

/**
 * Scrapes events from Houston Press's community events calendar
 * (community.houstonpress.com uses a Foundation/UIKit events widget)
 */
export async function scrapeHoustonPress(): Promise<NewEvent[]> {
  try {
    logger.info("Starting Houston Press scraper for Houston events");
    const events: NewEvent[] = [];

    const response = await axios.get("https://community.houstonpress.com/houston/EventSearch", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);

    $("li.fdn-pres-item").each((_, element) => {
      try {
        const $el = $(element);

        const titleLink = $el.find(".fdn-teaser-headline a").first();
        const title = titleLink.text().trim();
        if (!title) return;

        const href = titleLink.attr("href") || "";
        const url = href.startsWith("http") ? href : `https://community.houstonpress.com${href}`;

        const dateText = $el.find(".fdn-teaser-subheadline").first().text().trim();
        const startDate = parseHoustonPressDate(dateText);
        if (!startDate) return;

        const venue = $el.find(".fdn-event-teaser-location-link").first().text().trim() || "Houston, TX";
        const address = $el
          .find(".fdn-event-teaser-location-link")
          .first()
          .parent()
          .find("span")
          .first()
          .text()
          .trim();

        const description = $el.find(".fdn-teaser-description").first().text().trim();

        const tags = $el
          .find(".fdn-teaser-tag-link")
          .map((_i, t) => $(t).text().trim())
          .get();
        const category = mapCategory(tags.join(" "));

        const imageUrl = $el.find(".fdn-event-search-image-block img").first().attr("src") || undefined;

        const location = "Houston, TX";

        const newEvent: NewEvent = {
          title,
          description: description || undefined,
          startDate,
          location,
          venue,
          address: address || undefined,
          url,
          imageUrl,
          source: "houstonpress",
          category,
          uniqueKey: generateEventHash(title, startDate, location),
        };

        events.push(newEvent);
      } catch (error) {
        logger.debug("Failed to parse Houston Press event item", { error });
      }
    });

    logger.info(`Successfully parsed ${events.length} Houston Press events`);
    return events;
  } catch (error) {
    logger.error("Failed to scrape Houston Press", { error });
    return [];
  }
}

/**
 * Parse Houston Press date text like "Fri., July 10, 9 a.m.-3 p.m.", "Sat., July 11",
 * "Today, 7 p.m.", or "Tomorrow"
 */
function parseHoustonPressDate(dateText: string): Date | null {
  try {
    if (!dateText) return null;

    const lower = dateText.toLowerCase();
    const now = new Date();

    const timeMatch = dateText.match(/(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s?m\.?/i);
    const applyTime = (date: Date) => {
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const isPM = timeMatch[3].toLowerCase() === "p";
        const hour24 = isPM && hours !== 12 ? hours + 12 : !isPM && hours === 12 ? 0 : hours;
        date.setHours(hour24, minutes, 0, 0);
      } else {
        date.setHours(9, 0, 0, 0);
      }
      return date;
    };

    if (lower.includes("today") || lower.includes("tonight")) {
      return applyTime(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    }

    if (lower.includes("tomorrow")) {
      return applyTime(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    }

    const monthNames = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december",
    ];

    for (let i = 0; i < monthNames.length; i++) {
      const month = monthNames[i];
      if (lower.includes(month) || lower.includes(month.substring(0, 3) + ".") || lower.includes(month.substring(0, 3))) {
        const dayMatch = dateText.match(/\b(\d{1,2})\b/);
        if (!dayMatch) continue;
        const day = parseInt(dayMatch[1]);
        let year = now.getFullYear();
        let date = new Date(year, i, day);

        if (date.getTime() < now.getTime() - 60 * 24 * 60 * 60 * 1000) {
          date = new Date(year + 1, i, day);
        }

        return applyTime(date);
      }
    }

    return null;
  } catch (error) {
    logger.debug("Failed to parse Houston Press date", { dateText, error });
    return null;
  }
}

/**
 * Map Houston Press tags/categories to our standard categories
 */
function mapCategory(categoryText: string): string | undefined {
  const lower = categoryText.toLowerCase();

  // Match game-night first so "trivia night" doesn't get swallowed by
  // the broader "sport|game" check below.
  if (
    lower.includes("bingo") ||
    lower.includes("trivia") ||
    lower.includes("karaoke") ||
    lower.includes("board game") ||
    lower.includes("game night") ||
    lower.includes("pub games")
  )
    return "game_night";
  if (lower.includes("comedy") || lower.includes("stand-up") || lower.includes("standup")) return "comedy";
  if (lower.includes("music") || lower.includes("concert") || lower.includes("band")) return "music";
  if (lower.includes("food") || lower.includes("dining") || lower.includes("restaurant")) return "food";
  if (lower.includes("art") || lower.includes("gallery") || lower.includes("exhibit")) return "arts";
  if (lower.includes("sport") || lower.includes("game")) return "sports";
  if (
    lower.includes("theatre") ||
    lower.includes("theater") ||
    lower.includes("performance")
  )
    return "arts";
  if (lower.includes("festival") || lower.includes("fair")) return "festival";
  if (lower.includes("family") || lower.includes("kids") || lower.includes("children")) return "family";
  if (lower.includes("nightlife") || lower.includes("bar") || lower.includes("club")) return "nightlife";

  return undefined;
}
