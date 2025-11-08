import axios from "axios";
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";

interface EventbriteEvent {
  id: string;
  name: { text: string };
  description: { text?: string };
  start: { local: string; timezone: string };
  end: { local: string; timezone: string };
  url: string;
  logo?: { url: string };
  venue?: {
    name: string;
    address: {
      city: string;
      region: string;
      localized_address_display: string;
    };
  };
  is_free: boolean;
  ticket_availability?: {
    minimum_ticket_price?: {
      major_value: number;
      currency: string;
    };
    maximum_ticket_price?: {
      major_value: number;
      currency: string;
    };
  };
}

export async function scrapeEventbrite(): Promise<NewEvent[]> {
  const apiKey = process.env.EVENTBRITE_API_KEY;
  if (!apiKey) {
    logger.warn("Eventbrite API key not configured, skipping scraper");
    return [];
  }

  try {
    logger.info("Starting Eventbrite scraper for Houston events");

    // Get this Friday and Sunday
    const today = new Date();
    const friday = getNextFriday(today);
    const sunday = new Date(friday);
    sunday.setDate(sunday.getDate() + 2);

    const response = await axios.get(
      "https://www.eventbriteapi.com/v3/events/search/",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        params: {
          "location.address": "Houston, TX",
          "location.within": "25mi",
          "start_date.range_start": friday.toISOString(),
          "start_date.range_end": sunday.toISOString(),
          expand: "venue,ticket_availability",
          "page_size": 100,
        },
      }
    );

    const events: NewEvent[] = [];
    const rawEvents = response.data.events || [];

    logger.info(`Found ${rawEvents.length} Eventbrite events`);

    for (const event of rawEvents as EventbriteEvent[]) {
      try {
        const location = event.venue
          ? `${event.venue.address.city}, ${event.venue.address.region}`
          : "Houston, TX";

        const startDate = new Date(event.start.local);
        const endDate = event.end?.local ? new Date(event.end.local) : undefined;

        const ticketing = event.ticket_availability;
        const priceMin = ticketing?.minimum_ticket_price?.major_value;
        const priceMax = ticketing?.maximum_ticket_price?.major_value;

        const newEvent: NewEvent = {
          title: event.name.text,
          description: event.description?.text,
          startDate,
          endDate,
          location,
          venue: event.venue?.name,
          address: event.venue?.address.localized_address_display,
          url: event.url,
          imageUrl: event.logo?.url,
          source: "eventbrite",
          isFree: event.is_free,
          priceMin: priceMin ? Math.round(priceMin * 100) : undefined,
          priceMax: priceMax ? Math.round(priceMax * 100) : undefined,
          externalId: event.id,
          uniqueKey: generateEventHash(event.name.text, startDate, location),
        };

        events.push(newEvent);
      } catch (error) {
        logger.error("Error parsing Eventbrite event", { error, event });
      }
    }

    logger.info(`Successfully parsed ${events.length} Eventbrite events`);
    return events;
  } catch (error) {
    logger.error("Failed to scrape Eventbrite", { error });
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
