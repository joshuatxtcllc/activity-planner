import { 
  CategoryType, 
  CostLevelType, 
  TimeCommitmentType, 
  SeasonType, 
  getCurrentSeason 
} from './activityCategories';

// Interface for the enhanced activity type
export interface EnhancedActivityType {
  id: number | string;
  title: string;
  description: string;
  category: CategoryType;
  costLevel: CostLevelType;
  timeCommitment: TimeCommitmentType;
  location: string;
  isPrivate: boolean;
  isFeatured?: boolean;
  seasonality: SeasonType[];
  imageUrl?: string;
  eventUrl?: string;
  contactInfo?: string;
  rating?: number;
  tags: Array<{
    name: string;
    color: "secondary" | "accent" | "default";
  }>;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  venue?: string;
  venueName?: string;
  isUserAdded?: boolean;
  externalIds?: {
    eventbriteId?: string;
    ticketmasterId?: string;
    googlePlaceId?: string;
    [key: string]: string | undefined;
  };
  dateAdded: Date;
  lastSelected?: Date | null;
  timesSelected: number;
  attendees: number;
  icon: "music" | "cocktail" | "art";
  iconBgClass: string;
}

// Function to generate a unique ID
export function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Function to create a new enhanced activity
export function createEnhancedActivity(params: Partial<EnhancedActivityType>): EnhancedActivityType {
  // Generate random icon if not provided
  const icons = ["music", "cocktail", "art"] as const;
  const randomIcon = icons[Math.floor(Math.random() * icons.length)];
  
  // Generate icon background class based on icon
  const getIconBgClass = (icon: "music" | "cocktail" | "art") => {
    return icon === "music" 
      ? "bg-primary bg-opacity-30" 
      : icon === "cocktail" 
        ? "bg-secondary bg-opacity-30" 
        : "bg-accent bg-opacity-30";
  };
  
  // Create default values for required properties
  const defaults: EnhancedActivityType = {
    id: generateUniqueId(),
    title: "",
    description: "",
    category: "ENTERTAINMENT",
    costLevel: "MEDIUM",
    timeCommitment: "SHORT",
    location: "Various locations",
    isPrivate: false,
    isFeatured: false,
    seasonality: ["ALL_YEAR"],
    tags: [],
    dateAdded: new Date(),
    lastSelected: null,
    timesSelected: 0,
    attendees: Math.floor(Math.random() * 20) + 5,
    icon: randomIcon,
    iconBgClass: getIconBgClass(randomIcon),
  };

  // Merge provided params with defaults
  return { ...defaults, ...params };
}

// Function to mark an activity as selected
export function markActivityAsSelected(activity: EnhancedActivityType): EnhancedActivityType {
  return {
    ...activity,
    lastSelected: new Date(),
    timesSelected: activity.timesSelected + 1
  };
}

// Function to check if an activity is appropriate for current season
export function isActivityInSeason(activity: EnhancedActivityType): boolean {
  if (!activity.seasonality || activity.seasonality.length === 0 || activity.seasonality.includes('ALL_YEAR')) {
    return true; // No seasonality restrictions or explicitly marked as year-round
  }
  
  const currentSeason = getCurrentSeason();
  return activity.seasonality.includes(currentSeason);
}

// Function to convert regular ActivityType to EnhancedActivityType
export function upgradeToEnhancedActivity(activity: any, category?: CategoryType): EnhancedActivityType {
  // Determine category from tags or title if not explicitly provided
  let detectedCategory = category;
  
  if (!detectedCategory && activity.tags && activity.tags.length > 0) {
    const tagNames = activity.tags.map((tag: any) => tag.name).join(' ');
    const detected = detectCategoryFromText(activity.title + ' ' + tagNames);
    if (detected) detectedCategory = detected;
  }
  
  if (!detectedCategory) {
    const detected = detectCategoryFromText(activity.title + ' ' + activity.description);
    if (detected) detectedCategory = detected;
  }
  
  // If still no category, use default
  if (!detectedCategory) {
    detectedCategory = "ENTERTAINMENT";
  }
  
  return createEnhancedActivity({
    ...activity,
    category: detectedCategory,
    costLevel: detectCostLevel(activity),
    timeCommitment: detectTimeCommitment(activity),
    seasonality: detectSeasonality(activity) || ["ALL_YEAR"]
  });
}

