/**
 * Preference Parser - Extracts user preferences from conversational input
 * Supports vibe modes for quick, opinionated recommendations
 */

export interface ParsedPreferences {
  energyLevel?: 'low' | 'medium' | 'high';
  budget?: 'cheap' | 'moderate' | 'splurge';
  socialContext?: 'solo' | 'date' | 'friends' | 'family';
  indoorOutdoorPref?: 'indoor' | 'outdoor' | 'no-preference';
  vibeMode?: VibeMode;
  specificInterests?: string[];
  timeConstraint?: number; // duration in minutes
}

export type VibeMode =
  | 'high-energy'
  | 'late-night'
  | 'cheap-fun'
  | 'date-night'
  | 'tourist'
  | 'local-hidden-gems'
  | 'artsy'
  | 'foodie'
  | 'nature-lover'
  | 'chill';

/**
 * Vibe mode templates - predefined preference sets for common moods
 */
export const vibeModeTemplates: Record<
  VibeMode,
  {
    description: string;
    preferences: Partial<ParsedPreferences>;
    activityTypes: string[];
    neighborhoods: string[];
  }
> = {
  'high-energy': {
    description: 'Active, exciting experiences with lots of stimulation',
    preferences: {
      energyLevel: 'high',
      socialContext: 'friends',
    },
    activityTypes: ['bar', 'attraction', 'experience'],
    neighborhoods: ['Midtown', 'Washington Avenue', 'EaDo', 'Downtown'],
  },
  'late-night': {
    description: 'After-hours activities and late-night dining',
    preferences: {
      energyLevel: 'medium',
      budget: 'cheap',
    },
    activityTypes: ['bar', 'restaurant'],
    neighborhoods: ['Montrose', 'Midtown', 'Upper Kirby'],
  },
  'cheap-fun': {
    description: 'Budget-friendly activities that don\'t sacrifice enjoyment',
    preferences: {
      budget: 'cheap',
      socialContext: 'friends',
    },
    activityTypes: ['park', 'walk', 'bar', 'experience'],
    neighborhoods: ['Montrose', 'Heights', 'Museum District', 'EaDo'],
  },
  'date-night': {
    description: 'Romantic, intimate experiences for couples',
    preferences: {
      socialContext: 'date',
      budget: 'moderate',
      energyLevel: 'low',
    },
    activityTypes: ['restaurant', 'walk', 'attraction'],
    neighborhoods: ['Montrose', 'Rice Village', 'Museum District', 'Heights'],
  },
  'tourist': {
    description: 'Must-see Houston attractions and iconic experiences',
    preferences: {
      energyLevel: 'medium',
    },
    activityTypes: ['attraction', 'park', 'experience'],
    neighborhoods: ['Museum District', 'Downtown', 'Clear Lake'],
  },
  'local-hidden-gems': {
    description: 'Off-the-beaten-path spots that locals love',
    preferences: {
      energyLevel: 'medium',
    },
    activityTypes: ['bar', 'restaurant', 'walk', 'experience'],
    neighborhoods: ['Montrose', 'Heights', 'EaDo', 'Chinatown'],
  },
  artsy: {
    description: 'Cultural, creative, and artistic experiences',
    preferences: {
      energyLevel: 'low',
      socialContext: 'solo',
    },
    activityTypes: ['attraction', 'walk', 'bar'],
    neighborhoods: ['Montrose', 'Museum District', 'Downtown'],
  },
  foodie: {
    description: 'Culinary adventures and diverse dining experiences',
    preferences: {
      energyLevel: 'low',
      budget: 'moderate',
    },
    activityTypes: ['restaurant', 'experience'],
    neighborhoods: ['Montrose', 'Heights', 'Chinatown', 'Midtown'],
  },
  'nature-lover': {
    description: 'Outdoor spaces, parks, and natural experiences',
    preferences: {
      energyLevel: 'medium',
      indoorOutdoorPref: 'outdoor',
    },
    activityTypes: ['park', 'walk'],
    neighborhoods: ['Memorial Park', 'Museum District', 'Heights'],
  },
  chill: {
    description: 'Low-key, relaxed activities for unwinding',
    preferences: {
      energyLevel: 'low',
      budget: 'cheap',
    },
    activityTypes: ['bar', 'park', 'walk', 'attraction'],
    neighborhoods: ['Montrose', 'Heights', 'Rice Village'],
  },
};

/**
 * Parse user input to extract preferences
 */
