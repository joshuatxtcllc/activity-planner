import axios from "axios";
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";

interface TripAdvisorPlace {
  title: string;
  rating?: number;
  reviews?: number;
  category?: string;
  description?: string;
  image?: string;
  link?: string;
  location?: string;
  price_level?: string;
  address?: string;
}

interface SerpApiResponse {
  places?: TripAdvisorPlace[];
  search_metadata?: {
    status?: string;
  };
  error?: string;
}

/**
 * Scrapes TripAdvisor attractions and activities using SerpAPI
 * Returns events for popular Houston attractions across upcoming dates
 */
export async function scrapeTripAdvisor(): Promise<NewEvent[]> {
  // Clean API key (remove whitespace and quotes)
  const apiKey = process.env.SERPAPI_API_KEY?.trim().replace(/^['"]|['"]$/g, '');
  if (!apiKey) {
    logger.warn("SerpAPI key not configured, skipping TripAdvisor scraper");
    return [];
  }

  try {
    logger.info("Starting TripAdvisor scraper for Houston attractions");

    const events: NewEvent[] = [];

    // Search for different types of Houston attractions to get diverse results
    const searchQueries = [
      "Houston attractions",
      "Houston things to do",
      "Houston museums",
      "Houston restaurants",
      "Houston nightlife",
    ];

    for (const query of searchQueries) {
      try {
        const response = await axios.get<SerpApiResponse>(
          "https://serpapi.com/search.json",
          {
            params: {
              engine: "tripadvisor",
              q: query,
              ssrc: "a", // Search source parameter
              api_key: apiKey,
            },
            timeout: 15000,
          }
        );

        if (response.data.error) {
          logger.error(`TripAdvisor API error for query "${query}"`, {
            error: response.data.error,
          });
          continue;
        }

        const places = response.data.places || [];
        logger.info(`Found ${places.length} TripAdvisor places for query: ${query}`);

        // Generate events for upcoming dates
        // Since TripAdvisor returns attractions (not time-specific events),
        // we'll create recurring availability entries
        const upcomingDates = generateUpcomingDates(7); // Next 7 days

        for (const place of places) {
          try {
            // Skip if missing essential information
            if (!place.title || !place.link) {
              continue;
            }

            // Determine category
            const category = mapTripAdvisorCategory(place.category || query);

            // Parse price information
            const { priceMin, priceMax, isFree } = parsePriceLevel(place.price_level);

            // Create events for multiple dates (treating attractions as available daily)
            // Limit to 2 upcoming dates per place to avoid database bloat
            for (let i = 0; i < Math.min(upcomingDates.length, 2); i++) {
              const date = upcomingDates[i];

              const newEvent: NewEvent = {
                title: place.title,
                description: place.description || `${place.title} - A popular Houston ${category || 'attraction'}`,
                startDate: date,
                location: place.location || "Houston, TX",
                venue: place.title,
                address: place.address,
                url: place.link,
                imageUrl: place.image,
                source: "tripadvisor",
                category,
                priceMin,
                priceMax,
                isFree,
                externalId: `${place.link}-${date.toISOString().split('T')[0]}`,
                uniqueKey: generateEventHash(
                  place.title,
                  date,
                  place.location || "Houston, TX"
                ),
              };

              events.push(newEvent);
            }
          } catch (error) {
            logger.error("Error parsing TripAdvisor place", { error, place });
          }
        }

        // Add delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logger.error(`Failed to fetch TripAdvisor results for query "${query}"`, { error });
      }
    }

    logger.info(`Successfully parsed ${events.length} TripAdvisor events`);
    return events;
  } catch (error) {
    logger.error("Failed to scrape TripAdvisor", { error });
    return [];
  }
}

/**
 * Generate upcoming dates for attraction availability
 * Returns array of Date objects for the next N days
 */
function generateUpcomingDates(days: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    date.setHours(10, 0, 0, 0); // Set to 10 AM
    dates.push(date);
  }

  return dates;
}

/**
 * Map TripAdvisor categories to our standard categories
 */
function mapTripAdvisorCategory(category: string): string {
  const lowerCategory = category.toLowerCase();

  if (lowerCategory.includes("museum") || lowerCategory.includes("art")) {
    return "arts";
  } else if (lowerCategory.includes("restaurant") || lowerCategory.includes("food") || lowerCategory.includes("dining")) {
    return "food";
  } else if (lowerCategory.includes("nightlife") || lowerCategory.includes("bar") || lowerCategory.includes("club")) {
    return "nightlife";
  } else if (lowerCategory.includes("park") || lowerCategory.includes("outdoor") || lowerCategory.includes("nature")) {
    return "outdoor";
  } else if (lowerCategory.includes("concert") || lowerCategory.includes("music")) {
    return "music";
  } else if (lowerCategory.includes("sport")) {
    return "sports";
  } else if (lowerCategory.includes("theater") || lowerCategory.includes("show")) {
    return "arts";
  } else {
    return "other";
  }
}

/**
 * Parse TripAdvisor price level to our price format
 * Price level format: "$", "$$", "$$$", "$$$$"
 */
function parsePriceLevel(priceLevel?: string): {
  priceMin?: number;
  priceMax?: number;
  isFree: boolean;
} {
  if (!priceLevel || priceLevel.trim() === "") {
    return { isFree: false };
  }

  // Count dollar signs
  const dollarCount = (priceLevel.match(/\$/g) || []).length;

  if (dollarCount === 0) {
    return { isFree: true, priceMin: 0, priceMax: 0 };
  }

  // Estimate price ranges based on dollar signs (in cents)
  // $ = under $10, $$ = $10-25, $$$ = $25-60, $$$$ = $60+
  const priceRanges: { [key: number]: { min: number; max: number } } = {
    1: { min: 500, max: 1000 },    // $5-$10
    2: { min: 1000, max: 2500 },   // $10-$25
    3: { min: 2500, max: 6000 },   // $25-$60
    4: { min: 6000, max: 15000 },  // $60-$150
  };

  const range = priceRanges[Math.min(dollarCount, 4)] || priceRanges[2];

  return {
    priceMin: range.min,
    priceMax: range.max,
    isFree: false,
  };
}
