import { describe, expect, it } from "vitest";
import { matchRule } from "./alert-matcher";
import type { AlertRule, Event } from "../../shared/schema";

/**
 * Build an AlertRule with sane defaults and only the fields the test
 * cares about overridden. Cast to AlertRule at the boundary because
 * the drizzle-inferred type is huge and mostly irrelevant to matching.
 */
function makeRule(overrides: Partial<AlertRule> = {}): AlertRule {
  const base: AlertRule = {
    id: "rule-1",
    sessionId: "s",
    name: "test rule",
    keywords: [],
    venues: [],
    categories: [],
    sources: [],
    dateRangeStart: null,
    dateRangeEnd: null,
    centerLat: null,
    centerLng: null,
    radiusMiles: null,
    channelEmail: true,
    channelSms: false,
    channelInApp: true,
    emailTo: null,
    smsTo: null,
    isActive: true,
    lastFiredAt: null,
    totalFired: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as AlertRule;
  return { ...base, ...overrides };
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  const base: Event = {
    id: "e1",
    title: "Some Show",
    description: null,
    startDate: new Date("2026-10-01T20:00:00Z"),
    endDate: null,
    location: "Houston, TX",
    venue: "White Oak Music Hall",
    address: "2915 N Main St, Houston, TX 77009",
    url: "https://example.com/e1",
    imageUrl: null,
    source: "ticketmaster",
    category: "music",
    priceMin: null,
    priceMax: null,
    isFree: false,
    externalId: null,
    scrapedAt: new Date(),
    createdAt: new Date(),
    uniqueKey: null,
    latitude: 29.7907,
    longitude: -95.3775,
    placeId: null,
    placeIdStatus: "ok",
    geocodedAt: new Date(),
  } as Event;
  return { ...base, ...overrides };
}

describe("matchRule — geo filter", () => {
  const HEIGHTS = { lat: 29.7998, lng: -95.4109 };

  it("passes when no geo filter is configured", () => {
    expect(matchRule(makeRule(), makeEvent())).toBe(true);
  });

  it("passes when event is inside the radius", () => {
    const rule = makeRule({
      centerLat: HEIGHTS.lat,
      centerLng: HEIGHTS.lng,
      radiusMiles: 5,
    });
    // Event coords near Woodland Heights, ~2.4 mi from HEIGHTS.
    const event = makeEvent({ latitude: 29.7907, longitude: -95.3775 });
    expect(matchRule(rule, event)).toBe(true);
  });

  it("rejects events outside the radius", () => {
    const rule = makeRule({
      centerLat: HEIGHTS.lat,
      centerLng: HEIGHTS.lng,
      radiusMiles: 1, // tight
    });
    // NRG Stadium — ~8 mi south of Heights.
    const event = makeEvent({ latitude: 29.6847, longitude: -95.4107 });
    expect(matchRule(rule, event)).toBe(false);
  });

  it("rejects events with no coordinates when geo is required (fail closed)", () => {
    const rule = makeRule({
      centerLat: HEIGHTS.lat,
      centerLng: HEIGHTS.lng,
      radiusMiles: 5,
    });
    const event = makeEvent({ latitude: null, longitude: null });
    expect(matchRule(rule, event)).toBe(false);
  });

  it("ignores partial geo filter (e.g. missing radius)", () => {
    const rule = makeRule({
      centerLat: HEIGHTS.lat,
      centerLng: HEIGHTS.lng,
      radiusMiles: null,
    });
    // Even an event with no coords should pass here — the geo dimension
    // is considered disabled unless ALL three are set.
    const event = makeEvent({ latitude: null, longitude: null });
    expect(matchRule(rule, event)).toBe(true);
  });

  it("keeps AND semantics with other dimensions", () => {
    const rule = makeRule({
      categories: ["comedy"],
      centerLat: HEIGHTS.lat,
      centerLng: HEIGHTS.lng,
      radiusMiles: 20,
    });
    // In-radius but wrong category → still rejects.
    const event = makeEvent({ category: "music" });
    expect(matchRule(rule, event)).toBe(false);
  });
});
