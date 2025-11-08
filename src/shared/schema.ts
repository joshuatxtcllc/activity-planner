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
