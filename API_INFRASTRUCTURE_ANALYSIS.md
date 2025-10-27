# Activity Planner - API Infrastructure & Backend Analysis

## Overview
This is a full-stack TypeScript application with Express backend and React frontend, using PostgreSQL database with Drizzle ORM. The application runs on a single port (5000) serving both API and frontend.

---

## 1. BACKEND SERVER SETUP

### Technology Stack
- **Server Framework**: Express.js (v4.21.2)
- **Runtime**: Node.js with TypeScript (tsx)
- **Database**: PostgreSQL with Drizzle ORM (v0.39.1)
- **Authentication**: Passport.js with express-session
- **Frontend Build**: Vite
- **Deployment**: Replit autoscale

### Server Files Location
- **Main Server**: `/home/user/activity-planner/server/index.ts`
- **Routes**: `/home/user/activity-planner/server/routes.ts` (29KB - comprehensive)
- **Database**: `/home/user/activity-planner/server/db.ts`
- **Storage**: `/home/user/activity-planner/server/storage.ts`
- **Vite Integration**: `/home/user/activity-planner/server/vite.ts`

### Server Architecture
- Single Express app instance serving both API and static frontend
- Session management with express-session and memory store
- API logging middleware for tracking request/response
- Error handling middleware with JSON responses
- Development mode: Vite middleware with HMR
- Production mode: Static file serving from dist/public

---

## 2. DATABASE & DATA PERSISTENCE

### Database Setup
- **Type**: PostgreSQL with Neon serverless
- **ORM**: Drizzle ORM with type safety
- **Connection**: Requires `DATABASE_URL` environment variable
- **WebSocket Support**: Uses ws module for serverless connections

### Database Schema

#### Users Table
```sql
id (SERIAL PRIMARY KEY)
username (TEXT UNIQUE NOT NULL)
password (TEXT NOT NULL)
```

#### Activities Table
```sql
id (SERIAL PRIMARY KEY)
title (TEXT NOT NULL)
description (TEXT NOT NULL)
category (TEXT NOT NULL)
costLevel (TEXT NOT NULL)
timeCommitment (TEXT NOT NULL)
location (TEXT NOT NULL)
isPrivate (BOOLEAN, default: false)
isFeatured (BOOLEAN, default: false)
seasonality (TEXT ARRAY NOT NULL)
imageUrl (TEXT)
eventUrl (TEXT)
contactInfo (TEXT)
rating (INTEGER)
date (TEXT)
tags (JSONB NOT NULL)
coordinates (JSONB)
venue (TEXT)
venueName (TEXT)
isUserAdded (BOOLEAN, default: true)
externalIds (JSONB)
dateAdded (TIMESTAMP DEFAULT NOW())
lastSelected (TIMESTAMP)
timesSelected (INTEGER, default: 0)
attendees (INTEGER, default: 0)
icon (TEXT NOT NULL)
iconBgClass (TEXT NOT NULL)
```

#### Tags Table
```sql
id (SERIAL PRIMARY KEY)
name (TEXT NOT NULL)
color (TEXT NOT NULL)
activityId (INTEGER FOREIGN KEY -> activities.id)
```

### Storage Layer
- **Type**: Database-backed storage (`DatabaseStorage` class)
- **Fallback**: In-memory storage (`MemStorage` class for testing)
- **Active Implementation**: DatabaseStorage with Drizzle ORM

---

## 3. BACKEND API ENDPOINTS

### Host & Port
- **Server Address**: `0.0.0.0:5000`
- **API Base Path**: `/api/`
- **Environment**: Single instance for both API and frontend

### Core Activity Management APIs

#### 1. GET `/api/activities`
- **Purpose**: Fetch all activities
- **Response**: Array of Activity objects
- **Status Codes**: 200 (success), 500 (server error)

#### 2. GET `/api/activities/:id`
- **Purpose**: Fetch specific activity by ID
- **Response**: Activity object
- **Status Codes**: 200 (success), 404 (not found), 500 (server error)

#### 3. POST `/api/activities`
- **Purpose**: Create new activity
- **Body Requirements**: 
  ```json
  {
    "title": "string (REQUIRED)",
    "location": "string (REQUIRED)",
    "description": "string",
    "category": "string",
    "costLevel": "string",
    "timeCommitment": "string",
    "seasonality": "string[]",
    "tags": "object[]",
    "imageUrl": "string",
    "eventUrl": "string",
    "icon": "string",
    "iconBgClass": "string"
  }
  ```
