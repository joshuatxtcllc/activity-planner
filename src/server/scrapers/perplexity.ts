import axios from "axios";
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";
import { getNextFridays } from "../utils/date-utils";

interface PerplexityResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
}

/**
 * Scrape events using Perplexity AI
 * Perplexity excels at finding current, real-time information about local events
 */
export async function scrapePerplexity(): Promise<NewEvent[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY?.trim().replace(/^['"]|['"]$/g, '');
  if (!apiKey) {
    logger.warn("Perplexity API key not configured, skipping scraper");
    return [];
  }

  try {
    logger.info("Starting Perplexity AI scraper for Houston events");

    const events: NewEvent[] = [];
    const fridays = getNextFridays(4); // Get next 4 Fridays

    // Query Perplexity for upcoming events in Houston
    const prompt = `Find upcoming events and activities in Houston, Texas for the next 4 weeks (starting ${fridays[0].toDateString()}).

Include a diverse mix of:
- Concerts and live music (venues like White Oak Music Hall, House of Blues, Toyota Center)
- Food festivals and restaurant events
- Art exhibitions and gallery openings
- Sports events (Rockets, Astros, Texans, Dynamo)
- Theater and performing arts
- Outdoor activities (Hermann Park, Buffalo Bayou, Discovery Green)
- Cultural festivals
- Comedy shows
- Fitness events and classes
- Community events

For EACH event, provide in this EXACT JSON format (provide an array of events):
[
  {
    "title": "Event Name",
    "description": "Brief description of the event",
    "date": "YYYY-MM-DD",
    "time": "HH:MM" (24-hour format, or "00:00" if unknown),
    "venue": "Venue Name",
    "location": "City, State",
    "address": "Street address if known",
    "category": "music|food|sports|arts|outdoor|culture|comedy|fitness|community|other",
    "url": "Event website or ticket link",
    "isFree": true or false,
    "priceRange": "Free|$|$$|$$$|$$$$" (or specific price if known)
  }
]

Provide ONLY the JSON array, no other text. Include at least 20-30 diverse events.`;

    const response = await axios.post<PerplexityResponse>(
      "https://api.perplexity.ai/chat/completions",
      {
        model: "llama-3.1-sonar-large-128k-online", // Online model for real-time search
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that finds local events and activities. Always respond with valid JSON arrays only, no markdown formatting or extra text."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2, // Lower temperature for more factual responses
        max_tokens: 4000,
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const content = response.data.choices[0]?.message?.content;
    if (!content) {
      logger.warn("No content received from Perplexity");
      return [];
    }

    // Parse the JSON response
    let parsedEvents: any[];
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedEvents = JSON.parse(cleanContent);
    } catch (parseError) {
      logger.error("Failed to parse Perplexity JSON response", {
        error: parseError,
        content: content.substring(0, 500)
      });
      return [];
    }

    logger.info(`Perplexity found ${parsedEvents.length} potential events`);

    // Transform Perplexity events to our schema
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
        logger.error("Error parsing Perplexity event", { error, event });
      }
    }

    logger.info(`Successfully parsed ${events.length} Perplexity events`);
    return events;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error("Failed to scrape Perplexity", {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    } else {
      logger.error("Failed to scrape Perplexity", { error });
    }
    return [];
  }
}
