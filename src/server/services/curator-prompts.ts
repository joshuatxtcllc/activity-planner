import { ParsedPreferences, vibeModeTemplates } from './preference-parser';
import { WeatherData } from './weather-adapter';
import { ActivityRecommendation } from './recommendation-engine';

/**
 * System prompt for the Local Activity Curator
 */
export const CURATOR_SYSTEM_PROMPT = `You are Houston's Local Activity Curator - a friendly, opinionated guide to evergreen activities in Houston, Texas.

YOUR ROLE:
- Recommend activities that can be done anytime (bars, restaurants, parks, walks, neighborhoods, experiences)
- Do NOT focus on special events or calendars
- Be decisive and confident in your recommendations
- Keep responses conversational but concise
- Ask maximum 2 clarifying questions before recommending

YOUR PERSONALITY:
- Friendly but not overly chatty
- Opinionated (have favorites, make calls)
- Houston-knowledgeable (know neighborhoods, weather, culture)
- Efficient (get to recommendations quickly)
- Practical (consider weather, time, budget)

KEY FACTORS TO CONSIDER:
1. User preferences (energy level, budget, social context)
2. Time of day (morning, afternoon, evening, night, late-night)
3. Current weather (Houston heat is intense!)
4. Season (affects outdoor activities)
5. Geographic proximity (stick to 2-3 neighborhoods max)

CONVERSATION FLOW:
1. Greet warmly and ask initial preference (max 1-2 questions)
2. Analyze response and determine if you need 1 more question
3. Generate 3-5 ranked recommendations with brief reasoning
4. Be ready to answer follow-up questions or adjust

HOUSTON-SPECIFIC KNOWLEDGE:
- Summer (June-Sept): Often 95°F+, humid, outdoor activities best morning/evening
- Montrose: Artsy, LGBTQ+ friendly, eclectic dining and bars
- Heights: Family-friendly, walkable, Victorian homes
- Midtown: Young professionals, nightlife, walkable
- Museum District: Cultural attractions, parks, world-class museums
- EaDo: Up-and-coming, breweries, industrial-chic
- Downtown: Business district, tunnels, Discovery Green

RECOMMENDATION FORMAT:
For each activity, provide:
1. Name and type (e.g., "Axelrad Beer Garden - Outdoor bar")
2. Why it fits (1-2 sentences, specific to their preferences)
3. Practical info (neighborhood, price level, best time)
4. One insider tip or what makes it special

Always end with: "Want more options or have questions about any of these?"`;

/**
 * Generate greeting message based on time and weather
 */
export function generateGreeting(
  timeOfDay: string,
  weather: WeatherData
): string {
  const timeGreeting = {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    night: 'Hey there',
    'late-night': 'Still up, huh',
  }[timeOfDay] || 'Hey there';

  const weatherNote =
    weather.condition === 'hot'
      ? " (and it's a scorcher out there!)"
      : weather.condition === 'rainy'
      ? " (looks like rain today)"
      : weather.condition === 'sunny'
      ? " (beautiful day!)"
      : '';

  return `${timeGreeting}${weatherNote}! I'm your Houston Activity Curator. I specialize in recommending evergreen activities - the kind you can do anytime, not tied to special events.\n\nWhat kind of vibe are you looking for today?`;
}

/**
 * Generate follow-up question prompt
 */
export function generateQuestionPrompt(
  questions: string[],
  preferences: ParsedPreferences
): string {
  if (questions.length === 0) {
    return 'Got it! Let me find some great spots for you.';
  }

  return `${questions[0]}\n\n(This helps me nail down the perfect recommendations for you.)`;
}

/**
 * Format recommendations into conversational response
 */
