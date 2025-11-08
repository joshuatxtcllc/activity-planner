import cron from "node-cron";
import logger from "./utils/logger";
import { runAllScrapers } from "./scrapers";
import { sendEventNotification } from "./utils/mailer";

/**
 * Scheduler for automated event scraping
 * Default: Every Friday at 9 AM
 */
export function startScheduler() {
  const schedule = process.env.CRON_SCHEDULE || "0 9 * * 5"; // Friday 9 AM

  logger.info(`Scheduler started with cron: ${schedule}`);

  cron.schedule(schedule, async () => {
    logger.info("⏰ Scheduled scraping job triggered");

    try {
      const result = await runAllScrapers();

      // Send email notification if new events found
      if (result.new > 0) {
        await sendEventNotification(result);
      }
    } catch (error) {
      logger.error("Scheduled scraping job failed", { error });
    }
  });

  logger.info("✅ Scheduler is running");
}
