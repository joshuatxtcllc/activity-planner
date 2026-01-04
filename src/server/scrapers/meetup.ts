import axios from "axios";
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";
import { getUpcomingWeeksRange } from "../utils/date-utils";

interface MeetupEvent {
  id: string;
  title: string;
  description?: string;
  dateTime: string;
  endTime?: string;
  eventUrl: string;
  venue?: {
    name: string;
    address: string;
    city: string;
    state: string;
  };
  going: number;
  eventType?: string;
  group?: {
    name: string;
    urlname: string;
  };
  images?: Array<{
    baseUrl: string;
  }>;
  isFree?: boolean;
  price?: number;
}

interface MeetupGraphQLResponse {
  data: {
    rankedEvents: {
      edges: Array<{
        node: MeetupEvent;
      }>;
    };
  };
}

/**
 * Scrape events from Meetup.com for Houston area
 * Uses GraphQL API to find local meetups and events
 */
export async function scrapeMeetup(): Promise<NewEvent[]> {
  try {
    logger.info("Starting Meetup scraper for Houston events");

    const events: NewEvent[] = [];
    const { startDate, endDate } = getUpcomingWeeksRange(4);

    // Meetup's GraphQL API (public endpoint)
    // Note: Meetup deprecated their REST API but still has a public GraphQL endpoint
    // However, it may require authentication in the future
    const query = `
      query($lat: Float!, $lon: Float!, $radius: Int!, $startDate: DateTime, $endDate: DateTime) {
        rankedEvents(
          filter: {
            lat: $lat
            lon: $lon
            radius: $radius
            startDateRange: $startDate
            endDateRange: $endDate
          }
          input: {
            first: 100
          }
        ) {
          edges {
            node {
              id
              title
              description
              dateTime
              endTime
              eventUrl
              going
              eventType
              venue {
                name
                address
                city
                state
              }
              group {
                name
                urlname
              }
              images {
                baseUrl
              }
            }
          }
        }
      }
    `;

    try {
      const response = await axios.post<MeetupGraphQLResponse>(
        "https://www.meetup.com/gql",
        {
          query,
          variables: {
            lat: 29.7604,
            lon: -95.3698,
            radius: 40, // 40 km (~25 miles)
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }
        },
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "HoustonEventAggregator/1.0"
          }
        }
      );

      const meetupEvents = response.data?.data?.rankedEvents?.edges || [];
      logger.info(`Found ${meetupEvents.length} Meetup events`);

      for (const edge of meetupEvents) {
        try {
          const event = edge.node;

          const startDate = new Date(event.dateTime);
          const endDate = event.endTime ? new Date(event.endTime) : undefined;

          const location = event.venue
            ? `${event.venue.city}, ${event.venue.state}`
            : "Houston, TX";

          // Categorize based on event type or group name
          let category = "community";
          const groupName = event.group?.name?.toLowerCase() || "";
          const eventTitle = event.title.toLowerCase();

          if (/music|concert|band|dj/i.test(groupName + eventTitle)) {
            category = "music";
          } else if (/food|cooking|restaurant|dinner|brunch/i.test(groupName + eventTitle)) {
            category = "food";
          } else if (/sport|fitness|running|yoga|hiking|cycling/i.test(groupName + eventTitle)) {
            category = "fitness";
          } else if (/tech|coding|programming|developer|startup/i.test(groupName + eventTitle)) {
            category = "community";
          } else if (/art|photography|design|creative/i.test(groupName + eventTitle)) {
            category = "arts";
          } else if (/game|board game|video game/i.test(groupName + eventTitle)) {
            category = "community";
          }

          const newEvent: NewEvent = {
            title: event.title,
            description: event.description,
            startDate,
            endDate,
            location,
            venue: event.venue?.name,
            address: event.venue?.address,
            url: event.eventUrl,
            imageUrl: event.images?.[0]?.baseUrl,
            source: "meetup",
            category,
            isFree: true, // Most Meetup events are free
            externalId: event.id,
            uniqueKey: generateEventHash(event.title, startDate, location),
          };

          events.push(newEvent);
        } catch (error) {
          logger.error("Error parsing Meetup event", { error, event: edge.node });
        }
      }
    } catch (apiError) {
      if (axios.isAxiosError(apiError)) {
        logger.warn("Meetup GraphQL API request failed, trying alternative approach", {
          status: apiError.response?.status,
          message: apiError.message
        });

        // Fallback: Try scraping the public Meetup find page
        // This is less reliable but doesn't require API access
        await scrapeMeetupPublicPage(events, startDate, endDate);
      } else {
        throw apiError;
      }
    }

    logger.info(`Successfully parsed ${events.length} Meetup events`);
    return events;
  } catch (error) {
    logger.error("Failed to scrape Meetup", { error });
    return [];
  }
}

/**
 * Fallback method to scrape Meetup's public search page
 */
async function scrapeMeetupPublicPage(
  events: NewEvent[],
  startDate: Date,
  endDate: Date
): Promise<void> {
  try {
    // Meetup's public find events page
    const response = await axios.get(
      "https://www.meetup.com/find/events/",
      {
        params: {
          location: "Houston, TX",
          source: "EVENTS",
          distance: "twentyFiveMiles"
        },
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; HoustonEventAggregator/1.0)"
        }
      }
    );

    // Try to extract event data from the page
    // Meetup often embeds JSON-LD structured data
    const jsonLdMatch = response.data.match(/<script type="application\/ld\+json">(.*?)<\/script>/gs);

    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        try {
          const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
          const structured = JSON.parse(jsonContent);

          if (structured["@type"] === "Event" || Array.isArray(structured)) {
            const eventList = Array.isArray(structured) ? structured : [structured];

            for (const eventData of eventList) {
              if (eventData["@type"] !== "Event") continue;

              const eventStartDate = new Date(eventData.startDate);
              if (eventStartDate < startDate || eventStartDate > endDate) continue;

              const newEvent: NewEvent = {
                title: eventData.name,
                description: eventData.description,
                startDate: eventStartDate,
                endDate: eventData.endDate ? new Date(eventData.endDate) : undefined,
                location: eventData.location?.address?.addressLocality
                  ? `${eventData.location.address.addressLocality}, ${eventData.location.address.addressRegion}`
                  : "Houston, TX",
                venue: eventData.location?.name,
                address: eventData.location?.address?.streetAddress,
                url: eventData.url || "https://www.meetup.com/find/?location=Houston%2C+TX",
                imageUrl: eventData.image,
                source: "meetup",
                category: "community",
                isFree: true,
                uniqueKey: generateEventHash(eventData.name, eventStartDate, "Houston, TX"),
              };

              events.push(newEvent);
            }
          }
        } catch (parseError) {
          // Continue to next JSON-LD block
          logger.debug("Failed to parse JSON-LD block", { parseError });
        }
      }
    }

    logger.info(`Extracted ${events.length} events from Meetup public page`);
  } catch (error) {
    logger.error("Failed to scrape Meetup public page", { error });
  }
}