export function formatRecommendations(
  recommendations: ActivityRecommendation[],
  context: {
    preferences: ParsedPreferences;
    weather: WeatherData;
    timeOfDay: string;
  }
): string {
  if (recommendations.length === 0) {
    return `Hmm, I'm having trouble finding activities that match those exact criteria. Let me suggest some popular Houston spots instead, or you can adjust your preferences?`;
  }

  const { preferences, weather, timeOfDay } = context;

  // Opening line based on preferences
  let opening = '';
  if (preferences.vibeMode) {
    const template = vibeModeTemplates[preferences.vibeMode];
    opening = `Perfect! For ${template.description.toLowerCase()}, here are my top picks:\n\n`;
  } else {
    opening = `Based on what you're looking for, here are my recommendations:\n\n`;
  }

  // Format each recommendation
  const formattedRecs = recommendations
    .map((rec, idx) => {
      const { activity } = rec;
      const priceSymbol = '$'.repeat(activity.priceLevel);

      return `**${idx + 1}. ${activity.name}** (${activity.type} in ${activity.neighborhood})\n` +
        `${activity.description}\n\n` +
        `*Why this works:* ${rec.reasoning}\n` +
        `*Details:* ${priceSymbol} • ${activity.typicalDuration} min • Best for ${activity.energyLevel}-energy\n` +
        (activity.url ? `[More info](${activity.url})\n` : '');
    })
    .join('\n');

  // Weather-specific tips
  let weatherTip = '';
  if (weather.condition === 'hot' && weather.temperature >= 95) {
    weatherTip =
      '\n💡 **Houston Heat Tip:** Stay hydrated and consider saving outdoor activities for morning or evening.\n';
  } else if (weather.condition === 'rainy') {
    weatherTip =
      '\n☔ **Weather Note:** Some outdoor activities might be affected. Indoor options are your friend today.\n';
  }

  const closing = '\n\nWant more options, different neighborhoods, or have questions about any of these?';

  return opening + formattedRecs + weatherTip + closing;
}

/**
 * Generate conversation context for AI
 */
export function buildConversationContext(
  preferences: ParsedPreferences,
  weather: WeatherData,
  timeOfDay: string,
  season: string
): string {
  return `
CURRENT CONTEXT:
- Time: ${timeOfDay}
- Season: ${season}
- Weather: ${weather.temperature}°F, ${weather.condition} (${weather.description})
- Outdoor suitable: ${weather.condition !== 'rainy' && weather.condition !== 'stormy' && weather.temperature < 98}

USER PREFERENCES DETECTED:
- Energy level: ${preferences.energyLevel || 'not specified'}
- Budget: ${preferences.budget || 'not specified'}
- Social context: ${preferences.socialContext || 'not specified'}
- Indoor/Outdoor: ${preferences.indoorOutdoorPref || 'no preference'}
- Vibe mode: ${preferences.vibeMode || 'not specified'}

Use this context to make informed recommendations that account for current conditions.
`;
}

/**
 * Generate quick vibe mode suggestions
 */
export function generateVibeModePrompt(): string {
  return `Not sure? Try one of these vibes:

🔥 **High Energy** - Active, exciting spots
🌙 **Late Night** - After-hours dining and drinks
💰 **Cheap Fun** - Budget-friendly adventures
💕 **Date Night** - Romantic spots for two
📸 **Tourist** - Must-see Houston attractions
🗺️ **Local Gems** - Off-the-beaten-path favorites
🎨 **Artsy** - Cultural and creative experiences
🍽️ **Foodie** - Culinary adventures
🌳 **Nature** - Parks and outdoor spaces
😌 **Chill** - Relaxed, low-key activities

Just tell me which vibe sounds good, or describe what you're looking for in your own words!`;
}

/**
 * Fallback response when no activities match
 */
export function generateNoResultsMessage(
  preferences: ParsedPreferences
): string {
  return `I'm having trouble finding activities that match all your criteria right now. Here are some options:

1. **Broaden your search** - Maybe flexible on indoor/outdoor or budget?
2. **Try a different vibe** - Pick from: high-energy, date-night, cheap-fun, artsy, foodie, nature-lover, or chill
3. **Tell me more** - What specific neighborhood or type of activity interests you?

I'm here to help find the perfect Houston activity for you!`;
}

/**
 * Generate neighborhood-specific intro
 */
export function generateNeighborhoodIntro(neighborhood: string): string {
  const intros: Record<string, string> = {
    Montrose:
      'Montrose is Houston\'s most eclectic neighborhood - artsy, diverse, and full of character. Think Victorian homes, street art, quirky shops, and some of the city\'s best dining.',
    Heights:
      'The Heights is charming and walkable with Victorian architecture, tree-lined streets, and a thriving local business scene. Very family-friendly.',
    Midtown:
      'Midtown is the heart of Houston\'s young professional scene - walkable, lively, and packed with bars, restaurants, and nightlife.',
    'Museum District':
      'The Museum District is Houston\'s cultural center, home to world-class museums, Hermann Park, and beautiful green spaces.',
    EaDo:
      'EaDo (East Downtown) is Houston\'s up-and-coming neighborhood with an industrial-chic vibe, breweries, and creative energy.',
    Downtown:
      'Downtown Houston is the business and civic heart of the city, with Discovery Green, the tunnel system, and skyline views.',
    'Washington Avenue':
      'Washington Avenue is a nightlife corridor with breweries, bars, and entertainment venues.',
  };

  return intros[neighborhood] || `${neighborhood} is a great Houston neighborhood.`;
}
