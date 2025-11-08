import crypto from "crypto";

/**
 * Creates a unique hash for an event to prevent duplicates
 * Based on title, date, and location
 */
export function generateEventHash(
  title: string,
  date: Date,
  location: string
): string {
  const normalized = `${title.toLowerCase().trim()}-${date.toISOString().split("T")[0]}-${location.toLowerCase().trim()}`;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Checks if two events are likely duplicates
 */
export function areEventsSimilar(
  event1: { title: string; startDate: Date; location: string },
  event2: { title: string; startDate: Date; location: string }
): boolean {
  const hash1 = generateEventHash(event1.title, event1.startDate, event1.location);
  const hash2 = generateEventHash(event2.title, event2.startDate, event2.location);
  return hash1 === hash2;
}
