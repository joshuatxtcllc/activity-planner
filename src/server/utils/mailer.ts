import nodemailer from "nodemailer";
import twilio from "twilio";
import logger from "./logger";

// Lazy Twilio client so misconfigured env vars don't crash boot.
let twilioClient: ReturnType<typeof twilio> | null = null;
function getTwilioClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  if (!twilioClient) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

/**
 * Low-level SMS sender via Twilio.
 *
 * Returns true on success, false when Twilio env vars are missing or
 * the send fails. Body is truncated to 1500 chars so multi-segment SMS
 * stays within reasonable carrier limits.
 */
export async function sendSMS(to: string, body: string): Promise<boolean> {
  const { TWILIO_FROM } = process.env;
  const client = getTwilioClient();

  if (!client || !TWILIO_FROM) {
    logger.warn("Twilio not configured; skipping SMS", { to });
    return false;
  }

  const truncated = body.length > 1500 ? body.slice(0, 1497) + "..." : body;

  try {
    await client.messages.create({ to, from: TWILIO_FROM, body: truncated });
    logger.info("SMS sent", { to, length: truncated.length });
    return true;
  } catch (error) {
    logger.error("Failed to send SMS", {
      to,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

interface ScrapingResult {
  total: number;
  new: number;
  duplicates: number;
}

/**
 * Low-level email sender used by the summary notifier and the
 * per-rule alert dispatcher.
 *
 * Returns true on success, false when SMTP env vars are missing or the
 * send fails. Callers use the boolean to record delivery status in
 * alert_deliveries so a failure surfaces in the audit trail without
 * crashing the run.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    logger.warn("SMTP not configured; skipping email", { to, subject });
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || "587"),
      secure: SMTP_PORT === "465",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({ from: SMTP_USER, to, subject, html });
    logger.info("Email sent", { to, subject });
    return true;
  } catch (error) {
    logger.error("Failed to send email", {
      to,
      subject,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Send email notification about new events (post-scrape summary).
 * Kept for backwards compatibility with the existing scheduler.
 */
export async function sendEventNotification(
  result: ScrapingResult
): Promise<void> {
  const { NOTIFICATION_EMAIL } = process.env;
  if (!NOTIFICATION_EMAIL) {
    logger.warn("NOTIFICATION_EMAIL not set; skipping summary email");
    return;
  }

  const appUrl = process.env.APP_URL || "http://localhost:5000";
  const subject = `🎉 ${result.new} New Houston Events This Weekend!`;
  const html = `
    <h2>Houston Events Update</h2>
    <p>Your weekend event scraper has found new activities!</p>

    <ul>
      <li><strong>Total scraped:</strong> ${result.total}</li>
      <li><strong>New events:</strong> ${result.new}</li>
      <li><strong>Duplicates skipped:</strong> ${result.duplicates}</li>
    </ul>

    <p><a href="${appUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Events</a></p>

    <p style="color: #666; font-size: 12px; margin-top: 30px;">
      Sent by Houston Events Aggregator
    </p>
  `;

  await sendEmail(NOTIFICATION_EMAIL, subject, html);
}