- **Validation**: Title and location are required
- **Status Codes**: 201 (created), 400 (bad request), 500 (server error)

#### 4. PUT `/api/activities/:id`
- **Purpose**: Update existing activity
- **Body**: Partial activity object
- **Status Codes**: 200 (success), 404 (not found), 500 (server error)

#### 5. DELETE `/api/activities/:id`
- **Purpose**: Delete activity
- **Status Codes**: 204 (no content), 404 (not found), 500 (server error)

#### 6. POST `/api/activities/:id/select`
- **Purpose**: Increment activity selection count and update last_selected timestamp
- **Response**: Updated activity object
- **Status Codes**: 200 (success), 404 (not found), 500 (server error)

### Third-Party Event API Proxies

#### 1. Ticketmaster API Proxy
**Endpoint**: `GET /api/proxy/ticketmaster`

**Query Parameters**:
- `apiKey` (REQUIRED): Ticketmaster API key
- `latitude` (REQUIRED): User latitude
- `longitude` (REQUIRED): User longitude
- `radius` (OPTIONAL): Search radius in km (default: 25)

**Functionality**:
- Forwards requests to Ticketmaster Discovery v2 API
- Fetches 50 events (music, sports, arts, film, miscellaneous)
- Filters for future events only
- Includes venue and pricing information

**Response**: Ticketmaster events JSON with embedded venue and image data

#### 2. Eventbrite API Proxy
**Endpoint**: `GET /api/proxy/eventbrite`

**Query Parameters**:
- `apiKey` (REQUIRED): Eventbrite API key (OAuth token)
- `latitude` (REQUIRED): User latitude
- `longitude` (REQUIRED): User longitude
- `radius` (OPTIONAL): Search radius in km (default: 25)

**Functionality**:
- Proxies to Eventbrite v3 Events Search API
- Requires Bearer token authentication
- Expands venue, category, ticket_availability
- Sorts by date

**Response**: Eventbrite events with availability and category data

#### 3. TripAdvisor Location Search Proxy
**Endpoint**: `GET /api/proxy/tripadvisor/location`

**Query Parameters**:
- `apiKey` (REQUIRED): TripAdvisor API key
- `latitude` (REQUIRED): User latitude
- `longitude` (REQUIRED): User longitude

**Functionality**:
- Location search for attractions in specified coordinates
- Fixed 25km radius search
- Returns location metadata for attraction filtering

**Response**: TripAdvisor location objects

#### 4. TripAdvisor Attractions Proxy
**Endpoint**: `GET /api/proxy/tripadvisor/attractions`

**Query Parameters**:
- `apiKey` (REQUIRED): TripAdvisor API key
- `locationId` (REQUIRED): Location ID from location search

**Functionality**:
- Fetches attractions for a specific TripAdvisor location
- Returns up to 20 attractions with details
- Includes ratings and descriptions

**Response**: TripAdvisor attractions array

### Google Search API Proxy

**Endpoint**: `GET /api/proxy/google-search`

**Query Parameters**:
- `q` (REQUIRED): Search query

**Functionality**:
- Proxies to Google Custom Search JSON API
- Automatically appends "events" to query if not present
- Extracts date and venue information from snippets
- Falls back to mock data if API credentials missing
- Limits results to last 2 weeks (date restriction: w2)

**Response**: Array of search results with:
```json
[
  {
    "title": "string",
    "link": "string",
    "snippet": "string",
    "formattedDate": "string",
    "venue": "string",
    "image": "string (optional)"
  }
]
```

### Instagram Integration APIs

#### 1. OAuth Authentication Flow
**Endpoint**: `GET /api/instagram/auth`

**Functionality**:
- Initiates Instagram OAuth (real) or simulated auth (Replit)
- In Replit: Creates simulated session tokens
- In production: Redirects to Instagram's OAuth endpoint
- Stores state token in session for CSRF protection

**Response**: Redirect to `/wheel?instagram=connected`

#### 2. OAuth Callback Handler
**Endpoint**: `GET /api/instagram/callback`

**Query Parameters**:
- `code`: Authorization code from Instagram
- `state`: CSRF state verification token

**Functionality**:
- Exchanges authorization code for access token
- Validates state parameter to prevent CSRF attacks
- Stores access token and user ID in session

