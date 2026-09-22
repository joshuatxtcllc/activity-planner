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

// Houston Activities - Evergreen activity catalog
export const houstonActivities = pgTable("houston_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),

  // Classification
  type: text("type").notNull(), // bar, restaurant, park, walk, experience, neighborhood, attraction
  category: text("category").notNull(), // food, drinks, outdoor, culture, shopping, nightlife
  vibes: text("vibes").array().notNull(), // ['high-energy', 'chill', 'romantic', 'artsy']

  // Location
  neighborhood: text("neighborhood").notNull(), // Montrose, Heights, Midtown, etc.
  address: text("address"),
  lat: text("lat"),
  lng: text("lng"),

  // Timing
  bestTimeOfDay: text("best_time_of_day").array(), // ['morning', 'afternoon', 'evening', 'night', 'late-night']
  bestSeason: text("best_season").array(), // ['spring', 'summer', 'fall', 'winter', 'all']
  typicalDuration: integer("typical_duration"), // in minutes

  // Conditions
  indoorOutdoor: text("indoor_outdoor").notNull(), // indoor, outdoor, both
  weatherDependent: boolean("weather_dependent").default(false),

  // Pricing & Social
  priceLevel: integer("price_level").notNull(), // 1 ($), 2 ($$), 3 ($$$), 4 ($$$$)
  estimatedCost: integer("estimated_cost"), // in cents, typical cost per person
  socialSetting: text("social_setting").array(), // ['solo', 'couple', 'small-group', 'large-group']
  energyLevel: text("energy_level").notNull(), // low, medium, high

  // Links & Media
  url: text("url"),
  imageUrl: text("image_url"),

  // Metadata
  isActive: boolean("is_active").default(true),
  popularityScore: integer("popularity_score").default(0), // for ranking
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Curator Conversations - Track conversation state
export const curatorConversations = pgTable("curator_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: text("session_id").notNull(),

  // User context
  preferences: text("preferences"), // JSON string of collected preferences
  questionsAsked: integer("questions_asked").default(0),

  // Current context
  timeOfDay: text("time_of_day"), // morning, afternoon, evening, night, late-night
  dayOfWeek: text("day_of_week"),
  season: text("season"),
  weatherCondition: text("weather_condition"), // sunny, rainy, hot, cold
  temperature: integer("temperature"), // in fahrenheit

  // Parsed preferences
  energyLevel: text("energy_level"), // low, medium, high
  budget: text("budget"), // cheap, moderate, splurge
  socialContext: text("social_context"), // solo, date, friends, family
  indoorOutdoorPref: text("indoor_outdoor_pref"), // indoor, outdoor, no-preference
  vibeMode: text("vibe_mode"), // high-energy, late-night, cheap-fun, date-night, tourist, local-hidden-gems

  // Recommendations given
  recommendedActivityIds: text("recommended_activity_ids").array(),

  // Metadata
  conversationState: text("conversation_state").default("started"), // started, collecting, ready, completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertHoustonActivitySchema = createInsertSchema(houstonActivities);
export const selectHoustonActivitySchema = createSelectSchema(houstonActivities);
export const insertCuratorConversationSchema = createInsertSchema(curatorConversations);
export const selectCuratorConversationSchema = createSelectSchema(curatorConversations);

export type HoustonActivity = typeof houstonActivities.$inferSelect;
export type NewHoustonActivity = typeof houstonActivities.$inferInsert;
export type CuratorConversation = typeof curatorConversations.$inferSelect;
export type NewCuratorConversation = typeof curatorConversations.$inferInsert;

// User Submitted Activities - User-created activities for personalized recommendations
export const userSubmittedActivities = pgTable("user_submitted_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: text("session_id").notNull(), // Owner of the activity

  // Basic Info
  name: text("name").notNull(),
  description: text("description"),

  // Classification (optional fields for user input)
  type: text("type"), // bar, restaurant, park, walk, experience, neighborhood, attraction
  category: text("category"), // food, drinks, outdoor, culture, shopping, nightlife
  vibes: text("vibes").array(), // ['high-energy', 'chill', 'romantic', 'artsy']

  // Location
  neighborhood: text("neighborhood"),
  address: text("address"),
  lat: text("lat"),
  lng: text("lng"),

  // Timing
  bestTimeOfDay: text("best_time_of_day").array(), // ['morning', 'afternoon', 'evening', 'night', 'late-night']
  bestSeason: text("best_season").array(), // ['spring', 'summer', 'fall', 'winter', 'all']
  typicalDuration: integer("typical_duration"), // in minutes

  // Conditions
  indoorOutdoor: text("indoor_outdoor"), // indoor, outdoor, both
  weatherDependent: boolean("weather_dependent").default(false),

  // Pricing & Social
  priceLevel: integer("price_level"), // 1 ($), 2 ($$), 3 ($$$), 4 ($$$$)
  estimatedCost: integer("estimated_cost"), // in cents, typical cost per person
  socialSetting: text("social_setting").array(), // ['solo', 'couple', 'small-group', 'large-group']
  energyLevel: text("energy_level"), // low, medium, high

  // Links & Media
  url: text("url"),
  imageUrl: text("image_url"),

  // User-specific metadata
  useInRecommendations: boolean("use_in_recommendations").default(true),
  timesRecommended: integer("times_recommended").default(0),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSubmittedActivitySchema = createInsertSchema(userSubmittedActivities);
export const selectUserSubmittedActivitySchema = createSelectSchema(userSubmittedActivities);

export type UserSubmittedActivity = typeof userSubmittedActivities.$inferSelect;
export type NewUserSubmittedActivity = typeof userSubmittedActivities.$inferInsert;

// ---------------------------------------------------------------------------
// Alert Rules
//
// A rule owned by a session (or a well-known "default" session for the app
// operator) describing when a newly scraped event should trigger an
// alert. Rules are ANDed across dimensions: an event must match every
// non-empty filter to fire. Within a single dimension (keywords, venues,
// categories, sources), any match counts (OR).
// ---------------------------------------------------------------------------
export const alertRules = pgTable("alert_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: text("session_id").notNull(), // owner; "default" for the app operator
  name: text("name").notNull(), // human-readable label, e.g. "Comedy at Houston Improv"

  // Filters (all optional; empty array = don't restrict on this dimension)
  keywords: text("keywords").array().default([]), // case-insensitive substring match against title/description
  venues: text("venues").array().default([]), // case-insensitive substring match against event.venue
  categories: text("categories").array().default([]), // exact-match against event.category
  sources: text("sources").array().default([]), // exact-match against event.source

  // Optional date window (ISO strings; null = no window)
  dateRangeStart: timestamp("date_range_start"),
  dateRangeEnd: timestamp("date_range_end"),

  // Delivery channels
  channelEmail: boolean("channel_email").default(true),
  channelSms: boolean("channel_sms").default(false),
  channelInApp: boolean("channel_in_app").default(true),

  // Contact overrides (fall back to env NOTIFICATION_EMAIL / NOTIFICATION_SMS)
  emailTo: text("email_to"),
  smsTo: text("sms_to"),

  // Lifecycle
  isActive: boolean("is_active").default(true),
  lastFiredAt: timestamp("last_fired_at"),
  totalFired: integer("total_fired").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAlertRuleSchema = createInsertSchema(alertRules);
export const selectAlertRuleSchema = createSelectSchema(alertRules);
export type AlertRule = typeof alertRules.$inferSelect;
export type NewAlertRule = typeof alertRules.$inferInsert;

// Alert deliveries — one row per (rule, event) fire, to prevent duplicate alerts
export const alertDeliveries = pgTable("alert_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  ruleId: uuid("rule_id").notNull(),
  eventId: uuid("event_id").notNull(),
  channel: text("channel").notNull(), // email | sms | in_app
  status: text("status").notNull(), // sent | failed | skipped
  error: text("error"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  uniqueKey: text("unique_key").unique(), // ruleId + eventId + channel — prevents dupes
});

export const insertAlertDeliverySchema = createInsertSchema(alertDeliveries);
export type AlertDelivery = typeof alertDeliveries.$inferSelect;
export type NewAlertDelivery = typeof alertDeliveries.$inferInsert;

// ---------------------------------------------------------------------------
// Watched Venues — first-class registry for the four target Houston venues
// (and any other user-added venues). Used to power venue filters on the
// dashboard and to guarantee the Houston Improv scraper stays coverage-
// checked. A canonical list is seeded in migrations.
// ---------------------------------------------------------------------------
export const watchedVenues = pgTable("watched_venues", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(), // e.g. "toyota-center"
  name: text("name").notNull(), // display name
  aliases: text("aliases").array().default([]), // alternate spellings scrapers may return
  address: text("address"),
  neighborhood: text("neighborhood"),
  website: text("website"),
  primarySource: text("primary_source"), // ticketmaster | seatgeek | houstonimprov | ...
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWatchedVenueSchema = createInsertSchema(watchedVenues);
export type WatchedVenue = typeof watchedVenues.$inferSelect;
export type NewWatchedVenue = typeof watchedVenues.$inferInsert;
