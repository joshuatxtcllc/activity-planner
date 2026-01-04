import axios from "axios";
import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";
import { getUpcomingWeeksRange } from "../utils/date-utils";

interface RedditPost {
  data: {
    title: string;
    selftext: string;
    url: string;
    permalink: string;
    created_utc: number;
    subreddit: string;
    id: string;
    link_flair_text?: string;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
  };
}

/**
 * Scrape events from Houston-related subreddits
 * Searches for event-related posts and tries to extract event details
 */
export async function scrapeReddit(): Promise<NewEvent[]> {
  try {
    logger.info("Starting Reddit scraper for Houston events");

    const events: NewEvent[] = [];
    const subreddits = [
      "houston",
      "HoustonEvents",
      "HoustonSocials",
      "houstonmusic",
      "HoustonFood",
      "HoustonBeer"
    ];

    // Search queries to find event posts
    const searchQueries = [
      "event",
      "festival",
      "concert",
      "happening this weekend",
      "things to do",
      "meetup"
    ];

    const { startDate, endDate } = getUpcomingWeeksRange(4);

    for (const subreddit of subreddits) {
      try {
        // Get recent posts from the subreddit
        const response = await axios.get<RedditResponse>(
          `https://www.reddit.com/r/${subreddit}/new.json`,
          {
            params: {
              limit: 50,
              t: "month" // Posts from the last month
            },
            headers: {
              "User-Agent": "HoustonEventAggregator/1.0"
            }
          }
        );

        const posts = response.data.data.children;
        logger.info(`Found ${posts.length} posts from r/${subreddit}`);

        for (const post of posts) {
          try {
            const { data } = post;

            // Check if the title suggests it's an event
            const isEventPost =
              /event|festival|concert|show|happening|party|meetup|gathering|weekend|saturday|friday|sunday/i.test(data.title) ||
              data.link_flair_text?.toLowerCase().includes("event");

            if (!isEventPost) {
              continue;
            }

            // Try to extract date from title or content
            const combinedText = `${data.title} ${data.selftext}`;
            const dateMatch = extractDateFromText(combinedText);

            // Use post creation date as fallback
            let eventDate = dateMatch || new Date(data.created_utc * 1000);

            // Only include events within our date range
            if (eventDate < startDate || eventDate > endDate) {
              continue;
            }

            // Extract venue/location info
            const venueMatch = combinedText.match(/(?:at|@)\s+([A-Z][a-zA-Z\s&'-]+(?:Hall|Center|Park|Venue|Bar|Club|Theater|Theatre|Brewery|Restaurant))/i);
            const venue = venueMatch?.[1]?.trim();

            // Determine if it's free
            const isFree = /free|no charge|complimentary|free admission/i.test(combinedText);

            // Extract price if mentioned
            let priceMin: number | undefined;
            let priceMax: number | undefined;
            const priceMatch = combinedText.match(/\$(\d+)(?:\s*-\s*\$(\d+))?/);
            if (priceMatch && !isFree) {
              priceMin = parseInt(priceMatch[1]) * 100; // Convert to cents
              priceMax = priceMatch[2] ? parseInt(priceMatch[2]) * 100 : priceMin;
            }

            // Categorize based on subreddit and keywords
            let category = "community";
            if (subreddit.includes("music") || /concert|show|band|dj/i.test(data.title)) {
              category = "music";
            } else if (subreddit.includes("Food") || subreddit.includes("Beer") || /food|restaurant|brewery|bar/i.test(data.title)) {
              category = "food";
            } else if (/art|gallery|exhibit|museum/i.test(data.title)) {
              category = "arts";
            } else if (/festival/i.test(data.title)) {
              category = "culture";
            } else if (/sport|game|match/i.test(data.title)) {
              category = "sports";
            }

            const newEvent: NewEvent = {
              title: data.title,
              description: data.selftext?.substring(0, 500) || `Event discussion from r/${subreddit}`,
              startDate: eventDate,
              location: "Houston, TX",
              venue,
              url: data.url.startsWith("http") ? data.url : `https://reddit.com${data.permalink}`,
              source: "reddit",
              category,
              priceMin,
              priceMax,
              isFree,
              externalId: data.id,
              uniqueKey: generateEventHash(data.title, eventDate, "Houston, TX"),
            };

            events.push(newEvent);
          } catch (error) {
            logger.error("Error parsing Reddit post", { error, post: post.data.title });
          }
        }
      } catch (error) {
        logger.error(`Failed to scrape r/${subreddit}`, { error });
        // Continue with other subreddits
      }
    }

    logger.info(`Successfully parsed ${events.length} Reddit events`);
    return events;
  } catch (error) {
    logger.error("Failed to scrape Reddit", { error });
    return [];
  }
}

/**
 * Extract date from text using various patterns
 */
function extractDateFromText(text: string): Date | null {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Pattern: Month DD or Month DD, YYYY
  const monthDayMatch = text.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/i);
  if (monthDayMatch) {
    const month = parseMonth(monthDayMatch[1]);
    const day = parseInt(monthDayMatch[2]);
    const year = monthDayMatch[3] ? parseInt(monthDayMatch[3]) : currentYear;
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Pattern: MM/DD or MM/DD/YYYY
  const numericDateMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (numericDateMatch) {
    const month = parseInt(numericDateMatch[1]) - 1;
    const day = parseInt(numericDateMatch[2]);
    let year = currentYear;
    if (numericDateMatch[3]) {
      year = numericDateMatch[3].length === 2
        ? 2000 + parseInt(numericDateMatch[3])
        : parseInt(numericDateMatch[3]);
    }
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Relative dates
  if (/\btoday\b/i.test(text)) {
    return new Date(now.setHours(0, 0, 0, 0));
  }
  if (/\btomorrow\b/i.test(text)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  // Day of week
  const dayMatch = text.match(/\b(this|next)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (dayMatch) {
    const targetDay = parseDayOfWeek(dayMatch[2]);
    const isNext = dayMatch[1]?.toLowerCase() === "next";
    return getNextDayOfWeek(targetDay, isNext);
  }

  return null;
}

function parseMonth(month: string): number {
  const months: { [key: string]: number } = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };
  return months[month.toLowerCase()] ?? 0;
}

function parseDayOfWeek(day: string): number {
  const days: { [key: string]: number } = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6
  };
  return days[day.toLowerCase()] ?? 0;
}

function getNextDayOfWeek(targetDay: number, skipToNext: boolean = false): Date {
  const now = new Date();
  const currentDay = now.getDay();
  let daysUntil = targetDay - currentDay;

  if (daysUntil < 0 || (daysUntil === 0 && skipToNext)) {
    daysUntil += 7;
  }

  const result = new Date(now);
  result.setDate(result.getDate() + daysUntil);
  result.setHours(0, 0, 0, 0);
  return result;
}
