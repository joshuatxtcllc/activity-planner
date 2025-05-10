import { 
  users, type User, type InsertUser,
  activities, type Activity, type InsertActivity, 
  tags, type Tag, type InsertTag
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Activity methods
  getActivities(): Promise<Activity[]>;
  getActivity(id: number): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: number, activity: Partial<InsertActivity>): Promise<Activity | undefined>;
  deleteActivity(id: number): Promise<boolean>;
  
  // Tag methods
  getTagsByActivityId(activityId: number): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  
  // Enhanced activity methods
  updateActivitySelectionCount(id: number): Promise<Activity | undefined>;
}

// Memory storage implementation (to keep as fallback)
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private activities: Map<number, Activity>;
  private tags: Map<number, Tag>;
  private userIdCounter: number;
  private activityIdCounter: number;
  private tagIdCounter: number;

  constructor() {
    this.users = new Map();
    this.activities = new Map();
    this.tags = new Map();
    this.userIdCounter = 1;
    this.activityIdCounter = 1;
    this.tagIdCounter = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Activity methods
  async getActivities(): Promise<Activity[]> {
    return Array.from(this.activities.values());
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    return this.activities.get(id);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.activityIdCounter++;
    const now = new Date();
    
    // Ensure all fields match Activity type (simplified for brevity)
    const activity: Activity = { 
      id, 
      ...insertActivity,
      createdAt: now
    };
    
    this.activities.set(id, activity);
    return activity;
  }
  
  async updateActivity(id: number, activityData: Partial<InsertActivity>): Promise<Activity | undefined> {
    const activity = this.activities.get(id);
    if (!activity) return undefined;
    
    const updatedActivity = { ...activity, ...activityData };
    this.activities.set(id, updatedActivity);
    return updatedActivity;
  }
  
  async deleteActivity(id: number): Promise<boolean> {
    return this.activities.delete(id);
  }

  // Tag methods
  async getTagsByActivityId(activityId: number): Promise<Tag[]> {
    return Array.from(this.tags.values()).filter(
      (tag) => tag.activityId === activityId
    );
  }

  async createTag(insertTag: InsertTag): Promise<Tag> {
    const id = this.tagIdCounter++;
    const tag: Tag = { ...insertTag, id };
    this.tags.set(id, tag);
    return tag;
  }
  
  // Enhanced activity methods
  async updateActivitySelectionCount(id: number): Promise<Activity | undefined> {
    const activity = this.activities.get(id);
    if (!activity) return undefined;
    
    const updatedActivity = { 
      ...activity, 
      timesSelected: (activity.timesSelected || 0) + 1,
      lastSelected: new Date()
    };
    
    this.activities.set(id, updatedActivity);
    return updatedActivity;
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getActivities(): Promise<Activity[]> {
    return await db.select().from(activities);
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity;
  }

  async createActivity(activityData: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(activityData).returning();
    return activity;
  }

  async updateActivity(id: number, activityData: Partial<InsertActivity>): Promise<Activity | undefined> {
    const [activity] = await db
      .update(activities)
      .set(activityData)
      .where(eq(activities.id, id))
      .returning();
    return activity;
  }

  async deleteActivity(id: number): Promise<boolean> {
    const result = await db.delete(activities).where(eq(activities.id, id));
    return true; // In PostgreSQL with Drizzle, delete doesn't return the count
  }

  async getTagsByActivityId(activityId: number): Promise<Tag[]> {
    return await db.select().from(tags).where(eq(tags.activityId, activityId));
  }

  async createTag(tagData: InsertTag): Promise<Tag> {
    const [tag] = await db.insert(tags).values(tagData).returning();
    return tag;
  }

  // Enhanced activity methods
  async updateActivitySelectionCount(id: number): Promise<Activity | undefined> {
    const activity = await this.getActivity(id);
    if (!activity) return undefined;
    
    // Update the activity's selection count and last selected time
    const [updatedActivity] = await db
      .update(activities)
      .set({
        timesSelected: (activity.timesSelected || 0) + 1,
        lastSelected: new Date()
      })
      .where(eq(activities.id, id))
      .returning();
    
    return updatedActivity;
  }
}

// Use the database storage
export const storage = new DatabaseStorage();
