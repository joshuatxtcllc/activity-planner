# Houston Events Aggregator

Automated event aggregator for Houston, Texas. Scrapes local events from Ticketmaster, Eventbrite, Google Search, and presents them in a clean, simple interface. Perfect for discovering weekend activities without manually checking multiple sites.

## Features

- **Automated Scraping**: Runs every Friday morning to fetch weekend events
- **Multiple Sources**: Ticketmaster, Eventbrite, Google Custom Search
- **Smart Deduplication**: Prevents duplicate events across sources
- **Email Notifications**: Get notified when new events are found
- **Clean UI**: Simple, responsive interface to browse events
- **Production-Ready**: Built with security, rate limiting, and proper logging

## Tech Stack

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL (Neon Serverless)
- Drizzle ORM with migrations
- node-cron for scheduling
- Winston for logging
- Helmet, CORS, rate limiting for security

**Frontend:**
- React 18 + TypeScript
- Vite (fast builds)
- TailwindCSS
- React Query for data fetching
- Wouter for routing

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database (Neon recommended)
- API keys (Ticketmaster, Eventbrite, Google)

### Installation

1. **Clone and install dependencies**
```bash
npm install
```

2. **Set up environment variables**

Copy `.env.example` to `.env` and fill in:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db

# API Keys
TICKETMASTER_API_KEY=your_key_here
EVENTBRITE_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
NOTIFICATION_EMAIL=where_to_send@gmail.com

# Scheduler (runs every Friday at 9 AM by default)
CRON_SCHEDULE=0 9 * * 5

# Server
PORT=5000
NODE_ENV=development
```

3. **Set up database**

Generate and run migrations:
```bash
npm run db:generate
npm run db:migrate
```

Or for quick development, push schema directly:
```bash
npm run db:push
```

4. **Run development server**

```bash
npm run dev
```

Visit http://localhost:5000

### Getting API Keys

**Ticketmaster:**
1. Go to https://developer.ticketmaster.com/
2. Sign up and create an app
3. Copy your API key

**Eventbrite:**
1. Go to https://www.eventbrite.com/platform/
2. Create an account and generate a token
3. Copy your private token

**Google Custom Search:**
1. Go to https://developers.google.com/custom-search/v1/overview
2. Get an API key from Google Cloud Console
3. Create a Custom Search Engine at https://cse.google.com/
4. Configure it to search event sites
5. Copy your Search Engine ID

## Usage

### Manual Scraping

Trigger scraping manually:
```bash
npm run scrape
```

### Scheduled Scraping

The app automatically scrapes events based on `CRON_SCHEDULE`. Default is every Friday at 9 AM.

To enable scheduler in development:
```bash
ENABLE_SCHEDULER=true npm run dev
```

### API Endpoints

**GET /api/events/weekend**
- Returns events for upcoming weekend

**GET /api/events**
- Returns all events
- Query params: `source`, `category`, `upcoming=true`

**GET /api/stats**
- Returns event statistics

**POST /api/scrape**
- Manually trigger scraping

**GET /health**
- Health check endpoint

## Deployment

### Replit

Already configured! Just:
1. Add environment variables in Replit Secrets
2. Deploy using the Deploy button

### Other Platforms

**Build:**
```bash
npm run build
```

**Run:**
```bash
NODE_ENV=production npm start
```

**Environment:**
- Set `NODE_ENV=production`
- Configure all environment variables
- Ensure database is accessible
- Scheduler runs automatically in production

## Project Structure

```
houston-events-aggregator/
├── src/
│   ├── server/
│   │   ├── scrapers/
│   │   │   ├── ticketmaster.ts    # Ticketmaster scraper
│   │   │   ├── eventbrite.ts      # Eventbrite scraper
│   │   │   ├── google.ts          # Google search scraper
│   │   │   └── index.ts           # Orchestrator
│   │   ├── utils/
│   │   │   ├── logger.ts          # Winston logger
│   │   │   ├── mailer.ts          # Email notifications
│   │   │   └── deduplication.ts   # Event deduplication
│   │   ├── db.ts                  # Database connection
│   │   ├── routes.ts              # API routes
│   │   ├── scheduler.ts           # Cron scheduler
│   │   └── index.ts               # Express server
│   ├── client/
│   │   ├── components/
│   │   │   └── EventCard.tsx
│   │   ├── pages/
│   │   │   ├── EventsPage.tsx
│   │   │   └── StatsPage.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   └── shared/
│       └── schema.ts              # Database schema
├── drizzle/                       # Migrations
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example
```

## Database Schema

**events** table:
- `id` - UUID primary key
- `title` - Event name
- `description` - Event description
- `startDate` - Event start time
- `endDate` - Event end time (optional)
- `location` - City, state
- `venue` - Venue name
- `address` - Street address
- `url` - Link to event page
- `imageUrl` - Event image
- `source` - Source (ticketmaster, eventbrite, google)
- `category` - Event category
- `priceMin/Max` - Price range in cents
- `isFree` - Boolean
- `externalId` - ID from source API
- `uniqueKey` - Hash for deduplication
- `scrapedAt` - When scraped
- `createdAt` - When created

## Customization

### Change Schedule

Edit `CRON_SCHEDULE` in `.env`:
```bash
# Every Friday at 9 AM
CRON_SCHEDULE=0 9 * * 5

# Every day at 8 AM
CRON_SCHEDULE=0 8 * * *

# Every Monday and Thursday at 6 PM
CRON_SCHEDULE=0 18 * * 1,4
```

### Add More Scrapers

Create a new file in `src/server/scrapers/`:

```typescript
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";

export async function scrapeYourSource(): Promise<NewEvent[]> {
  // Your scraping logic
  return events;
}
```

Add to `src/server/scrapers/index.ts`:
```typescript
import { scrapeYourSource } from "./your-source";

const results = await Promise.all([
  scrapeTicketmaster(),
  scrapeEventbrite(),
  scrapeGoogle(),
  scrapeYourSource(), // Add here
]);
```

### Customize Location

Current code is hardcoded for Houston, TX. To change:

1. Update scrapers in `src/server/scrapers/*.ts`
2. Change `city` and `stateCode` parameters
3. Update UI text in `src/client/pages/EventsPage.tsx`

## Troubleshooting

**Database connection fails:**
- Check `DATABASE_URL` is correct
- Ensure database is accessible from your network
- For Neon, enable "Enable pooling" connection string

**Scrapers return no events:**
- Verify API keys are valid
- Check API rate limits
- Look at logs: scrapers log detailed info

**Email notifications not sending:**
- Verify SMTP credentials
- For Gmail, use App Password (not regular password)
- Check SMTP_HOST and SMTP_PORT

**Build fails:**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Check Node.js version (needs 20+)

## Contributing

This is a personal project, but feel free to fork and customize for your city!

## License

MIT

## Support

For issues or questions, check the logs first:
```bash
# Development
Check terminal output

# Production
Check logs/ directory or hosting platform logs
```

---

**Enjoy discovering Houston events!** 🎉