**Response**: Redirect to `/wheel?instagram=connected`

#### 3. Get Instagram User Profile
**Endpoint**: `GET /api/instagram/user`

**Functionality**:
- Requires active session with Instagram token
- Returns user profile: id, username, name, profile_picture
- In Replit: Returns simulated profile

**Response**: 
```json
{
  "id": "string",
  "username": "string",
  "name": "string",
  "profile_picture": "string"
}
```

#### 4. Get Instagram Media
**Endpoint**: `GET /api/instagram/media`

**Functionality**:
- Requires active session with Instagram token
- Returns user's recent media posts with captions
- In Replit: Returns 4 simulated sample posts with activity data
- Fields: id, caption, media_type, media_url, permalink, timestamp, username

**Response**: 
```json
{
  "data": [
    {
      "id": "string",
      "caption": "string",
      "media_type": "IMAGE|VIDEO|CAROUSEL",
      "media_url": "string",
      "permalink": "string",
      "thumbnail_url": "string",
      "timestamp": "ISO string",
      "username": "string"
    }
  ]
}
```

#### 5. Check Instagram Connection Status
**Endpoint**: `GET /api/instagram/status`

**Response**: 
```json
{
  "connected": "boolean"
}
```

#### 6. Logout / Disconnect Instagram
**Endpoint**: `GET /api/instagram/logout`

**Response**: 
```json
{
  "success": true
}
```

---

## 4. FRONTEND API CONFIGURATION & SERVICE LAYER

### Configuration Files

#### API Config `/client/src/lib/apiConfig.ts`
Defines external API configurations:

```typescript
{
  tripadvisor: {
    keyEnvVar: "VITE_TRIPADVISOR_API_KEY",
    baseUrl: "https://api.tripadvisor.com/api/v1"
  },
  ticketmaster: {
    keyEnvVar: "VITE_TICKETMASTER_API_KEY",
    baseUrl: "https://app.ticketmaster.com/discovery/v2"
  },
  eventbrite: {
    keyEnvVar: "VITE_EVENTBRITE_API_KEY",
    baseUrl: "https://www.eventbriteapi.com/v3"
  }
}
```

### Service Layer / API Clients

#### 1. Activity Service (`activityService.ts`)
- Interfaces for external activity sources
- `fetchAggregatedActivities()`: Simulated aggregation from multiple sources
- `convertToActivityType()`: Format conversion utility
- Mock implementation with sample data

**Status**: PARTIALLY IMPLEMENTED - Currently mock data, ready for real API integration

#### 2. Local Events Service (`localEventsService.ts`)
- `fetchLocalEvents()`: Fetch from backend `/api/local-events` endpoint (NOT IMPLEMENTED)
- `fetchTicketmasterEvents()`: Direct client-side Ticketmaster calls (with CORS issues)
- `fetchEventbriteEvents()`: Placeholder (not implemented)
- `fetchTripAdvisorEvents()`: Placeholder (not implemented)
- `getUserLocation()`: Browser geolocation API
- `setUserLocation()`: Set custom location
- `getLocalEvents()`: Main orchestration function

**Status**: PARTIALLY FUNCTIONAL
- Ticketmaster: Partially working (CORS issues without proxy)
- Backend proxy: Not yet implemented in routes
- Eventbrite/TripAdvisor: Placeholders only

#### 3. Google Events Search (`googleEventsSearch.ts`)
- `searchGoogleEvents()`: Calls `/api/proxy/google-search`
- Supports query, location, date, event type filtering
- Fallback to mock data if API keys missing

**Status**: FUNCTIONAL - Connected to proxy endpoint

#### 4. Online Events Search (`onlineEventsSearch.ts`)
- `searchOnlineEvents()`: Simulated event search
- Category filtering: music, art, food, nightlife, theater, workshops
- Location and query filtering
- Returns paginated results

**Status**: MOCK ONLY - No real API integration

#### 5. Calendar Service (`calendarService.ts`)
- `activityToCalendarEvent()`: Convert activity to calendar format
- `generateGoogleCalendarUrl()`: Create Google Calendar add event URL
- `generateAppleCalendarUrl()`: Create Apple Calendar iCal
- `generateOutlookCalendarUrl()`: Create Outlook calendar URL
- `generateYahooCalendarUrl()`: Create Yahoo Calendar URL
- `addToCalendar()`: Trigger calendar add action

