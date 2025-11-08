import nodemailer from "nodemailer";
import logger from "./logger";

interface ScrapingResult {
  total: number;
  new: number;
  duplicates: number;
}

/**
 * Send email notification about new events
 */
export async function sendEventNotification(
  result: ScrapingResult
): Promise<void> {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    NOTIFICATION_EMAIL,
  } = process.env;

  // Skip if email not configured
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !NOTIFICATION_EMAIL) {
    logger.warn("Email not configured, skipping notification");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || "587"),
      secure: SMTP_PORT === "465",
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const appUrl = process.env.APP_URL || "http://localhost:5000";

    await transporter.sendMail({
      from: SMTP_USER,
      to: NOTIFICATION_EMAIL,
      subject: `🎉 ${result.new} New Houston Events This Weekend!`,
      html: `
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
      `,
    });

    logger.info("Email notification sent successfully");
  } catch (error) {
    logger.error("Failed to send email notification", { error });
  }
}
