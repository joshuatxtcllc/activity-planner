
// API configuration settings
interface ApiConfig {
  name: string;
  keyEnvVar: string;
  baseUrl: string;
  ipRanges?: string[];
  notes?: string;
}

// Configuration for all external APIs used in the application
export const apiConfigs: Record<string, ApiConfig> = {
  tripadvisor: {
    name: "TripAdvisor",
    keyEnvVar: "VITE_TRIPADVISOR_API_KEY",
    baseUrl: "https://api.tripadvisor.com/api/v1",
    ipRanges: [
      // Add the IP ranges you provide to TripAdvisor here
      // Example: "123.45.67.0/24"
    ],
    notes: "TripAdvisor requires specific IP ranges for API access. For Replit deployments, contact TripAdvisor support for guidance on cloud hosting."
  },
  ticketmaster: {
    name: "Ticketmaster",
    keyEnvVar: "VITE_TICKETMASTER_API_KEY",
    baseUrl: "https://app.ticketmaster.com/discovery/v2"
  },
  eventbrite: {
    name: "Eventbrite",
    keyEnvVar: "VITE_EVENTBRITE_API_KEY",
    baseUrl: "https://www.eventbriteapi.com/v3"
  }
};

// Helper function to get the API key from environment variables
export const getApiKey = (apiName: keyof typeof apiConfigs): string => {
  const config = apiConfigs[apiName];
  return import.meta.env[config.keyEnvVar] || "";
};