// Helper function to detect category from text
function detectCategoryFromText(text: string): CategoryType | null {
  const lowerText = text.toLowerCase();
  
  // Keywords mapping for each category
  const keywords: Record<CategoryType, string[]> = {
    'INDOOR': ['indoor', 'inside', 'home', 'house', 'room', 'game night', 'board game', 'movie night'],
    'OUTDOOR': ['outdoor', 'outside', 'nature', 'park', 'garden', 'hike', 'trail', 'camp', 'picnic'],
    'FOOD_DRINK': ['food', 'drink', 'restaurant', 'bar', 'cafe', 'brewery', 'winery', 'dinner', 'lunch', 'brunch', 'breakfast', 'coffee', 'cocktail'],
    'ENTERTAINMENT': ['entertainment', 'concert', 'show', 'movie', 'theatre', 'theater', 'performance', 'festival', 'music', 'stand-up', 'comedy'],
    'CULTURE': ['museum', 'gallery', 'exhibit', 'art', 'culture', 'history', 'tour', 'learn', 'class', 'workshop'],
    'ACTIVE': ['active', 'sport', 'gym', 'fitness', 'run', 'bike', 'swim', 'exercise', 'workout', 'yoga', 'dance'],
    'RELAXING': ['relax', 'spa', 'massage', 'meditation', 'rest', 'chill', 'unwind', 'peace', 'calm', 'quiet'],
    'SOCIAL': ['social', 'party', 'gathering', 'meetup', 'group', 'friends', 'community', 'networking', 'club']
  };
  
  // For each category, check if any of its keywords appear in the text
  for (const [category, categoryKeywords] of Object.entries(keywords)) {
    for (const keyword of categoryKeywords) {
      if (lowerText.includes(keyword)) {
        return category as CategoryType;
      }
    }
  }
  
  return null;
}

// Helper function to detect cost level from activity
function detectCostLevel(activity: any): CostLevelType {
  const title = (activity.title || '').toLowerCase();
  const description = (activity.description || '').toLowerCase();
  const text = title + ' ' + description;
  
  if (text.includes('free') || text.includes('no cost') || text.includes('no charge')) {
    return 'FREE';
  }
  
  if (text.includes('$$$') || text.includes('expensive') || text.includes('luxury')) {
    return 'HIGH';
  }
  
  if (text.includes('$$') || text.includes('moderate')) {
    return 'MEDIUM';
  }
  
  if (text.includes('$') || text.includes('cheap') || text.includes('affordable') || text.includes('budget')) {
    return 'LOW';
  }
  
  return 'MEDIUM'; // Default to medium
}

// Helper function to detect time commitment from activity
function detectTimeCommitment(activity: any): TimeCommitmentType {
  const title = (activity.title || '').toLowerCase();
  const description = (activity.description || '').toLowerCase();
  const text = title + ' ' + description;
  
  if (text.includes('weekend') || text.includes('multi-day') || text.includes('multiple days') || text.includes('overnight')) {
    return 'MULTI_DAY';
  }
  
  if (text.includes('all day') || text.includes('full day') || text.includes('day trip')) {
    return 'LONG';
  }
  
  if (text.includes('half day') || text.includes('afternoon') || text.includes('3-4 hours')) {
    return 'MEDIUM';
  }
  
  if (text.includes('1 hour') || text.includes('2 hours') || text.includes('couple hours')) {
    return 'SHORT';
  }
  
  if (text.includes('30 min') || text.includes('quick') || text.includes('brief')) {
    return 'QUICK';
  }
  
  return 'SHORT'; // Default to short
}

// Helper function to detect seasonality from activity
function detectSeasonality(activity: any): SeasonType[] | null {
  const title = (activity.title || '').toLowerCase();
  const description = (activity.description || '').toLowerCase();
  const text = title + ' ' + description;
  
  const seasonKeywords = {
    'SPRING': ['spring', 'april', 'may', 'easter', 'bloom', 'flowers'],
    'SUMMER': ['summer', 'june', 'july', 'august', 'beach', 'hot weather', 'swimming'],
    'FALL': ['fall', 'autumn', 'september', 'october', 'november', 'harvest', 'halloween', 'thanksgiving'],
    'WINTER': ['winter', 'december', 'january', 'february', 'snow', 'christmas', 'holiday season'],
  };
  
  const detectedSeasons: SeasonType[] = [];
  
  for (const [season, keywords] of Object.entries(seasonKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword) && !detectedSeasons.includes(season as SeasonType)) {
        detectedSeasons.push(season as SeasonType);
      }
    }
  }
  
  return detectedSeasons.length > 0 ? detectedSeasons : null;
}