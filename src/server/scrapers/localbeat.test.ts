import { describe, expect, it } from "vitest";
import {
  categoryFromTags,
  collapseSameDayDuplicates,
  isExcluded,
  chicagoLocalToUtc,
  detailToEvent,
  parseRpcBody,
  type LocalBeatEventDetail,
} from "./localbeat";

describe("categoryFromTags", () => {
  it("maps comedy tags", () => {
    expect(categoryFromTags(["Comedy", "Stand Up", "Performing Arts"])).toBe("comedy");
  });
  it("maps trivia, bingo and board games to game_night", () => {
    expect(categoryFromTags(["Trivia"])).toBe("game_night");
    expect(categoryFromTags(["Bingo"])).toBe("game_night");
    expect(categoryFromTags(["Board Games", "Fantasy"])).toBe("game_night");
    expect(categoryFromTags(["Gaming", "Hobbies And Interests"])).toBe("game_night");
  });
  it("maps music and karaoke to music", () => {
    expect(categoryFromTags(["Music"])).toBe("music");
    expect(categoryFromTags(["Karaoke", "Music"])).toBe("music");
  });
  it("prefers comedy over music for comedy open mics", () => {
    expect(categoryFromTags(["Music", "Comedy"])).toBe("comedy");
  });
  it("drops the fitness / religion noise", () => {
    expect(categoryFromTags(["Fitness", "Pilates"])).toBeNull();
    expect(categoryFromTags(["Religion And Spirituality", "Christianity"])).toBeNull();
    expect(categoryFromTags(["Books And Literature"])).toBeNull();
    expect(categoryFromTags([])).toBeNull();
    expect(categoryFromTags(undefined)).toBeNull();
  });
});

describe("chicagoLocalToUtc", () => {
  it("handles CDT (UTC-5)", () => {
    expect(chicagoLocalToUtc("2026-10-10T19:30:00")!.toISOString()).toBe("2026-10-11T00:30:00.000Z");
  });
  it("handles CST (UTC-6) after the Nov 1 2026 change", () => {
    expect(chicagoLocalToUtc("2026-11-05T19:30:00")!.toISOString()).toBe("2026-11-06T01:30:00.000Z");
  });
  it("handles the morning of the fall-back day", () => {
    // 2026-11-01 03:00 local is after the 02:00 CDT→CST switch.
    expect(chicagoLocalToUtc("2026-11-01T03:00:00")!.toISOString()).toBe("2026-11-01T09:00:00.000Z");
  });
  it("treats a bare date as local midnight", () => {
    expect(chicagoLocalToUtc("2026-09-30")!.toISOString()).toBe("2026-09-30T05:00:00.000Z");
  });
  it("rejects junk", () => {
    expect(chicagoLocalToUtc("Oct 10")).toBeNull();
    expect(chicagoLocalToUtc("")).toBeNull();
    expect(chicagoLocalToUtc(undefined)).toBeNull();
  });
});

// Shape copied from a real get_event_details response (Sep 2026).
const trivia: LocalBeatEventDetail = {
  id: "11111111-2222-3333-4444-555555555555",
  name: "Trivia + Steak Night",
  description: "Weekly trivia on the patio.",
  start: "2026-10-08T17:30:00",
  end: "2026-10-08T21:30:00",
  allDay: false,
  venue: { name: "Patterson Park Patio Bar", address: "2205 Patterson St", city: "Houston", state: "TX" },
  tags: ["Food And Drink", "Trivia"],
  eventUrl: "https://localbeat.com/api/view/abc",
};

describe("detailToEvent", () => {
  it("maps a timed event", () => {
    const e = detailToEvent(trivia)!;
    expect(e.title).toBe("Trivia + Steak Night");
    expect(e.category).toBe("game_night");
    expect(e.source).toBe("localbeat");
    expect(e.venue).toBe("Patterson Park Patio Bar");
    expect(e.address).toBe("2205 Patterson St, Houston, TX");
    expect(e.location).toBe("Houston, TX");
    expect((e.startDate as Date).toISOString()).toBe("2026-10-08T22:30:00.000Z");
    expect((e.endDate as Date).toISOString()).toBe("2026-10-09T02:30:00.000Z");
    expect(e.url).toBe("https://localbeat.com/api/view/abc");
    expect(e.externalId).toBe(trivia.id);
    expect(e.uniqueKey).toMatch(/^[a-f0-9]{64}$/);
    expect(e.description).toBe("Weekly trivia on the patio.");
  });

  it("normalizes 'Texas' to TX", () => {
    const e = detailToEvent({ ...trivia, venue: { ...trivia.venue, state: "Texas" } })!;
    expect(e.location).toBe("Houston, TX");
  });

  it("flags all-day events as time-unknown instead of inventing a showtime", () => {
    const e = detailToEvent({ ...trivia, allDay: true, start: "2026-10-08", end: undefined })!;
    expect(e.description).toMatch(/^Start time not listed/);
    expect(e.endDate).toBeNull();
  });

  it("falls back to search-row tags when details have none", () => {
    const e = detailToEvent({ ...trivia, tags: [] }, ["Comedy"])!;
    expect(e.category).toBe("comedy");
  });

  it("drops out-of-interest, out-of-state and undated records", () => {
    expect(detailToEvent({ ...trivia, tags: ["Fitness"] })).toBeNull();
    expect(detailToEvent({ ...trivia, venue: { ...trivia.venue, state: "CO" } })).toBeNull();
    expect(detailToEvent({ ...trivia, start: undefined })).toBeNull();
  });

  it("dedupes against other sources by title + date + location", () => {
    const a = detailToEvent(trivia)!;
    const b = detailToEvent({ ...trivia, id: "other", eventUrl: "https://x" })!;
    expect(a.uniqueKey).toBe(b.uniqueKey);
  });
});

