/**
 * Time windows for the map filter, computed in Houston time regardless of
 * the device's own timezone.
 */
export type WindowKey = "tonight" | "weekend" | "twoWeeks";
const TZ = "America/Chicago";

/** Wall-clock parts of an instant in Houston. */
function houstonParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { y: +get("year"), m: +get("month"), d: +get("day"), h: +get("hour"), dow: weekdays.indexOf(get("weekday")) };
}

/** UTC instant for a Houston wall-clock time (DST-correct). */
export function houstonTime(y: number, m: number, d: number, h = 0): Date {
  const wall = Date.UTC(y, m - 1, d, h);
  const offsetAt = (t: number) => {
    const p = houstonParts(new Date(t));
    const minutes = new Date(t).getUTCMinutes();
    return Date.UTC(p.y, p.m - 1, p.d, p.h, minutes) - t;
  };
  let guess = wall - offsetAt(wall);
  guess = wall - offsetAt(guess);
  return new Date(guess);
}

function addDays(y: number, m: number, d: number, n: number) {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/**
 * tonight:  now → 4 AM tomorrow (Houston). After midnight but before
 *           4 AM, "tonight" still means the current night.
 * weekend:  Fri 12 AM → Mon 4 AM of this weekend; from Friday on it
 *           starts now.
 * twoWeeks: now → now + 14 days.
 */
export function computeWindow(key: WindowKey, now: Date = new Date()): { from: Date; to: Date } {
  const p = houstonParts(now);
  if (key === "tonight") {
    const day = p.h < 4 ? { y: p.y, m: p.m, d: p.d } : addDays(p.y, p.m, p.d, 1);
    return { from: now, to: houstonTime(day.y, day.m, day.d, 4) };
  }
  if (key === "weekend") {
    // Days until Friday (Fri=5). Sat/Sun/early-Mon belong to the current weekend.
    const inWeekend = p.dow === 5 || p.dow === 6 || p.dow === 0 || (p.dow === 1 && p.h < 4);
    const daysToFri = inWeekend ? 0 : (5 - p.dow + 7) % 7;
    const fri = addDays(p.y, p.m, p.d, daysToFri);
    const daysToMon = p.dow === 1 && p.h < 4 ? 0 : ((1 - p.dow + 7) % 7 || 7);
    const mon = addDays(p.y, p.m, p.d, daysToMon);
    const friStart = houstonTime(fri.y, fri.m, fri.d, 0);
    return { from: inWeekend ? now : friStart, to: houstonTime(mon.y, mon.m, mon.d, 4) };
  }
  return { from: now, to: new Date(now.getTime() + 14 * 86400000) };
}

export function formatHouston(iso: string | Date, timeUnknown = false): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" });
  if (timeUnknown) return `${date} · time TBA`;
  const time = d.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}
