import { describe, expect, it } from "vitest";
import { computeWindow, formatHouston, houstonTime } from "./mapWindows";

const iso = (d: Date) => d.toISOString();

describe("houstonTime", () => {
  it("converts CDT and CST wall clock to UTC", () => {
    expect(iso(houstonTime(2026, 10, 2, 20))).toBe("2026-10-03T01:00:00.000Z");
    expect(iso(houstonTime(2026, 11, 6, 20))).toBe("2026-11-07T02:00:00.000Z");
  });
});

describe("computeWindow", () => {
  it("tonight on a Wednesday evening runs to 4 AM Thursday", () => {
    const now = new Date("2026-09-30T23:00:00Z"); // Wed 6 PM CDT
    const w = computeWindow("tonight", now);
    expect(w.from).toBe(now);
    expect(iso(w.to)).toBe("2026-10-01T09:00:00.000Z");
  });
  it("tonight at 1 AM still means the current night", () => {
    const now = new Date("2026-10-01T06:00:00Z"); // Thu 1 AM CDT
    expect(iso(computeWindow("tonight", now).to)).toBe("2026-10-01T09:00:00.000Z");
  });
  it("weekend from a Wednesday is Fri 12 AM → Mon 4 AM", () => {
    const w = computeWindow("weekend", new Date("2026-09-30T15:00:00Z"));
    expect(iso(w.from)).toBe("2026-10-02T05:00:00.000Z");
    expect(iso(w.to)).toBe("2026-10-05T09:00:00.000Z");
  });
  it("weekend on a Saturday starts now and ends Monday 4 AM", () => {
    const now = new Date("2026-10-03T20:00:00Z"); // Sat 3 PM
    const w = computeWindow("weekend", now);
    expect(w.from).toBe(now);
    expect(iso(w.to)).toBe("2026-10-05T09:00:00.000Z");
  });
  it("weekend at 2 AM Monday is still the ending weekend", () => {
    const now = new Date("2026-10-05T07:00:00Z"); // Mon 2 AM
    expect(iso(computeWindow("weekend", now).to)).toBe("2026-10-05T09:00:00.000Z");
  });
  it("weekend across the fall-back DST change", () => {
    const w = computeWindow("weekend", new Date("2026-10-28T15:00:00Z")); // Wed
    expect(iso(w.from)).toBe("2026-10-30T05:00:00.000Z"); // Fri CDT
    expect(iso(w.to)).toBe("2026-11-02T10:00:00.000Z"); // Mon 4 AM CST
  });
  it("two weeks is now + 14 days", () => {
    const now = new Date("2026-09-30T15:00:00Z");
    expect(iso(computeWindow("twoWeeks", now).to)).toBe("2026-10-14T15:00:00.000Z");
  });
});

describe("formatHouston", () => {
  it("formats in Houston time and marks unknown times", () => {
    expect(formatHouston("2026-10-03T01:00:00Z")).toBe("Fri, Oct 2 · 8:00 PM");
    expect(formatHouston("2026-10-02T05:00:00Z", true)).toBe("Fri, Oct 2 · time TBA");
  });
});
