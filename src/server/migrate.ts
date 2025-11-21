import { neon } from "@neondatabase/serverless";
import logger from "./utils/logger";

const MIGRATION_SQL = `
-- Create events table
CREATE TABLE IF NOT EXISTS "events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "description" text,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp,
  "location" text NOT NULL,
  "venue" text,
  "address" text,
  "url" text NOT NULL,
  "image_url" text,
  "source" text NOT NULL,
  "category" text,
  "price_min" integer,
  "price_max" integer,
  "is_free" boolean DEFAULT false,
  "external_id" text,
  "scraped_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "unique_key" text UNIQUE
);

-- Create index on start_date for faster queries
CREATE INDEX IF NOT EXISTS "idx_events_start_date" ON "events" ("start_date");

-- Create index on source for filtering
CREATE INDEX IF NOT EXISTS "idx_events_source" ON "events" ("source");

-- Create index on unique_key for faster duplicate checking
CREATE INDEX IF NOT EXISTS "idx_events_unique_key" ON "events" ("unique_key");
`;

/**
 * Run database migrations
 */
export async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    logger.info("Running database migrations...");

    // Execute migration
    await sql(MIGRATION_SQL);

    logger.info("✅ Database migrations completed successfully");
  } catch (error) {
    logger.error("Failed to run migrations", { error });
    throw error;
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      console.log("Migrations complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