export function parseUserInput(input: string): ParsedPreferences {
  const lowerInput = input.toLowerCase();
  const preferences: ParsedPreferences = {};

  // Energy level detection
  if (
    lowerInput.match(
      /\b(active|energetic|exciting|party|dance|loud|pumped|hype)\b/
    )
  ) {
    preferences.energyLevel = 'high';
  } else if (
    lowerInput.match(/\b(chill|relax|calm|quiet|peaceful|laid-back|easy)\b/)
  ) {
    preferences.energyLevel = 'low';
  } else {
    preferences.energyLevel = 'medium';
  }

  // Budget detection
  if (
    lowerInput.match(
      /\b(cheap|budget|affordable|free|inexpensive|broke|poor)\b/
    )
  ) {
    preferences.budget = 'cheap';
  } else if (
    lowerInput.match(/\b(expensive|upscale|fancy|splurge|nice|high-end)\b/)
  ) {
    preferences.budget = 'splurge';
  } else {
    preferences.budget = 'moderate';
  }

  // Social context detection
  if (lowerInput.match(/\b(solo|alone|myself|by myself)\b/)) {
    preferences.socialContext = 'solo';
  } else if (
    lowerInput.match(/\b(date|romantic|partner|girlfriend|boyfriend|spouse)\b/)
  ) {
    preferences.socialContext = 'date';
  } else if (lowerInput.match(/\b(family|kids|children|parents)\b/)) {
    preferences.socialContext = 'family';
  } else if (lowerInput.match(/\b(friends|group|crew|squad)\b/)) {
    preferences.socialContext = 'friends';
  }

  // Indoor/outdoor preference
  if (lowerInput.match(/\b(outdoor|outside|nature|fresh air|park)\b/)) {
    preferences.indoorOutdoorPref = 'outdoor';
  } else if (
    lowerInput.match(/\b(indoor|inside|air condition|ac|air-conditioned)\b/)
  ) {
    preferences.indoorOutdoorPref = 'indoor';
  }

  // Vibe mode detection
  if (
    lowerInput.match(
      /\b(tourist|visitor|first time|must-see|iconic|famous)\b/
    )
  ) {
    preferences.vibeMode = 'tourist';
  } else if (
    lowerInput.match(
      /\b(local|hidden|secret|off beat|authentic|neighborhood)\b/
    )
  ) {
    preferences.vibeMode = 'local-hidden-gems';
  } else if (
    lowerInput.match(
      /\b(late night|after hours|midnight|2am|open late|24 hour)\b/
    )
  ) {
    preferences.vibeMode = 'late-night';
  } else if (
    lowerInput.match(/\b(art|culture|museum|gallery|creative|artistic)\b/)
  ) {
    preferences.vibeMode = 'artsy';
  } else if (
    lowerInput.match(/\b(food|eat|restaurant|dining|cuisine|culinary)\b/)
  ) {
    preferences.vibeMode = 'foodie';
  } else if (
    lowerInput.match(/\b(nature|hike|trail|park|green|outdoor)\b/)
  ) {
    preferences.vibeMode = 'nature-lover';
  } else if (preferences.energyLevel === 'high') {
    preferences.vibeMode = 'high-energy';
  } else if (preferences.socialContext === 'date') {
    preferences.vibeMode = 'date-night';
  } else if (preferences.budget === 'cheap') {
    preferences.vibeMode = 'cheap-fun';
  } else {
    preferences.vibeMode = 'chill';
  }

  return preferences;
}

/**
 * Generate intelligent follow-up questions based on parsed preferences
 * Maximum 2 questions to keep conversation moving
 */
export function generateFollowUpQuestions(
  preferences: ParsedPreferences,
  questionsAsked: number
): string[] {
  if (questionsAsked >= 2) return []; // Hard limit

  const questions: string[] = [];

  // Ask about weather preference if outdoor activities possible but weather dependent
  if (!preferences.indoorOutdoorPref && questionsAsked === 0) {
    questions.push(
      'Would you prefer indoor or outdoor activities? (Or does it not matter?)'
    );
  }

  // Ask about social context if not clear
  if (!preferences.socialContext && questionsAsked <= 1) {
    questions.push('Are you going solo, with a date, friends, or family?');
  }

  // Ask about budget if splurge detected but not sure
  if (!preferences.budget && questionsAsked <= 1) {
    questions.push(
      'What\'s your budget? Cheap and cheerful, moderate, or ready to splurge?'
    );
  }

  return questions.slice(0, 2 - questionsAsked); // Never exceed 2 total questions
}

/**
 * Calculate price level range based on budget preference
 */
export function getPriceLevelRange(
  budget?: string
): { min: number; max: number } {
  switch (budget) {
    case 'cheap':
      return { min: 1, max: 2 }; // $ to $$
    case 'splurge':
      return { min: 3, max: 4 }; // $$$ to $$$$
    case 'moderate':
    default:
      return { min: 2, max: 3 }; // $$ to $$$
  }
}

/**
 * Map social context to activity social settings
 */
export function getSocialSettings(
  socialContext?: string
): string[] {
  switch (socialContext) {
    case 'solo':
      return ['solo', 'small-group'];
    case 'date':
      return ['couple', 'small-group'];
    case 'friends':
      return ['small-group', 'large-group'];
    case 'family':
      return ['small-group', 'large-group'];
    default:
      return ['solo', 'couple', 'small-group', 'large-group'];
  }
}

/**
 * Determine if we have enough info to make recommendations
 */
export function hasEnoughInfo(preferences: ParsedPreferences): boolean {
  // We need at least a vibe mode or 2 other preferences
  if (preferences.vibeMode) return true;

  const definedPrefs = [
    preferences.energyLevel,
    preferences.budget,
    preferences.socialContext,
    preferences.indoorOutdoorPref,
  ].filter((p) => p !== undefined).length;

  return definedPrefs >= 2;
}
