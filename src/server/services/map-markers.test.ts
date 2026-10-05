import { describe, expect, it } from "vitest";
import { eventMatchesPlace, groupIntoMarkers, matchWatchedVenue, parseBounds, type MarkerEventInput, type WatchedVenueInput } from "./map-markers";

const WOMH: WatchedVenueInput = {
  slug: "white-oak-music-hall", name: "White Oak Music Hall", aliases: ["WOMH"],
  address: "2915 N Main St, Houston, TX 77009", neighborhood: "Near Northside",
  latitude: 29.7869, longitude: -95.3735, placeId: "ChIJ_womh",
};
const RAVEN: WatchedVenueInput = {
  slug: "raven-tower", name: "Raven Tower", aliases: [], address: "310 North St, Houston, TX 77009",
  neighborhood: "Near Northside", latitude: 29.7873, longitude: -95.3727, placeId: null,
};
const UNGEOCODED: WatchedVenueInput = { ...RAVEN, slug: "x", name: "Nowhere", latitude: null, longitude: null };

let n = 0;
const ev = (o: Partial<MarkerEventInput>): MarkerEventInput => ({
  id: `e${++n}`, title: "Show", startDate: "2026-10-03T01:00:00Z", venue: null, address: null,
  category: "music", source: "test", url: "https://x", latitude: null, longitude: null, placeId: null, ...o,
});

describe("parseBounds", () => {
  it("parses a Houston viewport", () => {
    expect(parseBounds("29.70,-95.50,29.85,-95.30")).toEqual({ minLat: 29.7, minLng: -95.5, maxLat: 29.85, maxLng: -95.3 });
  });
  it("rejects malformed, inverted, out-of-range and planet-sized boxes", () => {
    for (const bad of [undefined, "", "1,2,3", "a,b,c,d", "29.9,-95.5,29.7,-95.3", "29,-95.5,29.8,-95.6", "-91,0,0,1", "0,0,10,10"]) {
      expect(parseBounds(bad), String(bad)).toBeNull();
    }
  });
});

describe("matchWatchedVenue", () => {
  it("matches by placeId, name, alias, and ignores a leading 'The'", () => {
    expect(matchWatchedVenue({ venue: "anything", placeId: "ChIJ_womh" }, [WOMH])?.slug).toBe("white-oak-music-hall");
    expect(matchWatchedVenue({ venue: "White Oak Music Hall", placeId: null }, [WOMH])?.slug).toBe("white-oak-music-hall");
    expect(matchWatchedVenue({ venue: "WOMH", placeId: null }, [WOMH])?.slug).toBe("white-oak-music-hall");
    expect(matchWatchedVenue({ venue: "The Raven Tower", placeId: null }, [RAVEN])?.slug).toBe("raven-tower");
    expect(matchWatchedVenue({ venue: "Big Star Bar", placeId: null }, [WOMH, RAVEN])).toBeNull();
  });
});

describe("groupIntoMarkers", () => {
  it("groups events per venue and picks the dominant category and next event", () => {
    const rows = [
      ev({ venue: "Velvet Oak Tavern", latitude: 29.745, longitude: -95.41, category: "game_night", startDate: "2026-10-08T01:00:00Z" }),
      ev({ venue: "Velvet Oak Tavern", latitude: 29.745, longitude: -95.41, category: "game_night", startDate: "2026-10-01T01:00:00Z", title: "Trivia" }),
      ev({ venue: "Velvet Oak Tavern", latitude: 29.745, longitude: -95.41, category: "music" }),
    ];
    const [m] = groupIntoMarkers(rows, []);
    expect(m.eventCount).toBe(3);
    expect(m.primaryCategory).toBe("game_night");
    expect(m.nextEvent?.title).toBe("Trivia");
  });

  it("snaps events onto their watched venue's pin, including alias matches", () => {
    const rows = [
      ev({ venue: "WOMH", latitude: 29.7870, longitude: -95.3736 }),
      ev({ venue: "White Oak Music Hall", latitude: 29.7868, longitude: -95.3734 }),
    ];
    const markers = groupIntoMarkers(rows, [WOMH]);
    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({ watchedSlug: "white-oak-music-hall", eventCount: 2, lat: WOMH.latitude });
  });

  it("shows geocoded watched venues with no events, skips ungeocoded ones", () => {
    const markers = groupIntoMarkers([], [RAVEN, UNGEOCODED]);
    expect(markers.map((m) => m.name)).toEqual(["Raven Tower"]);
    expect(markers[0]).toMatchObject({ eventCount: 0, primaryCategory: null });
  });

  it("ignores events without coordinates and respects bounds", () => {
    const rows = [
      ev({ venue: "No Coords" }),
      ev({ venue: "Inside", latitude: 29.78, longitude: -95.40 }),
      ev({ venue: "NRG", latitude: 29.6847, longitude: -95.4107 }),
    ];
    const markers = groupIntoMarkers(rows, [], { minLat: 29.75, minLng: -95.45, maxLat: 29.85, maxLng: -95.35 });
    expect(markers.map((m) => m.name)).toEqual(["Inside"]);
  });

  it("keeps same-named venues in different places apart", () => {
    const rows = [
      ev({ venue: "Punch Line", latitude: 29.76, longitude: -95.36 }),
      ev({ venue: "Punch Line", latitude: 32.78, longitude: -96.80 }),
    ];
    expect(groupIntoMarkers(rows, [])).toHaveLength(2);
  });
});

describe("eventMatchesPlace", () => {
  const place = { placeId: "ChIJ_punch", names: ["Punch Line Houston"], lat: 29.7595, lng: -95.3613 };
  it("matches by placeId regardless of name", () => {
    expect(eventMatchesPlace({ venue: "whatever", placeId: "ChIJ_punch", latitude: null, longitude: null }, place)).toBe(true);
  });
  it("matches by name when nearby, rejects a same-named venue far away", () => {
    expect(eventMatchesPlace({ venue: "Punch Line Houston", placeId: null, latitude: 29.7596, longitude: -95.3612 }, place)).toBe(true);
    expect(eventMatchesPlace({ venue: "Punch Line Houston", placeId: null, latitude: 32.78, longitude: -96.80 }, place)).toBe(false);
  });
  it("allows containment for longer names, not for short fragments", () => {
    expect(eventMatchesPlace({ venue: "Punch Line Houston - Downtown", placeId: null, latitude: null, longitude: null }, place)).toBe(true);
    expect(eventMatchesPlace({ venue: "Bar", placeId: null, latitude: null, longitude: null }, { names: ["Big Star Bar"] })).toBe(false);
  });
  it("rejects unrelated venues", () => {
    expect(eventMatchesPlace({ venue: "Houston Improv", placeId: null, latitude: 29.7596, longitude: -95.3612 }, place)).toBe(false);
  });
});
