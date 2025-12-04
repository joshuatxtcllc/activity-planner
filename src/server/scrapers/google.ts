import axios from "axios";
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";

/**
 * Google Custom Search scraper
 * Searches for Houston events on local event sites
 */
export async function scrapeGoogle(): Promise<NewEvent[]> {
  // Clean API key and search engine ID (remove whitespace and quotes)
  const apiKey = process.env.GOOGLE_API_KEY?.trim().replace(/^['"]|['"]$/g, '');
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID?.trim().replace(/^['"]|['"]$/g, '');

  if (!apiKey || !searchEngineId || searchEngineId === 'your_search_engine_id') {
    logger.warn("Google API credentials not configured properly, skipping scraper");
    return [];
  }

  try {
    logger.info("Starting Google Custom Search for Houston events");

    // Get this Friday and Sunday
    const today = new Date();
    const friday = getNextFriday(today);
    const fridayFormatted = friday.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });

    // Search queries for Houston-specific event sites
    const queries = [
      `Houston events this weekend ${fridayFormatted}`,
      `Houston concerts this weekend`,
      `Houston food events weekend`,
      `Houston festivals ${fridayFormatted}`,
    ];

    const events: NewEvent[] = [];

    for (const query of queries) {
      try {
        const response = await axios.get(
          "https://www.googleapis.com/customsearch/v1",
          {
            params: {
              key: apiKey,
              cx: searchEngineId,
              q: query,
              num: 10,
            },
          }
        );

        const items = response.data.items || [];
        logger.info(`Found ${items.length} results for query: ${query}`);

        // Parse search results
        for (const item of items) {
          try {
            // Extract basic info from search result
            const title = item.title || "Untitled Event";
            const description = item.snippet || "";
            const url = item.link || "";

            // Try to extract date from snippet or metadata
            // const dateMatch = description.match(
            //   /(\w+ \d{1,2}(?:st|nd|rd|th)?)|(\d{1,2}\/\d{1,2}\/\d{4})/
            // );
            // TODO: Parse dates from search results when available

            // Default to this Friday if we can't parse a date
            const startDate = friday;

            const newEvent: NewEvent = {
              title,
              description,
              startDate,
              location: "Houston, TX",
              url,
              imageUrl: item.pagemap?.cse_image?.[0]?.src,
              source: "google",
              uniqueKey: generateEventHash(title, startDate, "Houston, TX"),
            };

            events.push(newEvent);
          } catch (error) {
            logger.error("Error parsing Google search result", {
              error,
              item,
            });
          }
        }
      } catch (error) {
        logger.error(`Failed to search for query: ${query}`, { error });
      }
    }

    logger.info(`Successfully parsed ${events.length} Google search events`);
    return events;
  } catch (error) {
    logger.error("Failed to scrape Google", { error });
    return [];
  }
}

function getNextFriday(from: Date): Date {
  const result = new Date(from);
  const dayOfWeek = result.getDay();
  const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
  result.setDate(result.getDate() + daysUntilFriday);
  result.setHours(0, 0, 0, 0);
  return result;
}