**Status**: FULLY FUNCTIONAL - Works with calendar APIs

### React Query Client (`queryClient.ts`)
- Custom fetch implementation with credentials
- Configured with 1-minute stale time
- Error handling with 401 unauthorized checks
- Endpoint-based query key system

### Frontend API Calls Made
```
/api/activities (GET, POST)
/api/activities/:id (GET, PUT, DELETE)
/api/activities/:id/select (POST)
/api/instagram/media (GET)
/api/instagram/user (GET)
/api/instagram/status (GET)
/api/local-events (GET) - NOT YET IMPLEMENTED
/api/proxy/google-search (GET)
/api/proxy/ticketmaster (GET)
/api/proxy/eventbrite (GET)
/api/proxy/tripadvisor/location (GET)
/api/proxy/tripadvisor/attractions (GET)
```

---

## 5. ENVIRONMENT CONFIGURATION

### Server Environment Variables
**File**: `.env.example`

```
# API Keys
VITE_TICKETMASTER_API_KEY=your-ticketmaster-api-key
VITE_EVENTBRITE_API_KEY=your-eventbrite-api-key
VITE_TRIPADVISOR_API_KEY=your-tripadvisor-api-key

# Server Configuration
SESSION_SECRET=your-secure-session-secret
DATABASE_URL=your-database-connection-string

# Instagram OAuth (optional, not in .env.example)
INSTAGRAM_APP_ID=your-instagram-app-id
INSTAGRAM_APP_SECRET=your-instagram-app-secret

# Google Search API (optional)
GOOGLE_SEARCH_API_KEY=your-google-api-key
GOOGLE_SEARCH_ENGINE_ID=your-custom-search-engine-id
```

### Environment Variable Usage
- **Client-side** (Vite): VITE_* prefixed variables only
- **Server-side** (Node): All process.env variables
- **Session Secret**: Default fallback: "instagram-activity-wheel-secret"
- **Cookie Security**: Secure flag enabled in production (NODE_ENV === "production")

---

## 6. DATABASE CONNECTION & PERSISTENCE

### Connection Details
- **Type**: PostgreSQL (Neon serverless)
- **Connection Required**: DATABASE_URL environment variable
- **WebSocket Support**: Configured for serverless environments
- **ORM Initialization**: Drizzle ORM with schema from shared/schema.ts

### Schema Management
- **Configuration File**: `drizzle.config.ts`
- **Schema Location**: `shared/schema.ts`
- **Migration Output**: `migrations/` directory
- **Commands**: 
  - `npm run db:push`: Push schema to database

### Data Models
See Schema section above for complete table definitions.

---

## 7. DEPLOYMENT & INFRASTRUCTURE

### Replit Configuration (`.replit`)

**Build Process**:
```
sh -c "npm run build"
```
- Vite builds client to `dist/public`
- ESBuild bundles server to `dist/index.js`

**Run Process**:
```
sh -c "node dist/index.js"
```
- Starts Express server on port 5000
- Serves pre-built static files

**Modules**: nodejs-20, web, postgresql-16

**Port Mapping**:
- Local: 5000
- External: 80 (HTTP)
- Single port for both API and frontend

**Deployment Target**: Autoscale

### Build Scripts
```json
{
  "dev": "tsx server/index.ts",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc",
  "db:push": "drizzle-kit push"
}
```

---

## 8. FUNCTIONAL STATUS SUMMARY

### Fully Implemented & Working
1. ✅ Core activity CRUD operations (GET, POST, PUT, DELETE)
2. ✅ Activity selection tracking (POST /api/activities/:id/select)
3. ✅ Google Custom Search proxy with fallback data
4. ✅ Instagram OAuth flow (simulated in Replit, real in production)
5. ✅ Instagram user/media endpoints
6. ✅ Session management with express-session
7. ✅ Database storage with Drizzle ORM
8. ✅ Calendar export (Google, Outlook, Apple, Yahoo, iCal)
9. ✅ Ticketmaster API proxy
10. ✅ Eventbrite API proxy
11. ✅ TripAdvisor API proxies (location & attractions)

### Partially Implemented
1. ⚠️ Local events service - has Ticketmaster fetching but backend proxy not fully utilized
2. ⚠️ Event aggregation - mock data only, no real multi-source aggregation
3. ⚠️ Location-based filtering - basic functionality, could be improved

