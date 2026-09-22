import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { alertRules, alertDeliveries, type Event, type AlertRule } from "../../shared/schema";
import { sendEmail, sendSMS } from "../utils/mailer";
import logger from "../utils/logger";

/**
 * True when a single string field of an event matches at least one of
 * the rule's list values. Case-insensitive substring match — chosen so
 * "House of Blues" matches "House of Blues Houston" without users
 * having to hunt down the canonical spelling.
 */
function anyMatches(needles: string[] | null | undefined, haystack: string | null | undefined): boolean {
  if (!needles || needles.length === 0) return true; // dimension unset ⇒ pass
  if (!haystack) return false;
  const hay = haystack.toLowerCase();
  return needles.some((n) => n && hay.includes(n.toLowerCase()));
}

/**
 * Keywords match if ANY appears in the title OR description
 * (case-insensitive substring).
 */
function keywordMatches(keywords: string[] | null | undefined, event: Event): boolean {
  if (!keywords || keywords.length === 0) return true;
  const blob = `${event.title ?? ""} ${event.description ?? ""}`.toLowerCase();
  return keywords.some((kw) => kw && blob.includes(kw.toLowerCase()));
}

/**
 * Category / source are matched exactly (case-insensitive) since they
 * are enum-like values emitted by scrapers.
 */
function exactAnyMatches(needles: string[] | null | undefined, value: string | null | undefined): boolean {
  if (!needles || needles.length === 0) return true;
  if (!value) return false;
  const v = value.toLowerCase();
  return needles.some((n) => n && n.toLowerCase() === v);
}

function dateInRange(
  event: Event,
  start: Date | null | undefined,
  end: Date | null | undefined
): boolean {
  const eventDate = event.startDate instanceof Date ? event.startDate : new Date(event.startDate);
  if (start && eventDate < start) return false;
  if (end && eventDate > end) return false;
  return true;
}

/**
 * Return true when an event satisfies EVERY dimension of a rule
 * (AND across dimensions) with OR semantics inside each list.
 *
 * A rule with all lists empty and no date bounds matches everything —
 * useful as a catch-all "notify me about anything new" rule.
 */
export function matchRule(rule: AlertRule, event: Event): boolean {
  return (
    keywordMatches(rule.keywords, event) &&
    anyMatches(rule.venues, event.venue) &&
    exactAnyMatches(rule.categories, event.category) &&
    exactAnyMatches(rule.sources, event.source) &&
    dateInRange(event, rule.dateRangeStart, rule.dateRangeEnd)
  );
}

function deliveryKey(ruleId: string, eventId: string, channel: string): string {
  return crypto.createHash("sha256").update(`${ruleId}|${eventId}|${channel}`).digest("hex");
}

function renderEmailBody(rule: AlertRule, matched: Event[]): string {
  const appUrl = process.env.APP_URL || "http://localhost:5000";
  const rows = matched
    .map((e) => {
      const when = (e.startDate instanceof Date ? e.startDate : new Date(e.startDate)).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Chicago",
      });
      const venue = e.venue ? ` — ${e.venue}` : "";
      const price = e.priceMin != null ? ` (from $${(e.priceMin / 100).toFixed(0)})` : "";
      return `<li><a href="${e.url}"><strong>${e.title}</strong></a><br><span style="color:#555">${when}${venue}${price}</span></li>`;
    })
    .join("\n");

  return `
    <h2>🎯 ${matched.length} new event${matched.length === 1 ? "" : "s"} matched your "${rule.name}" alert</h2>
    <ul>${rows}</ul>
    <p><a href="${appUrl}" style="background:#4F46E5;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block">Open the weekly dashboard</a></p>
    <p style="color:#666;font-size:12px;margin-top:24px">You can edit or pause this alert from the Rules page. Sent by your Houston nightlife monitor.</p>
  `;
}

function renderSmsBody(rule: AlertRule, matched: Event[]): string {
  const first = matched[0];
  const when = (first.startDate instanceof Date ? first.startDate : new Date(first.startDate)).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });
  if (matched.length === 1) {
    return `[${rule.name}] ${first.title} · ${when}${first.venue ? " · " + first.venue : ""} · ${first.url}`;
  }
  return `[${rule.name}] ${matched.length} new matches, first: ${first.title} · ${when} · +${matched.length - 1} more. See dashboard.`;
}

