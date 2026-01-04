import axios from "axios";
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";
import { getUpcomingWeeksRange } from "../utils/date-utils";

interface SeatgeekEvent {
  id: string;
  title: string;
  short_title: string;
  description?: string;
  datetime_utc: string;
  datetime_local: string;
  url: string;
  venue: {
    name: string;
    address: string;
    city: string;
    state: string;
    extended_address: string;
    location: {
      lat: number;
      lon: number;
    };
  };
  performers?: Array<{
    name: string;
    image: string;
  }>;
  stats?: {
    lowest_price?: number;
    average_price?: number;
    highest_price?: number;
  };
  taxonomy?: {
    name?: string;
  };
  type?: string;
}

export async function scrapeSeatgeek(): Promise<NewEvent[]> {
  // Clean API key (remove whitespace and quotes)
  const clientId = process.env.SEATGEEK_API_KEY?.trim().replace(/^['"]|['"]$/g, '');
  if (!clientId) {
    logger.warn("Seatgeek API key not configured, skipping scraper");
    return [];
  }

  try {
    logger.info("Starting Seatgeek scraper for Houston events");

    // Get upcoming 4 weeks of events
    const { startDate, endDate } = getUpcomingWeeksRange(4);

    // Houston coordinates
    const response = await axios.get(
      "https://api.seatgeek.com/2/events",
      {
        params: {
          client_id: clientId,
          lat: "29.7604",
          lon: "-95.3698",
          range: "25mi",
          "datetime_utc.gte": startDate.toISOString(),
          "datetime_utc.lte": endDate.toISOString(),
          per_page: 200, // Increased to get more events
        },
      }
    );

    const events: NewEvent[] = [];
    const rawEvents = response.data.events || [];

    logger.info(`Found ${rawEvents.length} Seatgeek events`);

    for (const event of rawEvents as SeatgeekEvent[]) {
      try {
        const location = event.venue
          ? `${event.venue.city}, ${event.venue.state}`
          : "Houston, TX";

        // Use datetime_local for display purposes (local to the event)
        const startDate = new Date(event.datetime_local || event.datetime_utc);

        // Seatgeek prices are in dollars, convert to cents
        const lowestPrice = event.stats?.lowest_price;
        const highestPrice = event.stats?.highest_price;
        const isFree = !lowestPrice || lowestPrice === 0;

        const newEvent: NewEvent = {
          title: event.title || event.short_title,
          description: event.description,
          startDate,
          location,
          venue: event.venue?.name,
          address: event.venue?.extended_address || event.venue?.address,
          url: event.url,
          imageUrl: event.performers?.[0]?.image,
          source: "seatgeek",
          category: event.taxonomy?.name?.toLowerCase() || event.type?.toLowerCase(),
          priceMin: lowestPrice ? Math.round(lowestPrice * 100) : undefined,
          priceMax: highestPrice ? Math.round(highestPrice * 100) : undefined,
          isFree,
          externalId: event.id,
          uniqueKey: generateEventHash(event.title || event.short_title, startDate, location),
        };

        events.push(newEvent);
      } catch (error) {
        logger.error("Error parsing Seatgeek event", { error, event });
      }
    }

    logger.info(`Successfully parsed ${events.length} Seatgeek events`);
    return events;
  } catch (error) {
    logger.error("Failed to scrape Seatgeek", { error });
    return [];
  }
}

