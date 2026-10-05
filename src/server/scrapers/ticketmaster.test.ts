import { describe, expect, it } from "vitest";
import { venueCoords } from "./ticketmaster";

describe("venueCoords", () => {
  it("parses string coordinates (as in Ticketmaster's examples)", () => {
    expect(venueCoords({ latitude: "29.7604", longitude: "-95.3698" })).toEqual({ latitude: 29.7604, longitude: -95.3698 });
  });
  it("parses numeric coordinates (as typed in the docs)", () => {
    expect(venueCoords({ latitude: 29.7869, longitude: -95.3735 })).toEqual({ latitude: 29.7869, longitude: -95.3735 });
  });
  it("rejects missing, blank, garbage, out-of-range and 0,0", () => {
    for (const bad of [undefined, {}, { latitude: "", longitude: "" }, { latitude: "abc", longitude: "-95" }, { latitude: "95", longitude: "-95" }, { latitude: "0", longitude: "0" }]) {
      expect(venueCoords(bad as any), JSON.stringify(bad)).toEqual({});
    }
  });
});
