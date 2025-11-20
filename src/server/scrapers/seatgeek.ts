import axios from "axios";
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";

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
  const clientId = process.env.SEATGEEK_API_KEY?.trim();
  if (!clientId) {
    logger.warn("Seatgeek API key not configured, skipping scraper");
    return [];
  }

  try {
    logger.info("Starting Seatgeek scraper for Houston events");

    // Get this Friday and Sunday
    const today = new Date();
    const friday = getNextFriday(today);
    const sunday = new Date(friday);
    sunday.setDate(sunday.getDate() + 2);
    sunday.setHours(23, 59, 59);

    // Format dates for Seatgeek API (ISO format with time)
    const startDate = friday.toISOString();
    const endDate = sunday.toISOString();

    // Houston coordinates
    const response = await axios.get(
      "https://api.seatgeek.com/2/events",
      {
        params: {
          client_id: clientId,
          lat: "29.7604",
          lon: "-95.3698",
          range: "25mi",
          "datetime_utc.gte": startDate,
          "datetime_utc.lte": endDate,
          per_page: 100,
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

function getNextFriday(from: Date): Date {
  const result = new Date(from);
  const dayOfWeek = result.getDay();
  const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
  result.setDate(result.getDate() + daysUntilFriday);
  result.setHours(0, 0, 0, 0);
  return result;
}
