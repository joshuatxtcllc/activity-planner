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
 * Auth: a single shared bearer token from MCP_BEARER_TOKEN. Personal
 * use only — a proper OAuth 2.1 authorization server would be a
 * follow-up if this ever ships to multiple users.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { and, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { db } from "../db";
import {
  events,
  alertRules,
  alertDeliveries,
  watchedVenues,
  insertAlertRuleSchema,
} from "../../shared/schema";
import { startScrapeJob, getScrapeJob } from "../services/scrape-jobs";
import logger from "../utils/logger";

const SERVER_NAME = "activity-planner";
const SERVER_VERSION = "0.1.0";

/**
 * Build a fresh McpServer with the tool set registered. Called once at
 * boot and again for each Streamable HTTP connection so tool handlers
 * capture the request context if we ever need it.
 */
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

      const rows = await db
        .select()
        .from(events)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(events.startDate)
        .limit(args.limit ?? 50);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              rows.map((r) => ({
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
              })),
              null,
              2
            ),
          },
        ],
        structuredContent: { events: rows, count: rows.length },
      };
    }
  );

  // -- list_watched_venues --------------------------------------------
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

  // -- create_alert_rule ----------------------------------------------
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
      },
    },
    async (args) => {
      const payload = insertAlertRuleSchema.parse(args);
      const [created] = await db.insert(alertRules).values(payload).returning();
      return {
        content: [{ type: "text", text: `Created rule ${created.id}: ${created.name}` }],
        structuredContent: { rule: created },
      };
    }
  );

  // -- list_alert_rules -----------------------------------------------
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

  // -- delete_alert_rule ----------------------------------------------
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

  // -- list_rule_deliveries -------------------------------------------
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

  // -- trigger_scrape --------------------------------------------------
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

  // -- get_scrape_status ----------------------------------------------
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
 * Bearer-token middleware. Rejects everything unless MCP_BEARER_TOKEN
 * matches. If the env var is empty, the whole /mcp mount refuses
 * traffic — no auth = no MCP.
 */
export function mcpAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.MCP_BEARER_TOKEN;
  if (!expected) {
    res.status(503).json({ error: "MCP disabled: MCP_BEARER_TOKEN not configured" });
    return;
  }
  const header = req.header("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match || match[1] !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

/**
 * Express handler that speaks the Streamable HTTP transport. Fresh
 * McpServer per request keeps handlers stateless.
 */
export async function handleMcpRequest(req: Request, res: Response) {
  try {
    const transport = new StreamableHTTPServerTransport({
      // Sessionless mode: every request gets a fresh transport. Simpler
      // and safer for a personal-use bearer-token deployment.
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
