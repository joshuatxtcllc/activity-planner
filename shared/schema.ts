import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  costLevel: text("cost_level").notNull(),
  timeCommitment: text("time_commitment").notNull(),
  location: text("location").notNull(),
  isPrivate: boolean("is_private").default(false),
  isFeatured: boolean("is_featured").default(false),
  seasonality: text("seasonality").array().notNull(),
  imageUrl: text("image_url"),
  eventUrl: text("event_url"),
  contactInfo: text("contact_info"),
  rating: integer("rating"),
  date: text("date"),
  tags: jsonb("tags").notNull(),
  coordinates: jsonb("coordinates"),
  venue: text("venue"),
  venueName: text("venue_name"),
  isUserAdded: boolean("is_user_added").default(true),
  externalIds: jsonb("external_ids"),
  dateAdded: timestamp("date_added").defaultNow().notNull(),
  lastSelected: timestamp("last_selected"),
  timesSelected: integer("times_selected").default(0).notNull(),
  attendees: integer("attendees").default(0).notNull(),
  icon: text("icon").notNull(),
  iconBgClass: text("icon_bg_class").notNull(),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  dateAdded: true,
});

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  activityId: integer("activity_id").references(() => activities.id).notNull(),
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
});

export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;
