# Houston Events Aggregator

**Never miss another Houston event!** This app automatically scrapes weekend events from Ticketmaster, Eventbrite, and Google Search every Friday morning, delivering them in a clean interface so you always know what's happening in Houston.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)

## Why This App?

**Your objective:** Be informed of all fun activities and events in Houston so you can attend

**This app solves that by:**
- 🤖 Automatically scraping events every Friday (no manual work!)
- 📧 Emailing you when new events are found
- 🎯 Aggregating from multiple sources (Ticketmaster, Eventbrite, Google)
- 🗓️ Focusing on weekend events (when you're actually free)
- 🔄 De-duplicating so you don't see the same event twice

## Features

### Core Functionality
- 🤖 **Automated Scraping** - Runs every Friday at 9 AM to fetch weekend events
- 🎯 **Multiple Sources** - Aggregates from Ticketmaster, Eventbrite, and Google Custom Search
- 🔄 **Smart Deduplication** - Prevents duplicate events using unique hash keys
- 📧 **Email Notifications** - Get notified when new events are discovered
- 🗓️ **Weekend Focus** - Automatically filters and displays upcoming weekend events
- 📊 **Event Statistics** - Track scraping results and event counts

### Technical Features
- 🔒 **Production-Ready** - Security with Helmet, CORS, rate limiting
- 🪵 **Comprehensive Logging** - Winston logging for debugging and monitoring
- 💾 **PostgreSQL Database** - Persistent storage with Drizzle ORM
- ⚡ **Fast Build** - Vite for lightning-fast frontend development
- 📱 **Responsive Design** - TailwindCSS for mobile-friendly interface

## Tech Stack

### Backend
- **Runtime:** Node.js 20+ with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL (Neon Serverless recommended)
- **ORM:** Drizzle ORM with schema migrations
- **Scheduling:** node-cron for automated scraping
- **Logging:** Winston with structured logging
- **Security:** Helmet, CORS, express-rate-limit

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite 5
- **Styling:** TailwindCSS 3
- **Data Fetching:** React Query (TanStack Query)
- **Routing:** Wouter (lightweight routing)

### APIs & Integrations
- Ticketmaster Discovery API
- Eventbrite API v3
- Google Custom Search JSON API

## Quick Start

### Prerequisites

- Node.js 20 or higher
- PostgreSQL database (Neon Serverless recommended for easy setup)
- API keys from event providers (see [Getting API Keys](#getting-api-keys))

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd activity-planner
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```bash
# Database (required)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# API Keys (required)
TICKETMASTER_API_KEY=your_ticketmaster_key
EVENTBRITE_API_KEY=your_eventbrite_key
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id

# Email Notifications (optional but recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
NOTIFICATION_EMAIL=where_to_send@gmail.com

# Scheduler (optional, defaults shown)
CRON_SCHEDULE=0 9 * * 5  # Every Friday at 9 AM

# Server (optional, defaults shown)
PORT=5000
NODE_ENV=development
```

4. **Set up the database**

Generate migration files:
```bash
npm run db:generate
```

Run migrations:
```bash
npm run db:migrate
```

Or for quick development, push schema directly:
```bash
npm run db:push
```

5. **Start the development server**

```bash
npm run dev
```

Visit http://localhost:5000 to see your app!

### Getting API Keys

#### Ticketmaster API
1. Visit [Ticketmaster Developer Portal](https://developer.ticketmaster.com/)
2. Create a free account
3. Register a new app
4. Copy your **Consumer Key** (this is your API key)
5. Free tier: 5,000 API calls/day

#### Eventbrite API
1. Visit [Eventbrite Platform](https://www.eventbrite.com/platform/)
2. Sign in or create an account
3. Go to Account Settings → Developer Links → API Keys
4. Create a Private Token
5. Copy your OAuth token
6. Free tier: Generous limits for personal use

#### Google Custom Search API
1. **Get API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable "Custom Search API"
   - Go to Credentials → Create Credentials → API Key
   - Copy your API key

2. **Create Custom Search Engine:**
   - Visit [Google Programmable Search Engine](https://programmablesearchengine.google.com/)
   - Click "Add" to create a new search engine
   - In "Sites to search," enter: `eventbrite.com, ticketmaster.com, do713.com`
   - Enable "Search the entire web"
   - Click "Create"
   - Go to "Edit search engine" → "Setup" → Copy your **Search engine ID**

3. Free tier: 100 queries/day

## Usage

### Manual Event Scraping

Trigger a manual scrape:
```bash
npm run scrape
```

This will:
1. Fetch events from all sources (Ticketmaster, Eventbrite, Google)
2. Deduplicate against existing events
3. Save new events to database
4. Display results summary

### Automated Scheduling

The app automatically runs the scraper based on `CRON_SCHEDULE` in production.

**Default schedule:** Every Friday at 9 AM
```bash
CRON_SCHEDULE=0 9 * * 5
```

**Common schedules:**
```bash
# Every day at 8 AM
CRON_SCHEDULE=0 8 * * *

# Every Monday and Thursday at 6 PM
CRON_SCHEDULE=0 18 * * 1,4

# Every 6 hours
CRON_SCHEDULE=0 */6 * * *
```

To enable scheduler in development:
```bash
ENABLE_SCHEDULER=true npm run dev
```

### API Endpoints

#### `GET /api/events/weekend`
Returns events for the upcoming weekend (Friday-Sunday).

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Concert at Discovery Green",
    "description": "Live music event...",
    "startDate": "2025-11-15T19:00:00Z",
    "location": "Houston, TX",
    "venue": "Discovery Green",
    "url": "https://...",
    "imageUrl": "https://...",
    "source": "ticketmaster",
    "category": "music",
    "isFree": false,
    "priceMin": 2500,
    "priceMax": 7500
  }
]
```

#### `GET /api/events`
Returns all events with optional filtering.

**Query Parameters:**
- `source` - Filter by source (ticketmaster, eventbrite, google)
- `category` - Filter by category (music, sports, arts, etc.)
- `upcoming=true` - Only show future events

**Example:**
```bash
GET /api/events?category=music&upcoming=true
```

#### `GET /api/stats`
Returns scraping and event statistics.

**Response:**
```json
{
  "totalEvents": 156,
  "bySource": {
    "ticketmaster": 89,
    "eventbrite": 45,
    "google": 22
  },
  "lastScraped": "2025-11-10T09:00:00Z"
}
```

#### `POST /api/scrape`
Manually trigger event scraping (rate limited).

**Response:**
```json
{
  "total": 127,
  "new": 34,
  "duplicates": 93
}
```

#### `GET /health`
Health check endpoint for monitoring.

## Deployment

### Deploy to Replit (Easiest)

1. **Import your repository** to Replit
2. **Add Secrets** (Environment Variables):
   - Go to Tools → Secrets
   - Add all variables from `.env.example`
3. **Click Deploy** button
4. Done! Replit handles everything automatically

The `.replit` config is already set up for you.

### Deploy to Other Platforms

#### Build for Production

```bash
npm run build
```

This creates:
- `dist/public/` - Frontend static files
- `dist/index.js` - Backend server bundle

#### Run in Production

```bash
NODE_ENV=production npm start
```

#### Platform-Specific Tips

**Heroku:**
```bash
# Procfile
web: npm start
```

**Railway:**
- Set `NODE_ENV=production`
- Railway auto-detects Node.js
- Add environment variables in dashboard

**Fly.io:**
```bash
fly launch
fly secrets set DATABASE_URL=...
fly deploy
```

**Docker:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### Environment Variables Checklist

**Required:**
- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `TICKETMASTER_API_KEY`
- ✅ `EVENTBRITE_API_KEY`
- ✅ `GOOGLE_API_KEY`
- ✅ `GOOGLE_SEARCH_ENGINE_ID`

**Recommended:**
- 📧 `SMTP_*` variables for email notifications
- ⏰ `CRON_SCHEDULE` for custom scraping schedule

**Optional:**
- `PORT` (default: 5000)
- `NODE_ENV` (default: development)

## Project Structure

```
houston-events-aggregator/
├── src/
│   ├── server/                    # Backend code
│   │   ├── scrapers/
│   │   │   ├── ticketmaster.ts    # Ticketmaster scraper
│   │   │   ├── eventbrite.ts      # Eventbrite scraper
│   │   │   ├── google.ts          # Google search scraper
│   │   │   └── index.ts           # Scraper orchestrator
│   │   ├── utils/
│   │   │   ├── logger.ts          # Winston logger config
│   │   │   ├── mailer.ts          # Email notifications
│   │   │   └── deduplication.ts   # Event deduplication logic
│   │   ├── db.ts                  # Database connection
│   │   ├── routes.ts              # Express API routes
│   │   ├── scheduler.ts           # Cron job scheduler
│   │   └── index.ts               # Express server setup
│   ├── client/                    # Frontend code
│   │   ├── components/
│   │   │   └── EventCard.tsx      # Event display component
│   │   ├── pages/
│   │   │   ├── EventsPage.tsx     # Main events page
│   │   │   └── StatsPage.tsx      # Statistics page
│   │   ├── App.tsx                # React app root
│   │   ├── main.tsx               # React entry point
│   │   └── index.css              # Global styles
│   └── shared/
│       └── schema.ts              # Drizzle database schema
├── drizzle/                       # Database migrations
├── .env.example                   # Environment template
├── package.json                   # Dependencies & scripts
├── tsconfig.json                  # TypeScript config
├── vite.config.ts                 # Vite build config
├── tailwind.config.ts             # Tailwind CSS config
└── drizzle.config.ts              # Drizzle ORM config
```

## Database Schema

The `events` table stores all scraped events:

```typescript
{
  id: UUID (primary key)

  // Event Info
  title: string (required)
  description: string (optional)

  // Date & Time
  startDate: timestamp (required)
  endDate: timestamp (optional)

  // Location
  location: string (required)        // "Houston, TX"
  venue: string (optional)            // "Toyota Center"
  address: string (optional)          // "123 Main St"

  // Links & Media
  url: string (required)              // Link to event page
  imageUrl: string (optional)         // Event poster/image

  // Classification
  source: string (required)           // ticketmaster|eventbrite|google
  category: string (optional)         // music|sports|arts|food|etc

  // Pricing
  priceMin: integer (optional)        // In cents
  priceMax: integer (optional)        // In cents
  isFree: boolean (default: false)

  // Metadata
  externalId: string (optional)       // ID from source API
  uniqueKey: string (unique)          // Hash for deduplication
  scrapedAt: timestamp (auto)
  createdAt: timestamp (auto)
}
```

## Customization

### Change Target City

Currently hardcoded for Houston, TX. To change:

1. **Update scrapers** in `src/server/scrapers/*.ts`:
```typescript
// Example: Change to Austin, TX
const city = "Austin";
const stateCode = "TX";
const latitude = 30.2672;
const longitude = -97.7431;
```

2. **Update UI text** in `src/client/pages/EventsPage.tsx`:
```typescript
<h2>This Weekend in Austin</h2>
```

### Add More Event Sources

Create a new scraper in `src/server/scrapers/`:

```typescript
// src/server/scrapers/newsource.ts
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";

export async function scrapeNewSource(): Promise<NewEvent[]> {
  const events: NewEvent[] = [];

  // Your scraping logic here
  // Fetch from API, parse HTML, etc.

  return events.map(event => ({
    ...event,
    uniqueKey: generateEventHash(event.title, event.startDate, event.location)
  }));
}
```

Add to orchestrator (`src/server/scrapers/index.ts`):
```typescript
import { scrapeNewSource } from "./newsource";

const results = await Promise.all([
  scrapeTicketmaster(),
  scrapeEventbrite(),
  scrapeGoogle(),
  scrapeNewSource(), // Add here
]);
```

### Customize Email Notifications

Edit `src/server/utils/mailer.ts` to customize email templates and logic.

### Change Scraping Schedule

Edit `CRON_SCHEDULE` in `.env`:
```bash
# Every Friday at 9 AM (default)
CRON_SCHEDULE=0 9 * * 5

# Every day at midnight
CRON_SCHEDULE=0 0 * * *

# Twice a week: Wednesday and Sunday at 6 PM
CRON_SCHEDULE=0 18 * * 0,3
```

[Cron expression reference](https://crontab.guru/)

## Troubleshooting

### Database Connection Issues

**Error:** `Connection timeout` or `Cannot connect to database`

**Solutions:**
- Verify `DATABASE_URL` is correct
- Check database is accessible from your network
- For Neon: Use the "pooled connection" string
- Test connection: `psql $DATABASE_URL`

### No Events Being Scraped

**Error:** Scraper runs but returns 0 events

**Solutions:**
- Verify API keys are valid and active
- Check API rate limits haven't been exceeded
- Review logs for API error messages
- Test APIs individually: `npm run scrape`
- Ensure date range includes future events

### Email Notifications Not Working

**Error:** SMTP connection fails or emails not sending

**Solutions:**
- For Gmail: Use [App Password](https://support.google.com/accounts/answer/185833), not regular password
- Verify `SMTP_HOST` and `SMTP_PORT` are correct
- Check firewall isn't blocking SMTP ports
- Test with online SMTP testing tools

### Build Failures

**Error:** TypeScript errors or build fails

**Solutions:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json dist
npm install

# Verify Node.js version
node --version  # Should be 20+

# Check for TypeScript errors
npm run build
```

### Scheduler Not Running

**Error:** Cron jobs not executing

**Solutions:**
- In development, scheduler is disabled by default
- Enable with: `ENABLE_SCHEDULER=true npm run dev`
- In production, scheduler runs automatically
- Verify `CRON_SCHEDULE` format is valid
- Check logs for scheduler startup messages

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload

# Building
npm run build            # Build for production
npm start                # Run production build

# Database
npm run db:generate      # Generate migration files
npm run db:migrate       # Run migrations
npm run db:push          # Push schema (dev only)

# Scraping
npm run scrape           # Manual scrape (test mode)

# Code Quality
npm run lint             # Lint code
npm run format           # Format with Prettier
npm test                 # Run tests
```

### Adding Features

1. **New API endpoint:**
   - Add route in `src/server/routes.ts`
   - Update types in `src/shared/schema.ts` if needed

2. **New UI component:**
   - Create in `src/client/components/`
   - Import in relevant page

3. **Database changes:**
   - Edit `src/shared/schema.ts`
   - Run `npm run db:generate`
   - Review migration in `drizzle/` folder
   - Run `npm run db:migrate`

## Performance & Limits

### API Rate Limits

**Ticketmaster:**
- 5,000 requests/day (free tier)
- 5 requests/second max

**Eventbrite:**
- Generous limits for personal use
- ~1,000 requests/hour typical

**Google Custom Search:**
- 100 queries/day (free tier)
- Can purchase more: $5/1,000 queries

### Database Considerations

- Each scraping run adds 50-200 events typically
- Deduplication prevents duplicates
- Old events are NOT auto-deleted (add cleanup if needed)
- For 1 year: ~10,000-20,000 events expected

### Scaling Tips

- Use Redis for caching API responses
- Implement database connection pooling (already configured for Neon)
- Add pagination to API endpoints
- Consider archiving old events

## Security

### Best Practices Implemented

- ✅ **Helmet.js** - Security headers
- ✅ **CORS** - Cross-origin protection
- ✅ **Rate Limiting** - Prevent abuse
- ✅ **Environment Variables** - Secrets not in code
- ✅ **Input Validation** - Zod schemas
- ✅ **SQL Injection Protection** - Parameterized queries (Drizzle ORM)

### Additional Recommendations

- Use HTTPS in production
- Rotate API keys periodically
- Monitor logs for suspicious activity
- Keep dependencies updated: `npm audit`
- Use secure database credentials

## Contributing

This is a personal project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License - feel free to use this project for any purpose!

## Acknowledgments

- Event data from Ticketmaster, Eventbrite, and Google
- Built with amazing open-source tools
- Inspired by the need to never miss Houston weekend events!

## Support

**Found a bug?** Open an issue on GitHub

**Need help?** Check logs first:
```bash
# Development
Check terminal output

# Production
Check hosting platform logs or logs/ directory
```

**Want a new feature?** Open a feature request issue!

---

**Made with ❤️ for Houston event-goers**

*Never miss out on weekend fun again!*
