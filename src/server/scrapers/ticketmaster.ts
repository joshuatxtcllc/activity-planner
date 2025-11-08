import axios from "axios";
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";

interface TicketmasterEvent {
  id: string;
  name: string;
  description?: string;
  dates: {
    start: {
      localDate: string;
      localTime?: string;
    };
  };
  _embedded?: {
    venues?: Array<{
      name: string;
      city: { name: string };
      state: { stateCode: string };
      address?: { line1: string };
    }>;
  };
  url: string;
  images?: Array<{ url: string }>;
  classifications?: Array<{
    segment: { name: string };
    genre?: { name: string };
  }>;
  priceRanges?: Array<{
    min: number;
    max: number;
  }>;
}

export async function scrapeTicketmaster(): Promise<NewEvent[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    logger.warn("Ticketmaster API key not configured, skipping scraper");
    return [];
  }

  try {
    logger.info("Starting Ticketmaster scraper for Houston events");

    // Get this Friday and Sunday
    const today = new Date();
    const friday = getNextFriday(today);
    const sunday = new Date(friday);
    sunday.setDate(sunday.getDate() + 2);

    const response = await axios.get(
      "https://app.ticketmaster.com/discovery/v2/events.json",
      {
        params: {
          apikey: apiKey,
          city: "Houston",
          stateCode: "TX",
          startDateTime: friday.toISOString(),
          endDateTime: sunday.toISOString(),
          size: 100,
          sort: "date,asc",
        },
      }
    );

    const events: NewEvent[] = [];
    const rawEvents = response.data._embedded?.events || [];

    logger.info(`Found ${rawEvents.length} Ticketmaster events`);

    for (const event of rawEvents as TicketmasterEvent[]) {
      try {
        const venue = event._embedded?.venues?.[0];
        const location = venue
          ? `${venue.city.name}, ${venue.state.stateCode}`
          : "Houston, TX";

        const startDate = new Date(
          `${event.dates.start.localDate}T${event.dates.start.localTime || "00:00:00"}`
        );

        const priceRange = event.priceRanges?.[0];
        const isFree = !priceRange || priceRange.min === 0;

        const newEvent: NewEvent = {
          title: event.name,
          description: event.description,
          startDate,
          location,
          venue: venue?.name,
          address: venue?.address?.line1,
          url: event.url,
          imageUrl: event.images?.[0]?.url,
          source: "ticketmaster",
          category: event.classifications?.[0]?.segment?.name?.toLowerCase(),
          priceMin: priceRange ? Math.round(priceRange.min * 100) : undefined,
          priceMax: priceRange ? Math.round(priceRange.max * 100) : undefined,
          isFree,
          externalId: event.id,
          uniqueKey: generateEventHash(event.name, startDate, location),
        };

        events.push(newEvent);
      } catch (error) {
        logger.error("Error parsing Ticketmaster event", { error, event });
      }
    }

    logger.info(`Successfully parsed ${events.length} Ticketmaster events`);
    return events;
  } catch (error) {
    logger.error("Failed to scrape Ticketmaster", { error });
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
