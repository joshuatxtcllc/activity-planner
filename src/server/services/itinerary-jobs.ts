import { randomUUID } from "crypto";
import logger from "../utils/logger";
import { generateItinerary, type ItineraryPreferences, type GeneratedItinerary } from "./itinerary-generator";

interface ItineraryJob {
  status: "pending" | "completed" | "failed";
  result?: GeneratedItinerary;
  error?: string;
  createdAt: number;
}

const JOB_TTL_MS = 30 * 60 * 1000; // 30 minutes
const jobs = new Map<string, ItineraryJob>();

function pruneOldJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}

export function startItineraryJob(preferences: ItineraryPreferences): string {
  pruneOldJobs();

  const jobId = randomUUID();
  jobs.set(jobId, { status: "pending", createdAt: Date.now() });

  generateItinerary(preferences)
    .then((result) => {
      jobs.set(jobId, { status: "completed", result, createdAt: Date.now() });
    })
    .catch((error) => {
      logger.error("Itinerary job failed", { jobId, error });
      jobs.set(jobId, {
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to generate itinerary",
        createdAt: Date.now(),
      });
    });

  return jobId;
}

export function getItineraryJob(jobId: string): ItineraryJob | undefined {
  return jobs.get(jobId);
}
