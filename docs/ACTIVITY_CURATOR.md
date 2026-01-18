# Local Activity Curator - Feature Documentation

## Overview

The Local Activity Curator is a conversational AI assistant that generates personalized, non-event-based activity itineraries for Houston, Texas. It focuses on evergreen activities (bars, restaurants, parks, walks, neighborhoods, experiences) that can be enjoyed anytime, not tied to special events or calendars.

## Core Features

### 1. Conversational Interface
- Maximum 2 clarifying questions before making recommendations
- Outputs 3-5 ranked activity suggestions with brief explanations
- Decisive and opinionated (no long lists)
- Houston-specific neighborhood knowledge
- Fallback logic for rain, extreme heat, or late hours

### 2. Contextual Intelligence
- **Weather-aware**: Integrates real-time Houston weather via OpenWeatherMap API
- **Time-sensitive**: Considers time of day (morning, afternoon, evening, night, late-night)
- **Seasonal**: Adjusts recommendations based on current season
- **Location-based**: Recommends activities within 2-3 Houston neighborhoods for proximity

### 3. Preference System
The system factors in:
- Energy level (low, medium, high)
- Budget (cheap, moderate, splurge)
- Social context (solo, date, friends, family)
- Indoor/outdoor preference
- Vibe modes (pre-configured mood templates)

