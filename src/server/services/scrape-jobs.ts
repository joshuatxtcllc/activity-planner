import { randomUUID } from "crypto";
import logger from "../utils/logger";
import { runAllScrapers } from "../scrapers";

interface ScrapeResult {
  total: number;
  new: number;
  duplicates: number;
  bySource: Record<string, number>;
}

interface ScrapeJob {
  status: "pending" | "completed" | "failed";
  result?: ScrapeResult;
  error?: string;
  createdAt: number;
}

const JOB_TTL_MS = 30 * 60 * 1000; // 30 minutes
const jobs = new Map<string, ScrapeJob>();

function pruneOldJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}

export function startScrapeJob(): string {
  pruneOldJobs();

  const jobId = randomUUID();
  jobs.set(jobId, { status: "pending", createdAt: Date.now() });

  runAllScrapers()
    .then((result) => {
      jobs.set(jobId, { status: "completed", result, createdAt: Date.now() });
    })
    .catch((error) => {
      logger.error("Scrape job failed", { jobId, error });
      jobs.set(jobId, {
        status: "failed",
        error: error instanceof Error ? error.message : "Scraping failed",
        createdAt: Date.now(),
      });
    });

  return jobId;
}

export function getScrapeJob(jobId: string): ScrapeJob | undefined {
  return jobs.get(jobId);
}
