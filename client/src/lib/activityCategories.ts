import type { LucideIcon } from 'lucide-react';
import {
  Home, 
  Palmtree, 
  Utensils, 
  Ticket, 
  Book, 
  Dumbbell, 
  Heart, 
  Users,
  DollarSign,
  Clock,
  Calendar
} from 'lucide-react';

export type CategoryType = 
  | 'INDOOR' 
  | 'OUTDOOR' 
  | 'FOOD_DRINK' 
  | 'ENTERTAINMENT' 
  | 'CULTURE' 
  | 'ACTIVE' 
  | 'RELAXING' 
  | 'SOCIAL';

export type CostLevelType = 
  | 'FREE'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH';

export type TimeCommitmentType = 
  | 'QUICK'
  | 'SHORT'
  | 'MEDIUM'
  | 'LONG'
  | 'MULTI_DAY';

export type SeasonType = 
  | 'SPRING'
  | 'SUMMER'
  | 'FALL'
  | 'WINTER'
  | 'ALL_YEAR';

export interface CategoryInfo {
  label: string;
  icon: LucideIcon;
  description: string;
  color: string;
}

export interface CostLevelInfo {
  label: string;
  icon: LucideIcon;
  description: string;
}

export interface TimeCommitmentInfo {
  label: string;
  icon: LucideIcon;
  description: string;
}

export interface SeasonInfo {
  label: string;
  months: number[];
  icon?: LucideIcon;
  color: string;
}

// Activity Categories
export const activityCategories: Record<CategoryType, CategoryInfo> = {
  'INDOOR': {
    label: 'Indoor Activities',
    icon: Home,
    description: 'Activities that take place inside',
    color: 'bg-purple-100 text-purple-800'
  },
  'OUTDOOR': {
    label: 'Outdoor Adventures',
    icon: Palmtree,
    description: 'Activities in nature or outside',
    color: 'bg-green-100 text-green-800'
  },
  'FOOD_DRINK': {
    label: 'Food & Drink',
    icon: Utensils,
    description: 'Culinary experiences and beverages',
    color: 'bg-orange-100 text-orange-800'
  },
  'ENTERTAINMENT': {
    label: 'Entertainment',
    icon: Ticket,
    description: 'Shows, performances and events',
    color: 'bg-pink-100 text-pink-800'
  },
  'CULTURE': {
    label: 'Culture & Learning',
    icon: Book,
    description: 'Museums, educational activities and cultural experiences',
    color: 'bg-blue-100 text-blue-800'
  },
  'ACTIVE': {
    label: 'Active & Sports',
    icon: Dumbbell,
    description: 'Physical activities and sports',
    color: 'bg-red-100 text-red-800'
  },
  'RELAXING': {
    label: 'Relaxing & Wellness',
    icon: Heart,
    description: 'Activities for relaxation and self-care',
    color: 'bg-teal-100 text-teal-800'
  },
  'SOCIAL': {
    label: 'Social Events',
    icon: Users,
    description: 'Group activities and social gatherings',
    color: 'bg-yellow-100 text-yellow-800'
  }
};

// Cost levels for activities
export const costLevels: Record<CostLevelType, CostLevelInfo> = {
  'FREE': {
    label: 'Free',
    icon: DollarSign,
    description: 'No cost required'
  },
  'LOW': {
    label: '$',
    icon: DollarSign,
    description: 'Low cost, typically under $20 per person'
  },
  'MEDIUM': {
    label: '$$',
    icon: DollarSign,
    description: 'Moderate cost, typically $20-60 per person'
  },
  'HIGH': {
    label: '$$$',
    icon: DollarSign,
    description: 'Higher cost, typically over $60 per person'
  }
};

// Time commitment levels
export const timeCommitments: Record<TimeCommitmentType, TimeCommitmentInfo> = {
  'QUICK': {
    label: '< 1 hour',
    icon: Clock,
    description: 'Quick activities that take less than an hour'
  },
  'SHORT': {
    label: '1-2 hours',
    icon: Clock,
    description: 'Short activities that take 1-2 hours'
  },
  'MEDIUM': {
    label: 'Half day',
    icon: Clock,
    description: 'Medium-length activities that take 2-4 hours'
  },
  'LONG': {
    label: 'Full day',
    icon: Clock,
    description: 'Longer activities that take most of a day'
  },
  'MULTI_DAY': {
    label: 'Multiple days',
    icon: Calendar,
    description: 'Extended activities that span multiple days'
  }
};

// Seasons
export const seasons: Record<SeasonType, SeasonInfo> = {
  'SPRING': {
    label: 'Spring',
    months: [2, 3, 4], // March, April, May
    color: 'bg-green-100 text-green-800'
  },
  'SUMMER': {
    label: 'Summer',
    months: [5, 6, 7], // June, July, August
    color: 'bg-yellow-100 text-yellow-800'
  },
  'FALL': {
    label: 'Fall',
    months: [8, 9, 10], // September, October, November
    color: 'bg-orange-100 text-orange-800'
  },
  'WINTER': {
    label: 'Winter',
    months: [11, 0, 1], // December, January, February
    color: 'bg-blue-100 text-blue-800'
  },
  'ALL_YEAR': {
    label: 'Year-round',
    months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // All months
    color: 'bg-gray-100 text-gray-800'
  }
};

// Helper function to get current season
export function getCurrentSeason(): SeasonType {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'SPRING';
  if (month >= 5 && month <= 7) return 'SUMMER';
  if (month >= 8 && month <= 10) return 'FALL';
  return 'WINTER';
}

// Helper to get category by name (case-insensitive)
export function getCategoryByName(name: string): CategoryType | null {
  const normalized = name.toUpperCase().replace(/[^A-Z]/g, '_');
  return (Object.keys(activityCategories) as CategoryType[]).find(
    category => category === normalized || activityCategories[category].label.toUpperCase().replace(/[^A-Z]/g, '_') === normalized
  ) || null;
}

// Helper to detect category from text content
export function detectCategoryFromText(text: string): CategoryType | null {
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