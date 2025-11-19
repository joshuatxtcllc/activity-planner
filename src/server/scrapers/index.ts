import "dotenv/config";
import { db } from "../db";
import { events } from "../../shared/schema";
import logger from "../utils/logger";
import { scrapeTicketmaster } from "./ticketmaster";
import { scrapeEventbrite } from "./eventbrite";
import { scrapeGoogle } from "./google";
import { scrapeSeatGeek } from "./seatgeek";
import { eq } from "drizzle-orm";

/**
 * Main scraper orchestrator
 * Runs all scrapers, deduplicates, and saves to database
 */
export async function runAllScrapers(): Promise<{
  total: number;
  new: number;
  duplicates: number;
}> {
  logger.info("🚀 Starting event scraping job");

  try {
    // Run all scrapers in parallel
    const [ticketmasterEvents, eventbriteEvents, googleEvents, seatgeekEvents] =
      await Promise.all([
        scrapeTicketmaster(),
        scrapeEventbrite(),
        scrapeGoogle(),
        scrapeSeatGeek(),
      ]);

    // Combine all events
    const allEvents = [
      ...ticketmasterEvents,
      ...eventbriteEvents,
      ...googleEvents,
      ...seatgeekEvents,
    ];

    logger.info(`Total events scraped: ${allEvents.length}`);

    // Insert events, handling duplicates
    let newCount = 0;
    let duplicateCount = 0;

    for (const event of allEvents) {
      try {
        // Check if event already exists by unique key
        const existing = await db
          .select()
          .from(events)
          .where(eq(events.uniqueKey, event.uniqueKey!))
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
        logger.error("Failed to save event", { error, event: event.title });
      }
    }

    logger.info(`✅ Scraping complete: ${newCount} new, ${duplicateCount} duplicates`);

    return {
      total: allEvents.length,
      new: newCount,
      duplicates: duplicateCount,
    };
  } catch (error) {
    logger.error("Scraping job failed", { error });
    throw error;
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllScrapers()
    .then((result) => {
      console.log("\n📊 Scraping Results:");
      console.log(`   Total scraped: ${result.total}`);
      console.log(`   New events: ${result.new}`);
      console.log(`   Duplicates: ${result.duplicates}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Scraping failed:", error);
      process.exit(1);
    });
}
