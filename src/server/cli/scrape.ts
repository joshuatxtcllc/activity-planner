#!/usr/bin/env node
import "dotenv/config";
import { runAllScrapers } from "../scrapers/index.js";

/**
 * CLI script to manually run the event scrapers
 * Usage: npm run scrape
 */
async function main() {
  try {
    console.log("Starting manual scrape...\n");
    const result = await runAllScrapers();

    console.log("\n📊 Scraping Results:");
    console.log(`   Total scraped: ${result.total}`);
    console.log(`   New events: ${result.new}`);
    console.log(`   Duplicates: ${result.duplicates}`);

    process.exit(0);
  } catch (error) {
    console.error("Scraping failed:", error);
    process.exit(1);
  }
}

main();
