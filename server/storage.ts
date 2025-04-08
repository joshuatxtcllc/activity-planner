import { 
  users, type User, type InsertUser,
  activities, type Activity, type InsertActivity, 
  tags, type Tag, type InsertTag
} from "@shared/schema";

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
  
  // Tag methods
  getTagsByActivityId(activityId: number): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
}

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
    
    // Ensure all fields match Activity type
    const activity: Activity = { 
      id, 
      title: insertActivity.title,
      date: insertActivity.date,
      location: insertActivity.location,
      isPrivate: insertActivity.isPrivate ?? false,
      isFeatured: insertActivity.isFeatured ?? false,
      icon: insertActivity.icon,
      iconBgClass: insertActivity.iconBgClass,
      attendees: insertActivity.attendees ?? 0,
      createdAt: now
    };
    
    this.activities.set(id, activity);
    return activity;
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
}

export const storage = new MemStorage();
