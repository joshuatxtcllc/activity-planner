import { AxiosError } from "axios";
import logger from "./logger";

/**
 * Sanitize API key by removing whitespace and surrounding quotes
 */
export function sanitizeApiKey(apiKey: string | undefined): string | undefined {
  if (!apiKey) return undefined;
  return apiKey.trim().replace(/^['"]|['"]$/g, '');
}

/**
 * Get a user-friendly error message from an Axios error
 */
export function getErrorMessage(error: unknown, scraperName: string): string {
  if (error instanceof Error) {
    const axiosError = error as AxiosError;

    if (axiosError.response) {
      const status = axiosError.response.status;

      switch (status) {
        case 400:
          return `${scraperName}: Bad request - Check API parameters or credentials`;
        case 401:
          return `${scraperName}: Unauthorized - Invalid API key`;
        case 403:
          return `${scraperName}: Forbidden - Access denied or rate limited`;
        case 404:
          return `${scraperName}: Endpoint not found - URL may have changed`;
        case 429:
          return `${scraperName}: Rate limit exceeded - Too many requests`;
        case 500:
        case 502:
        case 503:
          return `${scraperName}: Server error - Service may be temporarily down`;
        default:
          return `${scraperName}: HTTP ${status} error`;
      }
    }

    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return `${scraperName}: Request timeout`;
    }

    if (axiosError.code === 'ENOTFOUND') {
      return `${scraperName}: DNS resolution failed - Check URL`;
    }

    return `${scraperName}: ${error.message}`;
  }

  return `${scraperName}: Unknown error`;
}

/**
 * Log error with appropriate level based on error type
 */
export function logScraperError(error: unknown, scraperName: string, context?: Record<string, any>) {
  const message = getErrorMessage(error, scraperName);

  // Determine if error is transient (should be a warning) or permanent (error)
  if (error instanceof Error) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;

    // Transient errors: rate limits, timeouts, server errors
    if (status && [429, 500, 502, 503, 504].includes(status)) {
      logger.warn(message, { ...context, error });
      return;
    }

    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      logger.warn(message, { ...context, error });
      return;
    }
  }

  // Permanent errors: log as error
  logger.error(message, { ...context, error });
}
