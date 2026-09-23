import { describe, expect, it } from "vitest";
import { and, gte, isNotNull, lte, sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { events } from "../../shared/schema";
import { boundingBoxMiles, haversineMilesSql } from "./geo";

/**
 * These tests don't run SQL — they compile the fragments the /mcp
 * geo-filter branch builds and assert the produced text is what we
 * expect. This catches column-name typos, unbalanced parens, and
 * accidentally-quoted numeric literals without needing a live database.
 */
describe("haversine SQL codegen", () => {
  const dialect = new PgDialect();
  const heights = { lat: 29.7998, lng: -95.4109 };

  it("produces a distance expression that references both coordinate columns", () => {
    const expr = haversineMilesSql(
      sql`${events.latitude}`,
      sql`${events.longitude}`,
      heights
    );
    const q = dialect.sqlToQuery(expr);
    expect(q.sql).toMatch(/radians\("events"\."latitude"\)/);
    expect(q.sql).toMatch(/radians\("events"\."longitude"\)/);
    // Earth-radius constant should be inlined, not smuggled in as a param.
    expect(q.sql).toMatch(/7917\.5/); // 2 * 3958.7613 (rounded start)
  });

  it("builds a bounding-box WHERE clause with parameterized bounds", () => {
    const bbox = boundingBoxMiles(heights, 3);
    const where = and(
      isNotNull(events.latitude),
      isNotNull(events.longitude),
      gte(events.latitude, bbox.minLat),
      lte(events.latitude, bbox.maxLat),
      gte(events.longitude, bbox.minLng),
      lte(events.longitude, bbox.maxLng)
    )!;
    const q = dialect.sqlToQuery(where);
    expect(q.sql).toContain('"events"."latitude" is not null');
    expect(q.sql).toContain('"events"."longitude" is not null');
    // Bounds should appear as parameter placeholders, not string literals.
    expect(q.sql).toMatch(/"events"\."latitude" >= \$\d/);
    expect(q.sql).toMatch(/"events"\."latitude" <= \$\d/);
    expect(q.sql).toMatch(/"events"\."longitude" >= \$\d/);
    expect(q.sql).toMatch(/"events"\."longitude" <= \$\d/);
    // Params carry the numeric bounds.
    expect(q.params).toContain(bbox.minLat);
    expect(q.params).toContain(bbox.maxLat);
    expect(q.params).toContain(bbox.minLng);
    expect(q.params).toContain(bbox.maxLng);
  });
});