### 4. Vibe Modes
Pre-configured preference sets for common moods:
- 🔥 **High Energy** - Active, exciting experiences
- 🌙 **Late Night** - After-hours activities
- 💰 **Cheap Fun** - Budget-friendly adventures
- 💕 **Date Night** - Romantic spots for couples
- 📸 **Tourist** - Must-see Houston attractions
- 🗺️ **Local Hidden Gems** - Off-the-beaten-path favorites
- 🎨 **Artsy** - Cultural and creative experiences
- 🍽️ **Foodie** - Culinary adventures
- 🌳 **Nature Lover** - Parks and outdoor spaces
- 😌 **Chill** - Low-key, relaxed activities

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  - CuratorPage.tsx (Conversational UI)                      │
│  - Quick vibe selection                                      │
│  - Conversation flow management                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                API Layer (Express)                           │
│  - POST /api/curator/start (Start conversation)             │
│  - POST /api/curator/respond (Continue conversation)        │
│  - GET  /api/curator/quick-recommend (Quick vibes)          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Core Services (Modular)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Preference Parser                                     │  │
│  │ - Extracts preferences from user input               │  │
│  │ - Maps to vibe modes                                 │  │
│  │ - Generates follow-up questions                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Weather Adapter                                       │  │
│  │ - Fetches real-time Houston weather                  │  │
│  │ - Categorizes conditions                             │  │
│  │ - Provides activity suitability                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Recommendation Engine                                 │  │
│  │ - Scores activities based on context                 │  │
│  │ - Applies diversity filters                          │  │
│  │ - Generates reasoning for recommendations            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Curator Prompts                                       │  │
│  │ - System prompts for AI personality                  │  │
│  │ - Response formatting                                │  │
│  │ - Conversation templates                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Layer (PostgreSQL)                         │
│  - houston_activities (Activity catalog)                    │
│  - curator_conversations (Session state)                    │
│  - user_profiles (Optional preference memory)               │
└─────────────────────────────────────────────────────────────┘
```

### Modular Design

Each component is independent and can be easily:
- **Tested** - Unit tests for each service
- **Extended** - Add new vibe modes, activity types, or cities
- **Replaced** - Swap weather providers or add ML recommendation models

---

## API Contract

### 1. Start Conversation

**Endpoint**: `POST /api/curator/start`

**Request Body**: None (uses session ID from cookies)

**Response**:
```json
{
  "conversationId": "uuid",
  "message": "Good afternoon! I'm your Houston Activity Curator...",
  "vibeModes": "List of available vibe modes (formatted text)",
  "context": {
    "weather": {
      "temperature": 78,
      "condition": "sunny",
      "description": "clear sky"
    },
    "timeOfDay": "afternoon",
    "season": "spring"
  }
}
```

### 2. Respond to User Input

**Endpoint**: `POST /api/curator/respond`

**Request Body**:
```json
{
  "conversationId": "uuid",
  "userInput": "I want something chill and cheap"
}
```

**Response (needs more info)**:
```json
{
  "needsMoreInfo": true,
  "question": "Would you prefer indoor or outdoor activities?",
  "preferences": {
    "energyLevel": "low",
    "budget": "cheap"
  }
}
```

**Response (ready to recommend)**:
```json
{
  "needsMoreInfo": false,
  "message": "Perfect! For cheap and chill vibes, here are my top picks:\n\n...",
  "recommendations": [
    {
      "id": "uuid",
      "name": "Buffalo Bayou Park",
      "description": "160-acre green space...",
      "type": "park",
      "category": "outdoor",
      "neighborhood": "Memorial Park",
      "priceLevel": 1,
      "energyLevel": "medium",
      "typicalDuration": 90,
      "reasoning": "Free outdoor option for chill vibes",
      "score": 95,
      "url": "https://buffalobayou.org/"
    }
    // ... 2-4 more activities
  ],
  "preferences": {
    "energyLevel": "low",
    "budget": "cheap",
    "indoorOutdoorPref": "outdoor",
    "vibeMode": "chill"
  }
}
```

### 3. Quick Recommendations (No Conversation)

**Endpoint**: `GET /api/curator/quick-recommend?vibe=date-night`

**Query Parameters**:
- `vibe` (optional): Vibe mode ID
- `neighborhood` (optional): Houston neighborhood name

**Response**: Same as "ready to recommend" response above

### 4. Browse Activities

**Endpoint**: `GET /api/curator/activities`

**Query Parameters**:
- `neighborhood` (optional)
- `type` (optional)
- `priceLevel` (optional)

**Response**: Array of activity objects

### 5. Get Neighborhoods

**Endpoint**: `GET /api/curator/neighborhoods`

**Response**:
```json
[
  "Montrose",
  "Heights",
  "Midtown",
  "Downtown",
  "Museum District",
  "EaDo",
  ...
]
```

### 6. Get Vibe Modes

**Endpoint**: `GET /api/curator/vibes`

**Response**:
```json
[
  { "id": "high-energy", "name": "High Energy", "emoji": "🔥" },
  { "id": "date-night", "name": "Date Night", "emoji": "💕" },
  ...
]
```

---

## Example User Flows

### Flow 1: Quick Vibe Selection (No Conversation)

**User Action**: Clicks "Date Night 💕" button

**System Behavior**:
1. Fetches current weather, time, season
2. Applies date-night vibe template (moderate budget, low energy, romantic)
3. Scores all activities against preferences
4. Returns top 5 ranked activities
5. Displays with reasoning: "Perfect for date-night vibe..."

**Result**: 5 romantic spots like Hugo's, James Turrell Skyspace, etc.

### Flow 2: Conversational Discovery (Max 2 Questions)

**User**: "I want to explore Houston but I'm broke"

**System**:
- Parses: `budget=cheap`, `vibeMode=tourist`
- Asks: "Are you going solo, with a date, friends, or family?"

**User**: "Just me, solo"

**System**:
- Updates: `socialContext=solo`
- Has enough info (2 preferences + vibe mode)
- Generates recommendations immediately
- Shows free/cheap tourist spots: Menil Collection, Buffalo Bayou, etc.

**Result**: 5 budget-friendly solo activities with reasoning

### Flow 3: Weather-Aware Fallback

**User**: "I want to go outside"

**System**:
- Checks weather: 98°F, hot and sunny
- Parses: `indoorOutdoorPref=outdoor`
- Asks: "It's 98°F out there! Still want outdoor activities, or prefer air-conditioned spots?"

**User**: "Actually yeah, let's stay inside"

**System**:
- Updates: `indoorOutdoorPref=indoor`
- Applies heat fallback logic
- Recommends: Museums, tunnels, indoor restaurants

**Result**: 5 air-conditioned activities with heat warning

### Flow 4: Late-Night Cravings

**User**: "It's 2am and I'm hungry"

**System**:
- Detects: `timeOfDay=late-night`, `vibeMode=late-night`
- No questions needed (clear intent)
- Filters for 24-hour restaurants
- Recommends: House of Pies, Katz's Deli, late-night diners

**Result**: 3-5 late-night dining options

---

## System Prompt

Located in: `src/server/services/curator-prompts.ts`

### Key Personality Traits:
- **Friendly but efficient** - Gets to recommendations quickly
- **Opinionated** - Has favorites, makes decisive calls
- **Houston-knowledgeable** - Knows neighborhoods, weather patterns, culture
- **Practical** - Considers logistics (weather, time, proximity)

### Conversation Guidelines:
1. Maximum 2 clarifying questions
2. Format recommendations with brief reasoning
3. Account for current weather and time
4. Stick to 2-3 neighborhoods for geographic proximity
5. End with follow-up prompt

### Houston-Specific Knowledge Embedded:
- Summer heat (June-Sept): 95°F+, outdoor activities best morning/evening
- Neighborhood characters (Montrose = artsy, Heights = family-friendly, etc.)
- Traffic patterns and proximity considerations
- Local favorites vs tourist spots

---

## Recommendation Engine Logic

### Scoring Algorithm (Pseudocode)

```typescript
function scoreActivity(activity, context) {
  let score = activity.popularityScore; // Base score (0-100)

  // Vibe mode match (+25 points for type match)
  if (vibeMode && activity.type in vibeMode.activityTypes) {
    score += 25;
  }

  // Neighborhood match (+15 points)
  if (vibeMode && activity.neighborhood in vibeMode.neighborhoods) {
    score += 15;
  }

  // Energy level match (+20/-10 points)
  if (activity.energyLevel === preferences.energyLevel) {
    score += 20;
  } else {
    score -= 10;
  }

  // Budget match (+15/-15 points)
  if (activity.priceLevel within budgetRange) {
    score += 15;
  } else {
    score -= 15;
  }

  // Time of day match (+20/-10 points)
  if (activity.bestTimeOfDay includes currentTime) {
    score += 20;
  } else {
    score -= 10;
  }

  // Weather considerations
  if (weather.isRaining && activity.isIndoor) {
    score += 30; // Strong preference for indoor in rain
  }
  if (weather.temperature > 95 && activity.weatherDependent) {
    score -= 40; // Strong penalty for outdoor in extreme heat
  }

  // Late-night filtering
  if (timeOfDay === 'late-night' && activity.type in ['bar', 'restaurant']) {
    score += 25; // Boost late-night appropriate activities
  } else if (timeOfDay === 'late-night') {
    score -= 30; // Most things closed
  }

  return Math.max(score, 0); // Never negative
}

