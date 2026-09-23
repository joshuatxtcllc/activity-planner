/**
 * Model Context Protocol (MCP) server exposing Activity Planner's
 * event catalog and alert-rule engine as tools an LLM host can call.
 *
 * Unlike src/server/mcp/, which is a Socket.io multi-agent chat layer
 * that reuses the "MCP" acronym for something else, this module speaks
 * the real MCP wire protocol (https://modelcontextprotocol.io) so
 * Perplexity, Claude Desktop, and any other MCP-aware host can register
 * this app as a custom connector.
 *
 * Transport: Streamable HTTP (the current spec-compliant transport). We
 * mount it as an Express handler at /mcp so it lives alongside the
 * existing REST routes and inherits the same TLS + reverse proxy.
 *
 * Auth: full OAuth 2.1 with Dynamic Client Registration (RFC 7591) and
 * PKCE (RFC 7636), served by an in-process authorization server backed
 * by ActivityPlannerOAuthProvider. The metadata endpoints, /register,
 * /authorize, and /token routes are mounted by the SDK's mcpAuthRouter
 * at the application root; /mcp itself is gated by requireBearerAuth,
 * which validates the access tokens issued by that authorization
 * server. See oauth-provider.ts for the provider details, including
 * the consent-page bearer-token gate that keeps this a single-operator
 * deployment.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { z } from "zod";
import express, { type Express, type Request, type Response } from "express";
import { and, desc, eq, gte, ilike, isNotNull, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  events,
  alertRules,
  alertDeliveries,
  watchedVenues,
  insertAlertRuleSchema,
} from "../../shared/schema";
import { startScrapeJob, getScrapeJob } from "../services/scrape-jobs";
import {
  boundingBoxMiles,
  centroidForZip,
  distanceMiles,
  haversineMilesSql,
  isValidLatLng,
  type LatLng,
} from "../services/geo";
import {
  backfillEventGeo,
  backfillWatchedVenueGeo,
} from "../services/geocode-backfill";
import logger from "../utils/logger";
import { ActivityPlannerOAuthProvider } from "./oauth-provider";

// ---------------------------------------------------------------------------
// Shared geo-arg helpers
// ---------------------------------------------------------------------------

/** Zod schema fragment for center-point args accepted by geo tools. */
const geoCenterArgs = {
  centerZip: z
    .string()
    .optional()
    .describe(
      "5-digit ZIP code. Resolved against a bundled Houston-area centroid table. " +
        "Ignored if centerLat/centerLng are also passed."
    ),
  centerLat: z.number().min(-90).max(90).optional(),
  centerLng: z.number().min(-180).max(180).optional(),
} as const;

/**
 * Resolve center-point args to a concrete {lat, lng}, preferring
 * explicit lat/lng, then a ZIP centroid. Returns null when neither is
 * usable so callers can decide whether to surface an error.
 */
function resolveCenter(args: {
  centerZip?: string;
  centerLat?: number;
  centerLng?: number;
}): LatLng | null {
  if (args.centerLat != null && args.centerLng != null) {
    const p = { lat: args.centerLat, lng: args.centerLng };
    return isValidLatLng(p) ? p : null;
  }
  if (args.centerZip) return centroidForZip(args.centerZip);
  return null;
}

const SERVER_NAME = "activity-planner";
const SERVER_VERSION = "0.2.0";

function buildServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions:
        "Activity Planner exposes Houston event data and interest-based alert rules. " +
        "Use list_events to query the catalog with venue/date/category filters, " +
        "create_alert_rule to subscribe to future matches, and trigger_scrape to " +
        "refresh the catalog. The scrape is asynchronous — poll get_scrape_status " +
        "with the returned jobId.",
    }
  );

  // -- list_events -----------------------------------------------------
  server.registerTool(
    "list_events",
    {
      title: "List events",
      description:
        "Query Activity Planner's event catalog. All filters are optional and " +
        "combined with AND. Venue matches by substring (case-insensitive), so " +
        '"House of Blues" catches "House of Blues Houston". Categories and ' +
        "sources match exactly. Returns up to `limit` rows (default 50, max 200).",
      inputSchema: {
        venue: z.string().optional().describe("Substring, e.g. 'Toyota Center'"),
        category: z
          .string()
          .optional()
          .describe("Exact match: music, comedy, sports, game_night, arts, food, etc."),
        source: z
          .string()
          .optional()
          .describe("Exact scraper source id, e.g. ticketmaster, houstonimprov"),
        search: z.string().optional().describe("Free-text search over title + description"),
        dateStart: z.string().optional().describe("ISO 8601 lower bound on startDate"),
        dateEnd: z.string().optional().describe("ISO 8601 upper bound on startDate"),
        upcomingOnly: z.boolean().optional().default(true),
        // Geo filter (optional). When radiusMiles + a center are set,
        // the result is restricted to events whose lat/lng falls within
        // the radius. Events without coordinates are excluded from
        // radius queries — same fail-closed policy as alert rules.
        ...geoCenterArgs,
        radiusMiles: z.number().positive().max(500).optional(),
        limit: z.number().int().min(1).max(200).optional().default(50),
      },
    },
    async (args) => {
      const filters = [];
      if (args.venue) filters.push(ilike(events.venue, `%${args.venue}%`));
      if (args.category) filters.push(eq(events.category, args.category));
      if (args.source) filters.push(eq(events.source, args.source));
      if (args.upcomingOnly !== false) filters.push(gte(events.startDate, new Date()));
      if (args.dateStart) {
        const d = new Date(args.dateStart);
        if (!isNaN(d.getTime())) filters.push(gte(events.startDate, d));
      }
      if (args.dateEnd) {
        const d = new Date(args.dateEnd);
        if (!isNaN(d.getTime())) filters.push(lte(events.startDate, d));
      }
      if (args.search) {
        const term = `%${args.search}%`;
        filters.push(or(ilike(events.title, term), ilike(events.description, term))!);
      }

      // Geo filter: bounding-box prefilter in SQL, then exact haversine
      // check via extra selected column. Keeps the DB doing the coarse
      // work while we get precise distance out for free.
      const center = resolveCenter(args);
      const radius = args.radiusMiles;
      let distanceSql = null as ReturnType<typeof haversineMilesSql> | null;
      if (center && radius && radius > 0) {
        const bbox = boundingBoxMiles(center, radius);
        filters.push(isNotNull(events.latitude));
        filters.push(isNotNull(events.longitude));
        filters.push(gte(events.latitude, bbox.minLat));
        filters.push(lte(events.latitude, bbox.maxLat));
        filters.push(gte(events.longitude, bbox.minLng));
        filters.push(lte(events.longitude, bbox.maxLng));
        distanceSql = haversineMilesSql(
          sql`${events.latitude}`,
          sql`${events.longitude}`,
          center
        );
      }

      const selectShape = distanceSql
        ? { row: events, distanceMiles: distanceSql }
        : { row: events };

      const query = db
        .select(selectShape as any)
        .from(events)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(events.startDate)
        .limit(args.limit ?? 50);

      const raw = (await query) as Array<any>;
      // When geo is set we also filter out rows that passed the bbox but
      // sit outside the exact radius, and stamp `distanceMiles`.
      const enriched = raw
        .map((r) => {
          const row = r.row ?? r;
          const d =
            typeof r.distanceMiles === "number"
              ? r.distanceMiles
              : center && row.latitude != null && row.longitude != null
              ? distanceMiles(center, { lat: row.latitude, lng: row.longitude })
              : null;
          return { ...row, distanceMiles: d };
        })
        .filter((r) =>
          radius && r.distanceMiles != null ? r.distanceMiles <= radius : true
        );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              enriched.map((r) => ({
                id: r.id,
                title: r.title,
                startDate: r.startDate,
                venue: r.venue,
                location: r.location,
                category: r.category,
                source: r.source,
                priceMin: r.priceMin,
                priceMax: r.priceMax,
                isFree: r.isFree,
                url: r.url,
                latitude: r.latitude,
                longitude: r.longitude,
                distanceMiles:
                  r.distanceMiles != null ? Number(r.distanceMiles.toFixed(2)) : null,
              })),
              null,
              2
            ),
          },
        ],
        structuredContent: { events: enriched, count: enriched.length },
      };
    }
  );

  // -- find_venues_near ------------------------------------------------
  server.registerTool(
    "find_venues_near",
    {
      title: "Find venues near a point",
      description:
        "Return the seeded watched-venue registry filtered to those within " +
        "`radiusMiles` of a center point. Pass either a Houston ZIP (centerZip) " +
        "or an explicit centerLat + centerLng. Sorted by distance ascending. " +
        "Venues without coordinates are excluded — run enrich_venue_geo to " +
        "resolve them.",
      inputSchema: {
        ...geoCenterArgs,
        radiusMiles: z.number().positive().max(100).default(5),
        limit: z.number().int().min(1).max(200).default(50),
      },
    },
    async (args) => {
      const center = resolveCenter(args);
      if (!center) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                "Center point required. Pass either centerZip (Houston-area) or both " +
                "centerLat and centerLng.",
            },
          ],
        };
      }
      const rows = await db
        .select()
        .from(watchedVenues)
        .where(and(isNotNull(watchedVenues.latitude), isNotNull(watchedVenues.longitude)))
        .orderBy(watchedVenues.name);
      const enriched = rows
        .map((v) => ({
          ...v,
          distanceMiles:
            v.latitude != null && v.longitude != null
              ? distanceMiles(center, { lat: v.latitude, lng: v.longitude })
              : null,
        }))
        .filter((v) => v.distanceMiles != null && v.distanceMiles <= args.radiusMiles)
        .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0))
        .slice(0, args.limit);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              enriched.map((v) => ({
                slug: v.slug,
                name: v.name,
                neighborhood: v.neighborhood,
                address: v.address,
                latitude: v.latitude,
                longitude: v.longitude,
                distanceMiles:
                  v.distanceMiles != null ? Number(v.distanceMiles.toFixed(2)) : null,
              })),
              null,
              2
            ),
          },
        ],
        structuredContent: { venues: enriched, count: enriched.length, center },
      };
    }
  );

  // -- enrich_venue_geo ------------------------------------------------
  server.registerTool(
    "enrich_venue_geo",
    {
      title: "Backfill lat/lng via Google Places",
      description:
        "Resolve missing coordinates on watched_venues and events using the " +
        "Places API (cached in place_lookups). Idempotent; skips rows that " +
        "were previously marked not_found. Requires GOOGLE_MAPS_API_KEY in " +
        "the server env.",
      inputSchema: {
        scope: z.enum(["venues", "events", "both"]).default("both"),
        limit: z.number().int().min(1).max(500).default(100),
        dryRun: z.boolean().default(false),
      },
    },
    async (args) => {
      const results: unknown[] = [];
      if (args.scope === "venues" || args.scope === "both") {
        results.push(
          await backfillWatchedVenueGeo({ limit: args.limit, dryRun: args.dryRun })
        );
      }
      if (args.scope === "events" || args.scope === "both") {
        results.push(
          await backfillEventGeo({ limit: args.limit, dryRun: args.dryRun })
        );
      }
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        structuredContent: { results },
      };
    }
  );

  server.registerTool(
    "list_watched_venues",
    {
      title: "List watched venues",
      description:
        "Return the seeded venue registry (Toyota Center, House of Blues Houston, " +
        "713 Music Hall, Houston Improv). Use the slugs and aliases when composing " +
        "alert rule venue filters.",
      inputSchema: {},
    },
    async () => {
      const rows = await db.select().from(watchedVenues).orderBy(watchedVenues.name);
      return {
        content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
        structuredContent: { venues: rows },
      };
    }
  );

  server.registerTool(
    "create_alert_rule",
    {
      title: "Create alert rule",
      description:
        "Subscribe to future events matching the given filters. AND across dimensions, " +
        "OR inside each list. sessionId is required to scope ownership; every rule " +
        "belongs to exactly one session. Delivery channels default to email + in-app.",
      inputSchema: {
        sessionId: z.string().min(1),
        name: z.string().min(1),
        keywords: z.array(z.string()).optional().default([]),
        venues: z.array(z.string()).optional().default([]),
        categories: z.array(z.string()).optional().default([]),
        sources: z.array(z.string()).optional().default([]),
        emailTo: z.string().email().optional().nullable(),
        smsTo: z.string().optional().nullable(),
        channelEmail: z.boolean().optional().default(true),
        channelSms: z.boolean().optional().default(false),
        channelInApp: z.boolean().optional().default(true),
        // Optional geo filter. All three must be set (or resolvable from
        // centerZip) to activate the filter; otherwise it's ignored.
        centerZip: z.string().optional(),
        centerLat: z.number().min(-90).max(90).optional(),
        centerLng: z.number().min(-180).max(180).optional(),
        radiusMiles: z.number().positive().max(500).optional(),
      },
    },
    async (args) => {
      // Resolve centerZip → lat/lng at creation time so evaluation stays
      // cheap. If the ZIP is unknown and no explicit coords were given,
      // the geo filter is simply not applied.
      const resolved = resolveCenter(args);
      const payload = insertAlertRuleSchema.parse({
        ...args,
        centerLat: resolved?.lat ?? args.centerLat ?? null,
        centerLng: resolved?.lng ?? args.centerLng ?? null,
        radiusMiles: args.radiusMiles ?? null,
      });
      const [created] = await db.insert(alertRules).values(payload).returning();
      return {
        content: [{ type: "text", text: `Created rule ${created.id}: ${created.name}` }],
        structuredContent: { rule: created },
      };
    }
  );

  server.registerTool(
    "list_alert_rules",
    {
      title: "List alert rules",
      description: "List every alert rule owned by the given session, newest first.",
      inputSchema: { sessionId: z.string().min(1) },
    },
    async (args) => {
      const rows = await db
        .select()
        .from(alertRules)
        .where(eq(alertRules.sessionId, args.sessionId))
        .orderBy(desc(alertRules.createdAt));
      return {
        content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
        structuredContent: { rules: rows, count: rows.length },
      };
    }
  );

  server.registerTool(
    "delete_alert_rule",
    {
      title: "Delete alert rule",
      description:
        "Delete a rule. sessionId is required and must own the rule — cross-session " +
        "deletion is refused.",
      inputSchema: {
        sessionId: z.string().min(1),
        ruleId: z.string().uuid(),
      },
    },
    async (args) => {
      const result = await db
        .delete(alertRules)
        .where(and(eq(alertRules.id, args.ruleId), eq(alertRules.sessionId, args.sessionId)))
        .returning({ id: alertRules.id });
      if (result.length === 0) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Rule ${args.ruleId} not found for session ${args.sessionId}`,
            },
          ],
        };
      }
      return {
        content: [{ type: "text", text: `Deleted rule ${args.ruleId}` }],
        structuredContent: { deleted: true, id: args.ruleId },
      };
    }
  );

  server.registerTool(
    "list_rule_deliveries",
    {
      title: "List rule deliveries",
      description:
        "Audit trail for one rule — every dispatch attempt (sent / failed / skipped), " +
        "newest first. sessionId must own the rule.",
      inputSchema: {
        sessionId: z.string().min(1),
        ruleId: z.string().uuid(),
        limit: z.number().int().min(1).max(500).optional().default(50),
      },
    },
    async (args) => {
      const ownership = await db
        .select({ id: alertRules.id })
        .from(alertRules)
        .where(and(eq(alertRules.id, args.ruleId), eq(alertRules.sessionId, args.sessionId)))
        .limit(1);
      if (ownership.length === 0) {
        return {
          isError: true,
          content: [{ type: "text", text: `Rule ${args.ruleId} not found for session` }],
        };
      }
      const rows = await db
        .select()
        .from(alertDeliveries)
        .where(eq(alertDeliveries.ruleId, args.ruleId))
        .orderBy(desc(alertDeliveries.sentAt))
        .limit(args.limit ?? 50);
      return {
        content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
        structuredContent: { deliveries: rows, count: rows.length },
      };
    }
  );

  server.registerTool(
    "trigger_scrape",
    {
      title: "Trigger a scrape",
      description:
        "Kick off runAllScrapers in the background. Returns immediately with a jobId. " +
        "Poll get_scrape_status to see when it finishes.",
      inputSchema: {},
    },
    async () => {
      const jobId = startScrapeJob();
      return {
        content: [{ type: "text", text: `Scrape started. jobId=${jobId}` }],
        structuredContent: { jobId },
      };
    }
  );

  server.registerTool(
    "get_scrape_status",
    {
      title: "Get scrape status",
      description: "Return status + result for a previously started scrape job.",
      inputSchema: { jobId: z.string().uuid() },
    },
    async (args) => {
      const job = getScrapeJob(args.jobId);
      if (!job) {
        return {
          isError: true,
          content: [{ type: "text", text: `No job ${args.jobId} — it may have expired.` }],
        };
      }
      const jobRecord: Record<string, unknown> = { ...job };
      return {
        content: [{ type: "text", text: JSON.stringify(job, null, 2) }],
        structuredContent: jobRecord,
      };
    }
  );

  return server;
}

/**
 * Streamable HTTP request handler. Fresh McpServer + transport per
 * request keeps the handler stateless.
 */
async function handleMcpRequest(req: Request, res: Response): Promise<void> {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on("close", () => {
      transport.close().catch(() => void 0);
    });
    const server = buildServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error("MCP request failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    if (!res.headersSent) {
      res.status(500).json({ error: "MCP request failed" });
    }
  }
}

/**
 * Install every route this connector needs on the given Express app.
 *
 * MCP_BEARER_TOKEN controls whether the connector is enabled at all:
 * - unset  → /mcp and every OAuth route return 503 (fail closed)
 * - set    → /mcp validates access tokens issued by the OAuth server,
 *            and the consent page requires this exact value from the
 *            operator to grant an authorization code.
 *
 * MCP_ISSUER_URL should be the public HTTPS origin (e.g.
 * https://your-app.up.railway.app). It's used to build the metadata
 * documents and as the `issuer` claim. If unset, we derive it from
 * the incoming request headers — fine for personal use but brittle
 * behind unusual proxy configs.
 */
export function installMcpConnector(app: Express): void {
  const consentToken = process.env.MCP_BEARER_TOKEN;
  if (!consentToken) {
    const stub = (_req: Request, res: Response) => {
      res.status(503).json({ error: "MCP disabled: MCP_BEARER_TOKEN not configured" });
    };
    app.all("/mcp", stub);
    app.all("/.well-known/oauth-authorization-server", stub);
    app.all("/.well-known/oauth-protected-resource", stub);
    app.all("/oauth/*", stub);
    logger.warn("MCP connector disabled: MCP_BEARER_TOKEN is not set");
    return;
  }

  // Derive the public issuer URL. Prefer an explicit env var; otherwise
  // fall back to the first /mcp hit and remember it. In practice
  // Railway sets a stable public hostname, so pinning MCP_ISSUER_URL in
  // the environment is the recommended production setup.
  const explicitIssuer = process.env.MCP_ISSUER_URL;
  const issuerUrl = new URL(explicitIssuer || "https://placeholder.invalid");

  const provider = new ActivityPlannerOAuthProvider(consentToken);

  // The SDK's mcpAuthRouter installs metadata endpoints
  // (/.well-known/oauth-authorization-server + oauth-protected-resource),
  // /register (dynamic client registration), /authorize, /token, and
  // /revoke. It also enforces PKCE end-to-end.
  app.use(
    mcpAuthRouter({
      provider,
      issuerUrl,
      resourceName: "Activity Planner",
      scopesSupported: ["mcp"],
      // Advertise a documentation URL so MCP clients can surface a
      // "learn more" link on their consent screen if they want.
      serviceDocumentationUrl: new URL("https://github.com/joshuatxtcllc/activity-planner"),
    })
  );

  // The consent form POSTs here with { pending_id, consent_token }.
  // Mounted as urlencoded because it's a plain HTML form submission.
  app.post(
    "/oauth/complete-authorize",
    express.urlencoded({ extended: false }),
    (req: Request, res: Response) => {
      const pendingId = String(req.body?.pending_id ?? "");
      const consent = String(req.body?.consent_token ?? "");
      if (!pendingId) {
        res.status(400).json({ error: "pending_id required" });
        return;
      }
      provider.completeAuthorization(pendingId, consent, res);
    }
  );

  // The MCP endpoint itself. Every request must carry an access token
  // issued by /oauth/token. The middleware attaches AuthInfo to
  // req.auth on success and returns a spec-compliant WWW-Authenticate
  // header on 401.
  const resourceMetadataUrl = new URL(
    "/.well-known/oauth-protected-resource",
    issuerUrl
  ).toString();
  app.all(
    "/mcp",
    requireBearerAuth({
      verifier: provider,
      resourceMetadataUrl,
    }),
    (req: Request, res: Response) => {
      handleMcpRequest(req, res).catch(() => void 0);
    }
  );

  logger.info("MCP connector installed", {
    issuer: issuerUrl.toString(),
    resourceMetadataUrl,
  });
}
