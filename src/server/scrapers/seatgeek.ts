import axios from "axios";
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";

interface SeatGeekEvent {
  id: number;
  title: string;
  description?: string;
  datetime_utc: string;
  datetime_local: string;
  url: string;
  performers: Array<{
    name: string;
    image?: string;
  }>;
  venue: {
    name: string;
    display_location: string;
    address?: string;
    city?: string;
    state?: string;
  };
  type: string;
  stats: {
    lowest_price?: number;
    highest_price?: number;
  };
}

export async function scrapeSeatGeek(): Promise<NewEvent[]> {
  const clientId = process.env.SEATGEEK_CLIENT_ID?.trim();

  if (!clientId) {
    logger.warn("SeatGeek Client ID not configured, skipping scraper");
    return [];
  }

  try {
    logger.info("Starting SeatGeek scraper for Houston events");

    // Get this Friday and Sunday
    const today = new Date();
    const friday = getNextFriday(today);
    const sunday = new Date(friday);
    sunday.setDate(sunday.getDate() + 2);

    // SeatGeek uses datetime_utc for filtering
    const response = await axios.get("https://api.seatgeek.com/2/events", {
      params: {
        client_id: clientId,
        lat: "29.7604",
        lon: "-95.3698",
        range: "25mi",
        "datetime_utc.gte": friday.toISOString(),
        "datetime_utc.lte": sunday.toISOString(),
        per_page: 100,
        sort: "datetime_utc.asc",
      },
    });

    const events: NewEvent[] = [];
    const rawEvents = response.data.events || [];

    logger.info(`Found ${rawEvents.length} SeatGeek events`);

    for (const event of rawEvents as SeatGeekEvent[]) {
      try {
        const location = event.venue.city && event.venue.state
          ? `${event.venue.city}, ${event.venue.state}`
          : event.venue.display_location;

        const startDate = new Date(event.datetime_local);

        // SeatGeek prices are in dollars (convert to cents)
        const priceMin = event.stats.lowest_price
          ? Math.round(event.stats.lowest_price * 100)
          : undefined;
        const priceMax = event.stats.highest_price
          ? Math.round(event.stats.highest_price * 100)
          : undefined;

        const isFree = !priceMin || priceMin === 0;

        // Get the best performer image
        const imageUrl = event.performers?.[0]?.image;

        const newEvent: NewEvent = {
          title: event.title,
          description: event.description,
          startDate,
          location,
          venue: event.venue.name,
          address: event.venue.address,
          url: event.url,
          imageUrl,
          source: "seatgeek",
          category: event.type?.toLowerCase(),
          priceMin,
          priceMax,
          isFree,
          externalId: event.id.toString(),
          uniqueKey: generateEventHash(event.title, startDate, location),
        };

        events.push(newEvent);
      } catch (error) {
        logger.error("Error parsing SeatGeek event", { error, event });
      }
    }

    logger.info(`Successfully parsed ${events.length} SeatGeek events`);
    return events;
  } catch (error) {
    logger.error("Failed to scrape SeatGeek", { error });
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
