import axios from "axios";
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";
import { getNextFridays } from "../utils/date-utils";

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

    // Get next 4 Fridays
    const fridays = getNextFridays(4);
    const today = new Date();

    // Expanded search queries for more diverse results
    const queryTemplates = [
      // General events
      "Houston events this weekend",
      "Houston things to do this weekend",
      "Houston weekend activities",
      "Houston events calendar",

      // Music & nightlife
      "Houston concerts",
      "Houston live music",
      "Houston DJ shows",
      "Houston nightlife events",

      // Food & drink
      "Houston food festivals",
      "Houston brewery events",
      "Houston restaurant week",
      "Houston food truck events",

      // Arts & culture
      "Houston art exhibitions",
      "Houston museum events",
      "Houston theater shows",
      "Houston gallery openings",

      // Sports & fitness
      "Houston sports events",
      "Houston running events",
      "Houston fitness classes",
      "Houston outdoor activities",

      // Family & community
      "Houston family events",
      "Houston community gatherings",
      "Houston markets farmers",
      "Houston park events",

      // Seasonal & special
      "Houston festivals",
      "Houston comedy shows",
      "Houston workshops",
      "Houston networking events",
    ];

    const events: NewEvent[] = [];
    const seenUrls = new Set<string>();

    // Randomly select 8 queries to avoid hitting API limits
    const selectedQueries = queryTemplates
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);

    for (const query of selectedQueries) {
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

            // Skip duplicates
            if (seenUrls.has(url)) continue;
            seenUrls.add(url);

            // Try to extract date from snippet or metadata
            const startDate = parseEventDateFromText(description, title, today);

            // Categorize based on query and content
            let category = "other";
            const lowerQuery = query.toLowerCase();
            const lowerTitle = title.toLowerCase();

            if (lowerQuery.includes("concert") || lowerQuery.includes("music") || lowerTitle.includes("concert") || lowerTitle.includes("music")) {
              category = "music";
            } else if (lowerQuery.includes("food") || lowerQuery.includes("restaurant") || lowerTitle.includes("food")) {
              category = "food";
            } else if (lowerQuery.includes("art") || lowerQuery.includes("museum") || lowerQuery.includes("gallery")) {
              category = "arts";
            } else if (lowerQuery.includes("sport") || lowerQuery.includes("fitness") || lowerQuery.includes("running")) {
              category = "fitness";
            } else if (lowerQuery.includes("festival")) {
              category = "culture";
            } else if (lowerQuery.includes("comedy")) {
              category = "comedy";
            }

            // Check if free
            const isFree = /free|no charge|complimentary/i.test(description + title);

            const newEvent: NewEvent = {
              title,
              description,
              startDate,
              location: "Houston, TX",
              url,
              imageUrl: item.pagemap?.cse_image?.[0]?.src,
              source: "google",
              category,
              isFree,
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

/**
 * Parse event date from search result text
 * Tries multiple patterns and falls back to default Friday if parsing fails
 */
function parseEventDateFromText(description: string, title: string, defaultDate: Date): Date {
  const combinedText = `${title} ${description}`.toLowerCase();
  const now = new Date();

  // Pattern 1: Specific dates like "December 31" or "Dec 31, 2025"
  const monthDayPattern = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/i;
  const monthDayMatch = combinedText.match(monthDayPattern);

  if (monthDayMatch) {
    try {
      const monthStr = monthDayMatch[1];
      const day = parseInt(monthDayMatch[2]);
      const year = monthDayMatch[3] ? parseInt(monthDayMatch[3]) : now.getFullYear();

      // Parse month name to number
      const monthMap: Record<string, number> = {
        'january': 0, 'jan': 0,
        'february': 1, 'feb': 1,
        'march': 2, 'mar': 2,
        'april': 3, 'apr': 3,
        'may': 4,
        'june': 5, 'jun': 5,
        'july': 6, 'jul': 6,
        'august': 7, 'aug': 7,
        'september': 8, 'sep': 8, 'sept': 8,
        'october': 9, 'oct': 9,
        'november': 10, 'nov': 10,
        'december': 11, 'dec': 11,
      };

      const month = monthMap[monthStr.toLowerCase()];
      if (month !== undefined) {
        const parsedDate = new Date(year, month, day);
        if (!isNaN(parsedDate.getTime())) {
          logger.debug(`Parsed date from text: ${parsedDate.toISOString()}`);
          return parsedDate;
        }
      }
    } catch (error) {
      logger.debug(`Failed to parse month/day pattern: ${error}`);
    }
  }

  // Pattern 2: Numeric dates like "12/31/2025" or "12-31-2025"
  const numericDatePattern = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/;
  const numericMatch = combinedText.match(numericDatePattern);

  if (numericMatch) {
    try {
      const month = parseInt(numericMatch[1]) - 1; // JS months are 0-indexed
      const day = parseInt(numericMatch[2]);
      const year = parseInt(numericMatch[3]);
      const parsedDate = new Date(year, month, day);

      if (!isNaN(parsedDate.getTime())) {
        logger.debug(`Parsed numeric date: ${parsedDate.toISOString()}`);
        return parsedDate;
      }
    } catch (error) {
      logger.debug(`Failed to parse numeric date pattern: ${error}`);
    }
  }

  // Pattern 3: Day names (Friday, Saturday, Sunday, etc.)
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < dayNames.length; i++) {
    const dayPattern = new RegExp(`\\b(this\\s+)?${dayNames[i]}\\b`, 'i');
    if (dayPattern.test(combinedText)) {
      const targetDay = i;
      const currentDay = now.getDay();

      // Calculate days until target day (next occurrence)
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;

      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysUntil);
      targetDate.setHours(0, 0, 0, 0);

      logger.debug(`Parsed day name to: ${targetDate.toISOString()}`);
      return targetDate;
    }
  }

  // Pattern 4: Relative dates like "today" or "tomorrow"
  if (/\b(today|tonight)\b/i.test(combinedText)) {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    logger.debug(`Parsed relative date (today): ${today.toISOString()}`);
    return today;
  }

  if (/\btomorrow\b/i.test(combinedText)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    logger.debug(`Parsed relative date (tomorrow): ${tomorrow.toISOString()}`);
    return tomorrow;
  }

  // Pattern 5: Check for "this weekend" - use the default Friday
  if (/\b(this\s+)?weekend\b/i.test(combinedText)) {
    logger.debug(`Found 'weekend' keyword, using default: ${defaultDate.toISOString()}`);
    return defaultDate;
  }

  // Fallback: Use default Friday
  logger.debug(`No date pattern matched, using default Friday: ${defaultDate.toISOString()}`);
  return defaultDate;
}

