import axios, { type AxiosResponse } from "axios";
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

interface EventCartelEvent {
  id: number;
  title: string;
  url: string;
  location: string;
  place: string | null;
  poster: string | null;
  start_obj: { timestamp: string; date: string; time: string };
  important_info: string | null;
}

interface EventCartelResponse {
  count: number;
  next: string | null;
  results: EventCartelEvent[];
}

const MAX_PAGES = 10;

/**
 * Scrapes Houston events from EventCartel's undocumented public backend API.
 *
 * eventcartel.com itself is a client-side-rendered Next.js app with no event
 * data in its server-rendered HTML, but its frontend JS bundle
 * (pages/_app-*.js) reveals it fetches data from a separate API host,
 * bck.eventcartel.com. That host exposes a browsable DRF-style API root at
 * /api/v2/, including a `public/events/` list endpoint that is reachable
 * with no authentication and supports filtering by city slug (discovered via
 * `city/?search=houston` -> slug "houston").
 */
export async function scrapeEventCartel(): Promise<NewEvent[]> {
  const events: NewEvent[] = [];
  let url: string | null =
    "https://bck.eventcartel.com/api/v2/public/events/?city=houston";
  let page = 0;

  try {
    logger.info("Starting EventCartel scraper for Houston events");

    while (url && page < MAX_PAGES) {
      page++;

      const response: AxiosResponse<EventCartelResponse> = await axios.get<EventCartelResponse>(url, {
        headers: BROWSER_HEADERS,
        timeout: 15000,
      });

      for (const item of response.data.results || []) {
        try {
          if (!item.title || !item.url || !item.start_obj?.timestamp) continue;

          const startDate = new Date(item.start_obj.timestamp);
          if (isNaN(startDate.getTime())) continue;

          const location = item.location || "Houston, TX";

          const newEvent: NewEvent = {
            title: item.title,
            description: item.important_info || undefined,
            startDate,
            location,
            venue: item.place || undefined,
            url: item.url,
            imageUrl: item.poster || undefined,
            source: "eventcartel",
            category: mapCategory(item.url),
            externalId: String(item.id),
            uniqueKey: generateEventHash(item.title, startDate, location),
          };

          events.push(newEvent);
        } catch (error) {
          logger.debug("Error parsing EventCartel event", { error });
        }
      }

      url = response.data.next;
    }

    logger.info(`Successfully scraped ${events.length} EventCartel events`);
  } catch (error) {
    logger.error("Failed to scrape EventCartel", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return events;
}

/**
 * EventCartel event URLs embed the category slug, e.g.
 * https://eventcartel.com/events/concert/... or /events/theater/...
 */
function mapCategory(url: string): string | undefined {
  const match = url.match(/\/events\/([a-z-]+)\//i);
  if (!match) return undefined;

  const slug = match[1].toLowerCase();
  if (slug === "concert") return "music";
  if (slug === "theater") return "arts";
  if (slug === "family") return "family";
  if (slug === "party") return "nightlife";
  if (slug === "sport" || slug === "sports") return "sports";
  if (slug === "festival") return "festival";
  if (slug === "food") return "food";
  return undefined;
}