function generateRecommendations(context, limit = 5) {
  activities = fetchAllActiveActivities();

  scored = activities.map(activity => ({
    activity,
    score: scoreActivity(activity, context),
    reasoning: generateReasoning(activity, context)
  }));

  sorted = scored.sortBy('score', 'desc');
  diverse = ensureDiversity(sorted); // Max 2 of same type

  return diverse.slice(0, limit);
}

function ensureDiversity(recommendations) {
  diverse = [];
  typeCount = {};

  for (rec of recommendations) {
    type = rec.activity.type;

    // Allow max 2 of same type (e.g., 2 bars, 2 restaurants)
    if (typeCount[type] < 2 || diverse.length < 5) {
      diverse.push(rec);
      typeCount[type] = (typeCount[type] || 0) + 1;
    }
  }

  return diverse;
}
```

### Fallback Logic

When no activities match criteria (score too low):

1. **Relax constraints**: Remove energy level requirement
2. **Expand geography**: Include more neighborhoods
3. **Show top-rated**: Default to highest popularity scores
4. **Suggest alternatives**: "Try a different vibe or tell me more about what you're looking for"

---

## Extensibility to Other Cities

### Steps to Add a New City:

1. **Create city data file**: `src/server/data/[city]-activities.ts`
   - Define activities with same schema
   - Include city-specific neighborhoods, vibes

2. **Update schema** (optional): Add city field if supporting multiple cities simultaneously
   ```typescript
   city: text("city").notNull().default("Houston")
   ```

3. **Create city-specific weather adapter**:
   - Update lat/lng coordinates
   - Adjust temperature thresholds (Houston heat vs Minneapolis cold)

4. **Adjust system prompts**:
   - City-specific knowledge
   - Neighborhood descriptions
   - Local culture and patterns

5. **Add city selection to frontend**:
   - Dropdown or city picker
   - Pass city parameter to API

### Minimal Changes Required:
- All core logic (scoring, diversity, conversation flow) is **city-agnostic**
- Only data (activities, neighborhoods) and context (weather thresholds) need customization

---

## Future Monetization Hooks

### 1. Sponsored Recommendations (Non-Intrusive)
- **Hook location**: `recommendation-engine.ts`, scoring function
- **Implementation**: Add `sponsoredScore` bonus (10-15 points max)
- **Display**: Mark with subtle "Sponsored" badge
- **Constraint**: Never let sponsored activity rank #1 unless organically scored high

```typescript
if (activity.isSponsored && activity.score >= 70) {
  score += 10; // Small boost to quality sponsors only
}
```

### 2. Premium Vibe Modes
- **Hook location**: `preference-parser.ts`, vibe mode templates
- **Examples**:
  - "VIP Experiences" (exclusive venues, high-end)
  - "Hidden Gems Pro" (ultra-local, insider spots)
  - "Foodie Plus" (reservation links, chef insights)
- **Pricing**: $2.99/month or $0.99 per premium recommendation session

### 3. Booking Integration & Affiliate Revenue
- **Hook location**: Activity response object, add `bookingUrl` and `affiliateLink`
- **Partners**: OpenTable (restaurants), Airbnb Experiences, Groupon
- **Implementation**:
  ```typescript
  activity.bookingUrl = generateAffiliateLink(activity);
  ```
- **Revenue**: Commission on bookings made through curator

### 4. "Save & Share Itineraries" Feature
- **Free tier**: Save 3 itineraries
- **Paid tier** ($4.99/month): Unlimited saves, share with friends, export to calendar
- **Hook location**: Add "Save" button in frontend, store in `saved_itineraries` table

### 5. Hyperlocal Partnerships
- **Neighborhood-specific guides**: "Montrose Insiders Club" ($1.99)
- **Seasonal packs**: "Houston Summer Survival Guide" (heat-specific activities)
- **Event packages**: Bundle curator with event calendar access

### 6. B2B White-Label API
- **Target**: Hotels, tourism boards, corporate relocation services
- **Pricing**: Per-API-call or monthly subscription
- **Value prop**: "Plug-and-play local activity recommendations"

### 7. Data & Insights (Anonymous)
- Aggregate user preference data (anonymized)
- Sell trends to Houston businesses: "Most popular activities among 25-34 year olds"
- Pricing: Quarterly reports at $499/report

---

## Environment Variables Required

Add to `.env`:

```bash
# Weather API (sign up at openweathermap.org - free tier available)
OPENWEATHER_API_KEY=your_api_key_here