async function alreadyDelivered(ruleId: string, eventId: string, channel: string): Promise<boolean> {
  const key = deliveryKey(ruleId, eventId, channel);
  const existing = await db
    .select({ id: alertDeliveries.id })
    .from(alertDeliveries)
    .where(eq(alertDeliveries.uniqueKey, key))
    .limit(1);
  return existing.length > 0;
}

async function recordDelivery(
  ruleId: string,
  eventId: string,
  channel: string,
  status: "sent" | "failed" | "skipped",
  error?: string
): Promise<void> {
  try {
    await db.insert(alertDeliveries).values({
      ruleId,
      eventId,
      channel,
      status,
      error: error ?? null,
      uniqueKey: deliveryKey(ruleId, eventId, channel),
    });
  } catch (e) {
    // Unique-constraint collision means another dispatch beat us to it — fine.
    logger.debug("alert_deliveries insert collision (already recorded)", {
      ruleId,
      eventId,
      channel,
    });
  }
}

/**
 * Evaluate every active alert rule against the newly inserted events,
 * dispatch matches through each configured channel, and record every
 * outcome in alert_deliveries. Deliveries are deduplicated per
 * (rule, event, channel) so re-runs of the scraper never double-alert.
 *
 * Called from runAllScrapers after the per-event insert loop finishes.
 */
export async function evaluateAlerts(newEvents: Event[]): Promise<{
  rulesChecked: number;
  matchesFound: number;
  delivered: number;
}> {
  if (newEvents.length === 0) {
    return { rulesChecked: 0, matchesFound: 0, delivered: 0 };
  }

  let rules: AlertRule[] = [];
  try {
    rules = await db.select().from(alertRules).where(eq(alertRules.isActive, true));
  } catch (error) {
    logger.error("Failed to load alert rules; skipping alert dispatch", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { rulesChecked: 0, matchesFound: 0, delivered: 0 };
  }

  if (rules.length === 0) {
    logger.info("No active alert rules; nothing to dispatch");
    return { rulesChecked: 0, matchesFound: 0, delivered: 0 };
  }

  logger.info(`Evaluating ${rules.length} alert rules against ${newEvents.length} new events`);

  let matchesFound = 0;
  let delivered = 0;

  for (const rule of rules) {
    const matched = newEvents.filter((e) => matchRule(rule, e));
    if (matched.length === 0) continue;

    matchesFound += matched.length;

    // Batch: single email/SMS per rule per run, but per-event delivery
    // rows so the dedup key is granular.
    const emailTo = rule.emailTo || process.env.NOTIFICATION_EMAIL || null;
    const smsTo = rule.smsTo || process.env.NOTIFICATION_SMS || null;

    // Filter out events already delivered via each channel so batched
    // notifications don't restate stale hits.
    const emailPending: Event[] = [];
    const smsPending: Event[] = [];
    for (const ev of matched) {
      if (rule.channelEmail && emailTo && !(await alreadyDelivered(rule.id, ev.id, "email"))) {
        emailPending.push(ev);
      }
      if (rule.channelSms && smsTo && !(await alreadyDelivered(rule.id, ev.id, "sms"))) {
        smsPending.push(ev);
      }
    }

    if (emailPending.length > 0 && emailTo) {
      const subject = `${emailPending.length} new match${emailPending.length === 1 ? "" : "es"}: ${rule.name}`;
      const ok = await sendEmail(emailTo, subject, renderEmailBody(rule, emailPending));
      for (const ev of emailPending) {
        await recordDelivery(rule.id, ev.id, "email", ok ? "sent" : "failed", ok ? undefined : "SMTP send failed");
      }
      if (ok) delivered += emailPending.length;
    }

    if (smsPending.length > 0 && smsTo) {
      const body = renderSmsBody(rule, smsPending);
      const ok = await sendSMS(smsTo, body);
      for (const ev of smsPending) {
        await recordDelivery(rule.id, ev.id, "sms", ok ? "sent" : "failed", ok ? undefined : "twilio_send_failed");
      }
      if (ok) delivered += smsPending.length;
    }

    // Bookkeeping on the rule itself.
    try {
      await db
        .update(alertRules)
        .set({
          lastFiredAt: new Date(),
          totalFired: (rule.totalFired ?? 0) + matched.length,
          updatedAt: new Date(),
        })
        .where(eq(alertRules.id, rule.id));
    } catch (e) {
      logger.debug("Failed to update rule bookkeeping (non-fatal)", { ruleId: rule.id });
    }
  }

  logger.info(
    `Alert evaluation complete: ${rules.length} rules, ${matchesFound} matches, ${delivered} delivered`
  );
  return { rulesChecked: rules.length, matchesFound, delivered };
}
