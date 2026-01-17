import "dotenv/config";
import { db } from "../db";
import { events } from "../../shared/schema";
import logger from "../utils/logger";
import { scrapeTicketmaster } from "./ticketmaster";
import { scrapeEventbrite } from "./eventbrite";
import { scrapeGoogle } from "./google";
import { scrapeSeatgeek } from "./seatgeek";
import { scrapeDo713 } from "./do713";
import { scrapeHoustonPress } from "./houstonpress";
import { scrapeSpaceCityRock } from "./spacecityrock";
import { scrapePerplexity } from "./perplexity";
import { scrapeReddit } from "./reddit";
import { scrapeMeetup } from "./meetup";
import { generateRecurringActivities } from "./recurring-activities";
import { eq } from "drizzle-orm";

/**
 * Main scraper orchestrator
 * Runs all scrapers, deduplicates, and saves to database
 */
export async function runAllScrapers(): Promise<{
  total: number;
  new: number;
  duplicates: number;
  bySource: Record<string, number>;
}> {
  logger.info("🚀 Starting event scraping job");

  try {
    // Run all scrapers in parallel with individual error handling
    const [
      ticketmasterEvents,
      eventbriteEvents,
      googleEvents,
      seatgeekEvents,
      do713Events,
      houstonPressEvents,
      spaceCityRockEvents,
      perplexityEvents,
      redditEvents,
      meetupEvents,
      recurringActivities,
    ] = await Promise.all([
      scrapeTicketmaster().catch(err => {
        logger.error("Ticketmaster scraper failed", { error: err });
        return [];
      }),
      scrapeEventbrite().catch(err => {
        logger.error("Eventbrite scraper failed", { error: err });
        return [];
      }),
      scrapeGoogle().catch(err => {
        logger.error("Google scraper failed", { error: err });
        return [];
      }),
      scrapeSeatgeek().catch(err => {
        logger.error("SeatGeek scraper failed", { error: err });
        return [];
      }),
      scrapeDo713().catch(err => {
        logger.error("Do713 scraper failed", { error: err });
        return [];
      }),
      scrapeHoustonPress().catch(err => {
        logger.error("HoustonPress scraper failed", { error: err });
        return [];
      }),
      scrapeSpaceCityRock().catch(err => {
        logger.error("SpaceCityRock scraper failed", { error: err });
        return [];
      }),
      scrapePerplexity().catch(err => {
        logger.error("Perplexity AI scraper failed", { error: err });
        return [];
      }),
      scrapeReddit().catch(err => {
        logger.error("Reddit scraper failed", { error: err });
        return [];
      }),
      scrapeMeetup().catch(err => {
        logger.error("Meetup scraper failed", { error: err });
        return [];
      }),
      generateRecurringActivities().catch(err => {
        logger.error("Recurring activities generator failed", { error: err });
        return [];
      }),
    ]);

    // Log results per source
    logger.info(`Results by source:
      Ticketmaster: ${ticketmasterEvents.length}
      Eventbrite: ${eventbriteEvents.length}
      Google: ${googleEvents.length}
      SeatGeek: ${seatgeekEvents.length}
      Do713: ${do713Events.length}
      HoustonPress: ${houstonPressEvents.length}
      SpaceCityRock: ${spaceCityRockEvents.length}
      Perplexity AI: ${perplexityEvents.length}
      Reddit: ${redditEvents.length}
      Meetup: ${meetupEvents.length}
      Recurring Activities: ${recurringActivities.length}
    `);

    // Combine all events
    const allEvents = [
      ...ticketmasterEvents,
      ...eventbriteEvents,
      ...googleEvents,
      ...seatgeekEvents,
      ...do713Events,
      ...houstonPressEvents,
      ...spaceCityRockEvents,
      ...perplexityEvents,
      ...redditEvents,
      ...meetupEvents,
      ...recurringActivities,
    ];

    logger.info(`Total events scraped: ${allEvents.length}`);

    // Insert events, handling duplicates
    let newCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;

    for (const event of allEvents) {
      try {
        // Validate required fields before attempting insertion
        if (!event.title || !event.startDate || !event.location || !event.url || !event.source) {
          logger.warn("Skipping event with missing required fields", {
            title: event.title || "MISSING",
            startDate: event.startDate || "MISSING",
            location: event.location || "MISSING",
            url: event.url || "MISSING",
            source: event.source || "MISSING",
          });
          skippedCount++;
          continue;
        }

        // Validate uniqueKey exists
        if (!event.uniqueKey || typeof event.uniqueKey !== "string" || event.uniqueKey.trim().length === 0) {
          logger.warn("Skipping event with missing or invalid uniqueKey", {
            title: event.title,
            source: event.source,
            uniqueKey: event.uniqueKey,
          });
          skippedCount++;
          continue;
        }

        // Check if event already exists by unique key
        const existing = await db
          .select()
          .from(events)
          .where(eq(events.uniqueKey, event.uniqueKey))
          .limit(1);

        if (existing.length > 0) {
          duplicateCount++;
          logger.debug(`Duplicate event skipped: ${event.title}`);
        } else {
          await db.insert(events).values(event);
          newCount++;
          logger.debug(`New event saved: ${event.title}`);
        }
      } catch (error) {
        // Check if this is a constraint violation error
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isConstraintViolation = errorMessage.includes("unique constraint") ||
                                       errorMessage.includes("duplicate key") ||
                                       errorMessage.includes("violates");

        if (isConstraintViolation) {
          logger.error("Database constraint violation - duplicate uniqueKey detected", {
            error: errorMessage,
            title: event.title,
            source: event.source,
            uniqueKey: event.uniqueKey,
            startDate: event.startDate,
            location: event.location,
          });
          duplicateCount++; // Count as duplicate since it already exists
        } else {
          logger.error("Failed to save event", {
            error: errorMessage,
            errorDetails: error,
            title: event.title,
            source: event.source,
            eventData: event,
          });
        }
      }
    }

    logger.info(`✅ Scraping complete: ${newCount} new, ${duplicateCount} duplicates, ${skippedCount} skipped (invalid)`);

    const bySource: Record<string, number> = {
      ticketmaster: ticketmasterEvents.length,
      eventbrite: eventbriteEvents.length,
      google: googleEvents.length,
      seatgeek: seatgeekEvents.length,
      do713: do713Events.length,
      houstonpress: houstonPressEvents.length,
      spacecityrock: spaceCityRockEvents.length,
      perplexity: perplexityEvents.length,
      reddit: redditEvents.length,
      meetup: meetupEvents.length,
      recurring: recurringActivities.length,
    };

    return {
      total: allEvents.length,
      new: newCount,
      duplicates: duplicateCount,
      bySource,
    };
  } catch (error) {
    logger.error("Scraping job failed", { error });
    throw error;
  }
}

// Note: This module should only be executed via:
// - The scheduler (cron job)
// - The /api/scrape endpoint
// - Running `npm run scrape` (which uses tsx directly on this file)
