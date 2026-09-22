import Anthropic from "@anthropic-ai/sdk";
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";
import { getNextFridays } from "../utils/date-utils";

const EVENTS_JSON_SCHEMA = {
  type: "object",
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          date: { type: "string" },
          time: { type: "string" },
          venue: { type: "string" },
          location: { type: "string" },
          address: { type: "string" },
          category: { type: "string" },
          url: { type: "string" },
          isFree: { type: "boolean" },
          priceRange: { type: "string" },
        },
        required: ["title", "description", "date", "venue", "category"],
        additionalProperties: false,
      },
    },
  },
  required: ["events"],
  additionalProperties: false,
} as const;

/**
 * Scrape events using Claude with live web search.
 * Source label stays "perplexity" for continuity with existing stats/data
 * (this scraper originally used the Perplexity API; the source field is a
 * generator identifier, not a literal dependency on that API anymore).
 */
export async function scrapePerplexity(): Promise<NewEvent[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.warn("Anthropic API key not configured, skipping scraper");
    return [];
  }

  const client = new Anthropic({ apiKey });

  try {
    logger.info("Starting AI-assisted Houston events scraper");

    const events: NewEvent[] = [];
    const fridays = getNextFridays(4); // Get next 4 Fridays

    const prompt = `Find upcoming events and activities in Houston, Texas for the next 4 weeks (starting ${fridays[0].toDateString()}). Use web search to find real, current events.

Include a diverse mix of:
- Concerts and live music (venues like White Oak Music Hall, House of Blues, Toyota Center)
- Food festivals and restaurant events
- Art exhibitions and gallery openings
- Sports events (Rockets, Astros, Texans, Dynamo)
- Theater and performing arts
- Outdoor activities (Hermann Park, Buffalo Bayou, Discovery Green)
- Cultural festivals
- Comedy shows and stand-up (Houston Improv, etc.)
- Fitness events and classes
- Community events
- Game nights: bingo nights, trivia nights, karaoke, board game meetups, pub games

For each event provide: title, description, date (YYYY-MM-DD), time (HH:MM 24-hour, or "00:00" if unknown), venue, location (city, state), address if known, category (music|food|sports|arts|outdoor|culture|comedy|fitness|community|game_night|other), url (event website or ticket link), isFree, and priceRange (Free|$|$$|$$$|$$$$ or a specific price). Use category=game_night for bingo, trivia, karaoke, board-game, and pub-game events.

Include at least 15-20 diverse, real events.`;

    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];

    let response = await client.beta.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 8000,
      system: "You are a helpful assistant that finds real, current local events using web search.",
      messages,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }],
      output_config: { format: { type: "json_schema", schema: EVENTS_JSON_SCHEMA } },
    });

    // Server-side tool loop may pause after its internal iteration cap; resume until it doesn't.
    while (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      response = await client.beta.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 8000,
        system: "You are a helpful assistant that finds real, current local events using web search.",
        messages,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }],
        output_config: { format: { type: "json_schema", schema: EVENTS_JSON_SCHEMA } },
      });
    }

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      logger.warn("No content received from Claude events scraper", { stopReason: response.stop_reason });
      return [];
    }

    let parsedEvents: any[];
    try {
      parsedEvents = JSON.parse(textBlock.text).events;
    } catch (parseError) {
      logger.error("Failed to parse Claude events scraper response", {
        error: parseError,
        content: textBlock.text.substring(0, 500),
      });
      return [];
    }

    logger.info(`Claude events scraper found ${parsedEvents.length} potential events`);

    // Transform to our schema
    for (const event of parsedEvents) {
      try {
        // Parse date and time
        const dateStr = event.date;
        const timeStr = event.time || "00:00";
        const startDate = new Date(`${dateStr}T${timeStr}:00`);

        // Skip invalid dates
        if (isNaN(startDate.getTime())) {
          logger.warn(`Invalid date for event: ${event.title}`);
          continue;
        }

        // Parse price
        let priceMin: number | undefined;
        let priceMax: number | undefined;
        let isFree = event.isFree || false;

        if (event.priceRange) {
          if (event.priceRange === "Free") {
            isFree = true;
          } else if (event.priceRange.startsWith("$")) {
            const dollarCount = event.priceRange.split("$").length - 1;
            priceMin = dollarCount * 1000; // $=10, $$=20, $$$=30, $$$$=40 (in cents)
            priceMax = dollarCount * 3000;
          } else if (!isNaN(parseFloat(event.priceRange))) {
            // Specific price
            const price = parseFloat(event.priceRange);
            priceMin = Math.round(price * 100);
            priceMax = Math.round(price * 100);
          }
        }

        const newEvent: NewEvent = {
          title: event.title,
          description: event.description,
          startDate,
          location: event.location || "Houston, TX",
          venue: event.venue,
          address: event.address,
          url: event.url || `https://www.google.com/search?q=${encodeURIComponent(event.title + " Houston")}`,
          source: "perplexity",
          category: event.category || "other",
          priceMin,
          priceMax,
          isFree,
          uniqueKey: generateEventHash(event.title, startDate, event.location || "Houston, TX"),
        };

        events.push(newEvent);
      } catch (error) {
        logger.error("Error parsing scraped event", { error, event });
      }
    }

    logger.info(`Successfully parsed ${events.length} events`);
    return events;
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      logger.error("Claude events scraper API error", {
        status: error.status,
        message: error.message,
      });
    } else {
      logger.error("Failed to run Claude events scraper", { error });
    }
    return [];
  }
}