# Database (already configured)
DATABASE_URL=your_postgres_url

# Optional: Future AI enhancements
# OPENAI_API_KEY=your_key_here  # For more advanced natural language parsing
```

---

## Testing Checklist

### Unit Tests
- [ ] Preference parser extracts correct vibe modes
- [ ] Scoring algorithm weights factors correctly
- [ ] Weather adapter handles API failures gracefully
- [ ] Diversity filter prevents too many of same type

### Integration Tests
- [ ] Conversation flow completes in ≤2 questions
- [ ] Recommendations respect weather constraints
- [ ] Time of day filtering works (late-night only shows 24hr spots)
- [ ] Quick vibes return results without conversation

### User Acceptance Tests
- [ ] Mobile-friendly interface (primary use case)
- [ ] Recommendations are relevant and useful
- [ ] No more than 2 questions asked
- [ ] Weather warnings display when appropriate
- [ ] Links to activity websites work

---

## Performance Considerations

### Database Optimization
- Indexes on: `neighborhood`, `type`, `price_level`, `energy_level`, `is_active`
- Expected query time: <50ms for recommendation generation

### API Response Times
- Target: <500ms end-to-end (including weather API call)
- Weather data cached for 15 minutes (handled by weather adapter)

### Mobile Optimization
- Lazy load activity images
- Progressive enhancement (works without JavaScript)
- Responsive design with mobile-first approach

---

## Maintenance & Updates

### Regular Activity Data Updates
- **Frequency**: Quarterly or as needed
- **Script**: `src/server/scripts/seed-activities.ts` with `updateActivities()` function
- **Process**:
  1. Update `houston-activities.ts` data file
  2. Run: `npm run seed-activities-update`
  3. Verify in production

### Popularity Score Adjustment
- Track user interactions (clicks, saves)
- Periodically update `popularity_score` based on engagement
- Could be automated with analytics integration

---

## Deployment Notes

### Database Migrations
- New tables created automatically on server startup
- Activity data seeded on first run (checks if already exists)
- Safe to re-deploy without data loss

### Feature Flags (Future)
- Consider adding feature flag for A/B testing vibe modes
- Rollout new cities gradually with flag control

---

## Support & Feedback

### User Feedback Collection
- Add "Was this helpful?" button after recommendations
- Track unsuccessful searches (no results) for improvement
- Consider adding free-text feedback form

### Analytics to Track
- Most popular vibe modes
- Average questions asked before recommendation
- Weather impact on indoor vs outdoor preferences
- Neighborhood popularity trends

---

## Summary of Deliverables ✅

1. **System Prompt**: Embedded in `curator-prompts.ts` with Houston-specific knowledge
2. **Example User Flows**: 4 detailed flows covering various scenarios
3. **API Contract**: Complete REST API documentation with request/response examples
4. **Recommendation Logic**: Full scoring algorithm with pseudocode and real TypeScript implementation
5. **Monetization Hooks**: 7 future revenue opportunities with implementation guidance

**Status**: Feature is complete and ready for testing and deployment.