describe("parseRpcBody", () => {
  it("parses plain JSON", () => {
    expect(parseRpcBody('{"jsonrpc":"2.0","id":1,"result":{}}').id).toBe(1);
  });
  it("parses SSE framing", () => {
    expect(parseRpcBody('event: message\ndata: {"jsonrpc":"2.0","id":7,"result":{}}\n\n').id).toBe(7);
  });
});

describe("isExcluded", () => {
  it("drops kids' music classes", () => {
    expect(isExcluded("Wednesday Music Class", ["Music", "Kids and Family"])).toBe(true);
  });
  it("drops church and campus bookings", () => {
    expect(isExcluded("Bingle Choir Practice", ["Music"])).toBe(true);
    expect(isExcluded("Bible Study", ["Religion And Spirituality"])).toBe(true);
    expect(isExcluded("PDR, Rice Philharmonics", ["Education"])).toBe(true);
  });
  it("drops campus room bookings and church internal calendars", () => {
    expect(isExcluded("PDR, Rice Philharmonics, Zach Mok", ["Music"])).toBe(true);
    expect(isExcluded("Upper Commons, Cabinet", [])).toBe(true);
    expect(isExcluded("Praise Band", ["Music"], "Covenant Lutheran Church")).toBe(true);
    expect(isExcluded("Staff Mtg", ["Music"])).toBe(true);
    expect(isExcluded("Bingo", ["Bingo"], "Immanuel Lutheran Church (LCMS)")).toBe(true);
  });
  it("does not mistake venues or titles that merely contain a keyword", () => {
    expect(isExcluded("Live Music at The Bar", ["Music"], "The Deck at The Laura Hotel")).toBe(false);
    expect(isExcluded("Comedy Night", ["Comedy"], "The George Theater")).toBe(false);
    expect(isExcluded("Karaoke", ["Karaoke"], "R Bar")).toBe(false);
  });
  it("drops other-city editions", () => {
    expect(isExcluded("Notes Of Noire Live- DALLAS", ["Music"])).toBe(true);
    expect(isExcluded("Game Night Wednesdays-Dallas", ["Gaming"])).toBe(true);
  });
  it("keeps real nightlife", () => {
    expect(isExcluded("Trivia Night", ["Trivia"])).toBe(false);
    expect(isExcluded("Latin Nights", ["Music", "Latin Music"])).toBe(false);
    expect(isExcluded("Rated R Bingo", ["Bingo"])).toBe(false);
    expect(isExcluded("Psych Mic – Comedy Open Mic", ["Comedy"])).toBe(false);
  });
});

describe("collapseSameDayDuplicates", () => {
  it("keeps the timed listing over an all-day one for the same show", () => {
    const untimed = detailToEvent({
      ...trivia, name: "Craig Conant", tags: ["Comedy"], allDay: true, start: "2026-10-09", end: undefined,
    })!;
    const timed = detailToEvent({
      ...trivia, name: "Craig Conant", tags: ["Comedy"], start: "2026-10-09T21:45:00", end: undefined,
    })!;
    const out = collapseSameDayDuplicates([untimed, timed]);
    expect(out).toHaveLength(1);
    expect((out[0].startDate as Date).toISOString()).toBe("2026-10-10T02:45:00.000Z");
  });
  it("keeps different days of a recurring event", () => {
    const a = detailToEvent(trivia)!;
    const b = detailToEvent({ ...trivia, start: "2026-10-15T17:30:00", end: undefined })!;
    expect(collapseSameDayDuplicates([a, b])).toHaveLength(2);
  });
});
