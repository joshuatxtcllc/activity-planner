import { Router } from "express";
import { desc, eq, and } from "drizzle-orm";
import { db } from "../db";
import { alertRules, alertDeliveries, insertAlertRuleSchema } from "../../shared/schema";
import logger from "../utils/logger";
import { z } from "zod";

const router = Router();

/**
 * Session id resolution mirrors the preferences route: anonymous
 * session cookie set by preferencesRoutes, or explicit sessionId
 * on the payload for local tools.
 */
function getSessionId(req: any, bodySessionId?: string): string | null {
  return (req as any).sessionID || bodySessionId || (req.cookies?.sid as string) || null;
}

/**
 * GET /api/alert-rules
 * List all rules for the current session (or `sessionId` query param).
 */
router.get("/", async (req, res) => {
  try {
    const sessionId = getSessionId(req, req.query.sessionId as string | undefined);
    if (!sessionId) return res.json([]);

    const rules = await db
      .select()
      .from(alertRules)
      .where(eq(alertRules.sessionId, sessionId))
      .orderBy(desc(alertRules.createdAt));

    res.json(rules);
  } catch (error) {
    logger.error("Failed to list alert rules", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Failed to list alert rules" });
  }
});

/**
 * POST /api/alert-rules
 * Create a new rule for the current session.
 */
router.post("/", async (req, res) => {
  try {
    const sessionId = getSessionId(req, req.body?.sessionId);
    if (!sessionId) return res.status(400).json({ error: "No session context" });

    const payload = insertAlertRuleSchema.parse({
      ...req.body,
      sessionId,
    });

    const [created] = await db.insert(alertRules).values(payload).returning();
    res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid payload", details: error.issues });
    }
    logger.error("Failed to create alert rule", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Failed to create alert rule" });
  }
});

/**
 * PUT /api/alert-rules/:id
 * Update a rule the current session owns.
 */
router.put("/:id", async (req, res) => {
  try {
    const sessionId = getSessionId(req, req.body?.sessionId);
    if (!sessionId) return res.status(400).json({ error: "No session context" });

    // Prevent cross-session updates.
    const existing = await db
      .select({ id: alertRules.id })
      .from(alertRules)
      .where(and(eq(alertRules.id, req.params.id), eq(alertRules.sessionId, sessionId)))
      .limit(1);

    if (existing.length === 0) return res.status(404).json({ error: "Not found" });

    // Only allow the mutable subset — no sessionId reassignment.
    const {
      sessionId: _sid,
      id: _id,
      createdAt: _c,
      updatedAt: _u,
      lastFiredAt: _l,
      totalFired: _t,
      ...patch
    } = req.body ?? {};

    const [updated] = await db
      .update(alertRules)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(alertRules.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (error) {
    logger.error("Failed to update alert rule", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Failed to update alert rule" });
  }
});

/**
 * DELETE /api/alert-rules/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const sessionId = getSessionId(req, req.body?.sessionId);
    if (!sessionId) return res.status(400).json({ error: "No session context" });

    const result = await db
      .delete(alertRules)
      .where(and(eq(alertRules.id, req.params.id), eq(alertRules.sessionId, sessionId)))
      .returning({ id: alertRules.id });

    if (result.length === 0) return res.status(404).json({ error: "Not found" });
    res.json({ id: result[0].id, deleted: true });
  } catch (error) {
    logger.error("Failed to delete alert rule", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Failed to delete alert rule" });
  }
});

/**
 * GET /api/alert-rules/:id/deliveries
 * Audit trail for one rule — used by the rules page to show what has
 * been sent, when, and via which channel.
 */
router.get("/:id/deliveries", async (req, res) => {
  try {
    const sessionId = getSessionId(req, req.query.sessionId as string | undefined);
    if (!sessionId) return res.status(400).json({ error: "No session context" });

    const ownership = await db
      .select({ id: alertRules.id })
      .from(alertRules)
      .where(and(eq(alertRules.id, req.params.id), eq(alertRules.sessionId, sessionId)))
      .limit(1);

    if (ownership.length === 0) return res.status(404).json({ error: "Not found" });

    const rows = await db
      .select()
      .from(alertDeliveries)
      .where(eq(alertDeliveries.ruleId, req.params.id))
      .orderBy(desc(alertDeliveries.sentAt))
      .limit(200);

    res.json(rows);
  } catch (error) {
    logger.error("Failed to list rule deliveries", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Failed to list deliveries" });
  }
});

export default router;
