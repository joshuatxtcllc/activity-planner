import { pgTable, text, integer, timestamp, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),

  // Date & Time
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),

  // Location
  location: text("location").notNull(), // e.g., "Houston, TX"
  venue: text("venue"), // e.g., "Toyota Center"
  address: text("address"),

  // Links & Media
  url: text("url").notNull(),
  imageUrl: text("image_url"),

  // Classification
  source: text("source").notNull(), // ticketmaster, eventbrite, google, etc.
  category: text("category"), // music, sports, food, arts, etc.

  // Pricing
  priceMin: integer("price_min"), // in cents
  priceMax: integer("price_max"), // in cents
  isFree: boolean("is_free").default(false),

  // Metadata
  externalId: text("external_id"), // ID from source API
  scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),

  // For deduplication
  uniqueKey: text("unique_key").unique(), // hash of title + date + location
});

// Zod schemas for validation
export const insertEventSchema = createInsertSchema(events);
export const selectEventSchema = createSelectSchema(events);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

// User Preferences - track likes/dislikes for ML recommendations
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: text("session_id").notNull(), // Anonymous user tracking via cookie
  eventId: uuid("event_id").notNull(), // Reference to event

  // Preference tracking
  liked: boolean("liked"), // true = like, false = dislike, null = neutral
  viewed: boolean("viewed").default(false),
  clicked: boolean("clicked").default(false),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User Profile - aggregate preference data for ML
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: text("session_id").notNull().unique(),

  // Preference patterns (learned from user_preferences)
  preferredCategories: text("preferred_categories").array(), // ['music', 'food']
  preferredSources: text("preferred_sources").array(), // ['ticketmaster', 'do713']
  preferredPriceRange: text("preferred_price_range"), // 'free', 'cheap', 'any'
  preferredDays: text("preferred_days").array(), // ['friday', 'saturday']

  // Stats
  totalLikes: integer("total_likes").default(0),
  totalDislikes: integer("total_dislikes").default(0),
  totalViews: integer("total_views").default(0),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserPreferenceSchema = createInsertSchema(userPreferences);
export const selectUserPreferenceSchema = createSelectSchema(userPreferences);
export const insertUserProfileSchema = createInsertSchema(userProfiles);
export const selectUserProfileSchema = createSelectSchema(userProfiles);

export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
