import type { Event } from "../../shared/schema";

export interface EventSource {
  id: string;
  source: string;
  url: string;
  isFree: boolean | null;
  priceMin: number | null;
  priceMax: number | null;
}

export interface GroupedEvent extends Event {
  sources: EventSource[];
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Merges events that are exact duplicates (same title, same exact start time)
 * scraped from different sources into a single card with a source per link.
 */
export function groupDuplicateEvents(events: Event[]): GroupedEvent[] {
  const groups = new Map<string, Event[]>();

  for (const event of events) {
    const key = `${normalizeTitle(event.title)}|${new Date(event.startDate).toISOString()}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(event);
    } else {
      groups.set(key, [event]);
    }
  }

  return Array.from(groups.values()).map((group) => {
    const primary = group.find((e) => e.imageUrl) || group[0];
    return {
      ...primary,
      sources: group.map((e) => ({
        id: e.id,
        source: e.source,
        url: e.url,
        isFree: e.isFree,
        priceMin: e.priceMin,
        priceMax: e.priceMax,
      })),
    };
  });
}
