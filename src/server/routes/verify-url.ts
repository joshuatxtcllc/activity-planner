import { Router } from "express";
import { db } from "../db";
import { events } from "../../shared/schema";
import { eq, and, ilike } from "drizzle-orm";
import logger from "../utils/logger";

const router = Router();

/**
 * Trusted ticket seller domains and their official names.
 * Used to verify that a URL belongs to a legitimate ticket platform.
 */
const VERIFIED_SELLERS: Record<string, { name: string; hasGuarantee: boolean; guaranteeUrl?: string }> = {
  'ticketmaster.com': {
    name: 'Ticketmaster',
    hasGuarantee: true,
    guaranteeUrl: 'https://help.ticketmaster.com/hc/en-us/articles/9700167428881-Ticket-Insurance',
  },
  'livenation.com': {
    name: 'Live Nation',
    hasGuarantee: true,
    guaranteeUrl: 'https://help.ticketmaster.com/hc/en-us/articles/9700167428881-Ticket-Insurance',
  },
  'eventbrite.com': {
    name: 'Eventbrite',
    hasGuarantee: true,
    guaranteeUrl: 'https://www.eventbrite.com/support/articles/en_US/Troubleshooting/eventbrite-guarantee',
  },
  'stubhub.com': {
    name: 'StubHub',
    hasGuarantee: true,
    guaranteeUrl: 'https://www.stubhub.com/promise',
  },
  'seatgeek.com': {
    name: 'SeatGeek',
    hasGuarantee: true,
    guaranteeUrl: 'https://seatgeek.com/buyer-guarantee',
  },
  'axs.com': {
    name: 'AXS',
    hasGuarantee: true,
    guaranteeUrl: 'https://www.axs.com/buyer-guarantee',
  },
  'vividseats.com': {
    name: 'Vivid Seats',
    hasGuarantee: true,
    guaranteeUrl: 'https://www.vividseats.com/guarantee',
  },
  'dice.fm': {
    name: 'DICE',
    hasGuarantee: true,
  },
};

/**
 * POST /api/verify-url
 * Verifies a URL against known sellers and checks for pricing discrepancies.
 * Returns verification status and official pricing if available.
 */
router.post("/", async (req, res) => {
  try {
    const { url, eventTitle } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "URL is required" });
    }

    let domain = '';
    try {
      const parsed = new URL(url);
      domain = parsed.hostname.replace(/^www\./, '');
    } catch {
      return res.json({
        verified: false,
        seller: null,
        officialPrice: null,
        warnings: ['Invalid URL format'],
      });
    }

    // Check if the domain belongs to a verified seller
    const sellerEntry = Object.entries(VERIFIED_SELLERS).find(
      ([sellerDomain]) => domain === sellerDomain || domain.endsWith('.' + sellerDomain)
    );

    const seller = sellerEntry
      ? { domain: sellerEntry[0], ...sellerEntry[1] }
      : null;

    // Look up official pricing from our scraped data if we have an event title
    let officialPrice: { min: number | null; max: number | null; source: string } | null = null;
    if (eventTitle && typeof eventTitle === 'string') {
      try {
        // Search for the event in our database by title (fuzzy match)
        const matchingEvents = await db
          .select({
            priceMin: events.priceMin,
            priceMax: events.priceMax,
            source: events.source,
            url: events.url,
          })
          .from(events)
          .where(ilike(events.title, `%${eventTitle}%`))
          .limit(5);

        // Prefer official sources for pricing
        const sourceOrder = ['ticketmaster', 'seatgeek', 'eventbrite', 'axs'];
        const bestMatch = matchingEvents
          .filter(e => e.priceMin != null)
          .sort((a, b) => {
            const aIdx = sourceOrder.indexOf(a.source);
            const bIdx = sourceOrder.indexOf(b.source);
            return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
          })[0];

        if (bestMatch) {
          officialPrice = {
            min: bestMatch.priceMin,
            max: bestMatch.priceMax,
            source: bestMatch.source,
          };
        }
      } catch (dbError) {
        logger.error("Failed to look up official pricing", { error: dbError });
      }
    }

    // Build warnings
    const warnings: string[] = [];

    if (!seller) {
      warnings.push(
        'This is not a recognized ticket seller. Verify the seller independently before purchasing.'
      );
    }

    res.json({
      verified: !!seller,
      seller,
      officialPrice,
      warnings,
    });
  } catch (error) {
    logger.error("Failed to verify URL", { error });
    res.status(500).json({ error: "Verification failed" });
  }
});

/**
 * GET /api/verify-url/price-check
 * Checks official pricing for a given event by matching the URL in our database.
 */
router.get("/price-check", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "URL is required" });
    }

    // Find the event by URL
    const event = await db
      .select({
        title: events.title,
        priceMin: events.priceMin,
        priceMax: events.priceMax,
        source: events.source,
        url: events.url,
        isFree: events.isFree,
      })
      .from(events)
      .where(eq(events.url, url))
      .limit(1);

    if (event.length === 0) {
      return res.json({ found: false, pricing: null });
    }

    const e = event[0];
    res.json({
      found: true,
      pricing: {
        title: e.title,
        min: e.priceMin,
        max: e.priceMax,
        isFree: e.isFree,
        source: e.source,
        officialUrl: e.url,
      },
    });
  } catch (error) {
    logger.error("Failed to check price", { error });
    res.status(500).json({ error: "Price check failed" });
  }
});

export default router;