### Not Yet Implemented
1. ❌ Backend `/api/local-events` endpoint (referenced but not in routes.ts)
2. ❌ Online events search backend integration
3. ❌ Real multi-source event aggregation
4. ❌ User authentication/authorization (routes exist but no middleware)
5. ❌ Activity filtering and search endpoints
6. ❌ Activity sorting and pagination endpoints
7. ❌ User profile management endpoints
8. ❌ Tag management endpoints
9. ❌ Activity sharing/collaboration features

---

## 9. API RELIABILITY & ERROR HANDLING

### Error Handling Strategies
- **Fallback Data**: Google Search API has built-in fallback to mock data
- **Graceful Degradation**: Instagram endpoints return simulated data in Replit
- **Error Logging**: Express middleware logs all /api/* requests
- **HTTP Status Codes**: Proper status codes returned (201, 204, 400, 404, 500)
- **JSON Error Messages**: Consistent error response format

### Session Management
- **Strategy**: Express-session with memory store (in-memory)
- **Cookie Security**: Secure flag in production, httpOnly by default
- **Duration**: 7 days (604,800,000 ms)
- **State Protection**: CSRF state validation for OAuth

---

## 10. EXTERNAL API DEPENDENCIES

### Required API Keys
1. **Ticketmaster**: ticketmaster.com/apis
2. **Eventbrite**: eventbrite.com/api
3. **TripAdvisor**: tripadvisor.com/content-api
4. **Google Custom Search**: google.com/programmable-search
5. **Instagram Graph API** (optional): instagram.com/graph-api

### CORS Handling
- Direct client-to-external-API calls: **CORS issues** (blocked by browsers)
- Backend proxy endpoints: **CORS solved** (backend acts as intermediary)
- Recommended: Use proxy endpoints for all external APIs

### Rate Limiting
- Ticketmaster: No specific rate limiting mentioned
- Google Custom Search: 100 free queries/day (requires API key)
- Instagram: Subject to Instagram API rate limits

---

## 11. RECOMMENDATIONS

### Priority Fixes
1. **Implement `/api/local-events` endpoint** - Currently referenced but missing
2. **Add proper CORS headers** - Enable frontend to call proxy endpoints
3. **Implement user authentication** - Session/JWT for protected routes
4. **Add request validation** - Zod schemas for all endpoints
5. **Implement caching** - Redis for frequently accessed data

### Improvements
1. Consolidate duplicate API fetching logic in services
2. Add comprehensive error logging and monitoring
3. Implement rate limiting on backend proxies
4. Add database connection pooling
5. Add request/response compression
6. Implement proper database migrations (Drizzle Kit)
7. Add integration tests for API endpoints
8. Add API documentation (Swagger/OpenAPI)

### Performance Optimizations
1. Implement database query caching
2. Add pagination to activity endpoints
3. Implement search indexing for full-text search
4. Add CDN for static assets
5. Implement connection pooling for database

---

## File References

### Server
- `/home/user/activity-planner/server/index.ts` - Main Express app
- `/home/user/activity-planner/server/routes.ts` - All API routes
- `/home/user/activity-planner/server/db.ts` - Database connection
- `/home/user/activity-planner/server/storage.ts` - Storage layer

### Client Services
- `/home/user/activity-planner/client/src/lib/apiConfig.ts` - API configurations
- `/home/user/activity-planner/client/src/lib/activityService.ts` - Activity service
- `/home/user/activity-planner/client/src/lib/localEventsService.ts` - Local events
- `/home/user/activity-planner/client/src/lib/googleEventsSearch.ts` - Google search
- `/home/user/activity-planner/client/src/lib/onlineEventsSearch.ts` - Online events
- `/home/user/activity-planner/client/src/lib/calendarService.ts` - Calendar integration
- `/home/user/activity-planner/client/src/lib/queryClient.ts` - React Query config

### Configuration
- `/home/user/activity-planner/.env.example` - Environment variables
- `/home/user/activity-planner/drizzle.config.ts` - Drizzle ORM config
- `/home/user/activity-planner/vite.config.ts` - Vite build config
- `/home/user/activity-planner/.replit` - Replit deployment config

### Database
- `/home/user/activity-planner/shared/schema.ts` - Drizzle schema definitions
- `/home/user/activity-planner/migrations/` - Database migrations

