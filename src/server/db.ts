import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../shared/schema";
import logger from "./utils/logger";

// Lazy initialization - only create connection when first accessed
// This prevents build-time errors on Railway where env vars aren't available during build
let client: ReturnType<typeof postgres> | null = null;
let dbInstance: PostgresJsDatabase<typeof schema> | null = null;

function getClient() {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    const connectionString = process.env.DATABASE_URL;
    client = postgres(connectionString, { max: 10 });
    logger.info("✅ PostgreSQL client initialized");
  }
  return client;
}

function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getClient(), { schema });
  }
  return dbInstance;
}

// Export db as a getter to ensure lazy initialization
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  }
});

// SQL for database migrations
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

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_events_start_date" ON "events" ("start_date");
CREATE INDEX IF NOT EXISTS "idx_events_source" ON "events" ("source");
CREATE INDEX IF NOT EXISTS "idx_events_unique_key" ON "events" ("unique_key");
`;

/**
 * Initialize database schema - must be called before starting the server
 */
export async function initializeDatabase(): Promise<void> {
  try {
    logger.info("Initializing database schema...");
    const client = getClient(); // Ensure client is initialized
    await client.unsafe(MIGRATION_SQL);
    logger.info("✅ Database schema initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize database schema", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error; // Re-throw to prevent server from starting with broken DB
  }
}
