# Railway Deployment Fix - "Application Failed to Respond"

## The Problem

Your app was showing **"Application failed to respond"** on Railway because of a **critical build-time error**.

### Root Cause

The issue was in `src/server/db.ts` - the DATABASE_URL check was running at **MODULE IMPORT TIME** instead of **RUNTIME**:

```typescript
// OLD CODE (BROKEN) - Runs when module is imported
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}
const client = postgres(connectionString, { max: 10 });
export const db = drizzle(client, { schema });
```

### Why This Failed on Railway

Railway deployment has 2 phases:

1. **Build Phase** (`npm run build`):
   - Runs `vite build && esbuild src/server/index.ts ...`
   - Bundles all code by importing modules
   - **❌ NO environment variables available**
   - ❌ When esbuild imported `db.ts`, it checked for `DATABASE_URL`
   - ❌ `DATABASE_URL` wasn't set → **BUILD FAILED**

2. **Runtime Phase** (`node dist/index.js`):
   - ✅ Environment variables ARE injected by Railway
   - ❗ But this phase never happened because build failed!

### The Timeline

Looking at your commit history:
```
0413c69 - Fix critical bugs preventing app from producing results
29b289a - Merge pull request #27
3ee3df8 - Add health check configuration
6c1e3cb - Fix application startup to prevent 'failed to respond' error
```

Those previous commits tried to fix startup issues, but missed the **build-time** problem.

---

## The Solution

**Commit `46654ae`** implements **lazy initialization** to defer the DATABASE_URL check until runtime:

```typescript
// NEW CODE (FIXED) - Only runs when actually used
let client = null;
let dbInstance = null;

function getClient() {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    client = postgres(process.env.DATABASE_URL, { max: 10 });
    logger.info("✅ PostgreSQL client initialized");
  }
  return client;
}

// Proxy wrapper maintains same API
export const db = new Proxy({}, {
  get(_, prop) { return getDb()[prop]; }
});
```

### How It Works

1. ✅ **Build Phase**: Modules import successfully, no DATABASE_URL check yet
2. ✅ **Runtime Phase**: Railway injects env vars
3. ✅ **First DB Access**: `getClient()` runs, checks DATABASE_URL, creates connection
4. ✅ App starts successfully!

---

## Verifying the Fix

### 1. Check Railway Deployment Logs

After Railway redeploys, you should see:

✅ **Build Phase** (no errors):
```
Running build command: npm run build
> vite build && esbuild src/server/index.ts...
✓ built in 2.3s
Build complete!
```

✅ **Runtime Phase** (successful startup):
```
Initializing database schema...
✅ PostgreSQL client initialized
✅ Database schema initialized successfully
🚀 Server running on port 5000
Environment: production
```

### 2. Test the Endpoints

Once deployed, test these URLs:

```bash
# Health check (should return immediately)
curl https://your-app.railway.app/health

# Should return: {"status":"ok","timestamp":"...","version":"2.0-async-init"}

# Test endpoint (should show server info)
curl https://your-app.railway.app/test

# Should show HTML with server status

# Debug env vars (check which APIs are configured)
curl https://your-app.railway.app/api/debug/env

# Should show which API keys are set
```

### 3. Check for Events

```bash
# Manually trigger a scrape
curl -X POST https://your-app.railway.app/api/scrape

# Check weekend events
curl https://your-app.railway.app/api/events/weekend

# Should return JSON array of events
```

---

## What's in This Deployment

This branch includes **TWO commits**:

### Commit 1: `0413c69` - Weekend Date Bug Fix
- Fixed getNextFriday() logic (was skipping weekends)
- Implemented Google scraper date parsing
- Created shared date utilities

### Commit 2: `46654ae` - Railway Build Fix ⭐
- **Lazy database initialization**
- Defers DATABASE_URL check to runtime
- **Fixes "Application failed to respond" error**

---

## Railway Environment Variables Checklist

Make sure these are set in your Railway dashboard:

### Required
- ✅ `DATABASE_URL` - Your PostgreSQL connection string
  - Should be automatically set if you added a PostgreSQL service
  - Format: `postgresql://user:password@host:5432/database`

### Optional (for better results)
- `TICKETMASTER_API_KEY` - Free 5,000 calls/day
- `SEATGEEK_API_KEY` - Free 5,000 calls/day
- `GOOGLE_API_KEY` - Free 100 queries/day
- `GOOGLE_SEARCH_ENGINE_ID` - For Google Custom Search

### Auto-Set by Railway
- ✅ `PORT` - Railway sets this automatically
- ✅ `NODE_ENV` - Should be "production"

---

## Troubleshooting

### If Deploy Still Fails

1. **Check Railway build logs** for error messages
2. **Verify DATABASE_URL** is set in Railway dashboard
3. **Check database is accessible** from Railway's network
4. **View runtime logs** in Railway dashboard

### If App Starts But No Events

1. Visit `/api/debug/env` to check which APIs are configured
2. Trigger a manual scrape: `curl -X POST /api/scrape`
3. Check the response - it shows how many events were found
4. Web scrapers work without API keys (do713, houstonpress, spacecityrock)

### Common Issues

**"DATABASE_URL environment variable is required"**
- This should now only show at RUNTIME, not during build
- Check that DATABASE_URL is set in Railway dashboard
- Make sure you attached a PostgreSQL database to your Railway project

**"Failed to initialize database schema"**
- Check database connection string is correct
- Verify database is accessible
- Check Railway logs for specific error details

---

## Next Steps

1. ✅ **Wait for Railway to redeploy** (should happen automatically)
2. ✅ **Check the deployment logs** in Railway dashboard
3. ✅ **Test the health endpoint**: `/health`
4. ✅ **Trigger a scrape**: `/api/scrape`
5. ✅ **View events**: Visit your app URL

The app should now work! 🎉

---

## Technical Details

### Why Proxy?

The Proxy wrapper maintains the exact same API:

```typescript
// Old way (still works!)
import { db } from "./db";
await db.select().from(events);

// New way (lazy init happens transparently)
import { db } from "./db";
await db.select().from(events); // ← getClient() runs here, not at import
```

No changes needed to any calling code!

### Environment Variables on Railway

Railway injects environment variables at **runtime**, not build time:

- **Build time**: Only build args are available
- **Runtime**: Full env vars are injected
- **Our fix**: Moved DATABASE_URL access from build → runtime

### Alternative Approaches Considered

1. ❌ **Skip DATABASE_URL check**: Unsafe, would crash later
2. ❌ **Check only in production**: Doesn't help Railway builds
3. ✅ **Lazy initialization**: Clean, safe, maintains same API

---

**Made with 🔧 to fix Railway deployments**
