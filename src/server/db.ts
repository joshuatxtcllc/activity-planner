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

-- Create indexes for events
CREATE INDEX IF NOT EXISTS "idx_events_start_date" ON "events" ("start_date");
CREATE INDEX IF NOT EXISTS "idx_events_source" ON "events" ("source");
CREATE INDEX IF NOT EXISTS "idx_events_unique_key" ON "events" ("unique_key");
CREATE INDEX IF NOT EXISTS "idx_events_category" ON "events" ("category");

-- Create user_preferences table for tracking likes/dislikes
CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" text NOT NULL,
  "event_id" uuid NOT NULL,
  "liked" boolean,
  "viewed" boolean DEFAULT false,
  "clicked" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for user_preferences
CREATE INDEX IF NOT EXISTS "idx_user_prefs_session" ON "user_preferences" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_user_prefs_event" ON "user_preferences" ("event_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_prefs_session_event" ON "user_preferences" ("session_id", "event_id");

-- Create user_profiles table for ML recommendation patterns
CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" text NOT NULL UNIQUE,
  "preferred_categories" text[],
  "preferred_sources" text[],
  "preferred_price_range" text,
  "preferred_days" text[],
  "total_likes" integer DEFAULT 0,
  "total_dislikes" integer DEFAULT 0,
  "total_views" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create index for user_profiles
CREATE INDEX IF NOT EXISTS "idx_user_profiles_session" ON "user_profiles" ("session_id");

-- Create houston_activities table for evergreen activity catalog
CREATE TABLE IF NOT EXISTS "houston_activities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text NOT NULL,
  "type" text NOT NULL,
  "category" text NOT NULL,
  "vibes" text[] NOT NULL,
  "neighborhood" text NOT NULL,
  "address" text,
  "lat" text,
  "lng" text,
  "best_time_of_day" text[],
  "best_season" text[],
  "typical_duration" integer,
  "indoor_outdoor" text NOT NULL,
  "weather_dependent" boolean DEFAULT false,
  "price_level" integer NOT NULL,
  "estimated_cost" integer,
  "social_setting" text[],
  "energy_level" text NOT NULL,
  "url" text,
  "image_url" text,
  "is_active" boolean DEFAULT true,
  "popularity_score" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for houston_activities
CREATE INDEX IF NOT EXISTS "idx_activities_neighborhood" ON "houston_activities" ("neighborhood");
CREATE INDEX IF NOT EXISTS "idx_activities_type" ON "houston_activities" ("type");
CREATE INDEX IF NOT EXISTS "idx_activities_price_level" ON "houston_activities" ("price_level");
CREATE INDEX IF NOT EXISTS "idx_activities_energy_level" ON "houston_activities" ("energy_level");
CREATE INDEX IF NOT EXISTS "idx_activities_active" ON "houston_activities" ("is_active");

-- Create curator_conversations table for tracking curator sessions
CREATE TABLE IF NOT EXISTS "curator_conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" text NOT NULL,
  "preferences" text,
  "questions_asked" integer DEFAULT 0,
  "time_of_day" text,
  "day_of_week" text,
  "season" text,
  "weather_condition" text,
  "temperature" integer,
  "energy_level" text,
  "budget" text,
  "social_context" text,
  "indoor_outdoor_pref" text,
  "vibe_mode" text,
  "recommended_activity_ids" text[],
  "conversation_state" text DEFAULT 'started',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for curator_conversations
CREATE INDEX IF NOT EXISTS "idx_curator_conv_session" ON "curator_conversations" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_curator_conv_state" ON "curator_conversations" ("conversation_state");
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

    // Seed Houston activities if not already done
    try {
      const { seedHoustonActivities } = await import('./scripts/seed-activities');
      await seedHoustonActivities();
    } catch (seedError) {
      logger.warn("Failed to seed activities (non-fatal)", {
        error: seedError instanceof Error ? seedError.message : String(seedError)
      });
      // Don't throw - seeding failure shouldn't prevent server startup
    }
  } catch (error) {
    logger.error("Failed to initialize database schema", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error; // Re-throw to prevent server from starting with broken DB
  }
}
