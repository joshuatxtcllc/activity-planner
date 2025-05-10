import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  app.get("/api/activities", async (_req, res) => {
    try {
      const activities = await storage.getActivities();
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.get("/api/activities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const activity = await storage.getActivity(id);
      
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // Proxy endpoints for third-party APIs to avoid CORS issues

  // Proxy endpoint for Ticketmaster API
  app.get("/api/proxy/ticketmaster", async (req, res) => {
    try {
      const { apiKey, latitude, longitude, radius = 25 } = req.query;
      
      if (!apiKey || !latitude || !longitude) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      const baseUrl = "https://app.ticketmaster.com/discovery/v2/events.json";
      const params = new URLSearchParams({
        apikey: apiKey as string,
        latlong: `${latitude},${longitude}`,
        radius: radius as string,
        size: "50",  // Increased from 20 to 50 for more events
        sort: "date,asc",
        classificationName: "music,sports,arts,film,miscellaneous", // Include more categories
        includeTBA: "no",
        includeTBD: "no",
        startDateTime: new Date().toISOString().slice(0, -5) + "Z" // Only future events
      });
      
      console.log("Ticketmaster API URL:", `${baseUrl}?${params.toString()}`);
      
      const response = await fetch(`${baseUrl}?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ActivityPlanner/1.0'
        }
      });
      
      if (!response.ok) {
        console.error("Ticketmaster API error status:", response.status);
        console.error("Ticketmaster API error text:", response.statusText);
        
        // Try to get more detailed error information
        let errorDetail: Record<string, unknown> = {};
        try {
          const jsonResponse = await response.json();
          errorDetail = jsonResponse as Record<string, unknown>;
          console.error("Ticketmaster error details:", JSON.stringify(errorDetail));
        } catch (e) {
          // If json parsing fails, continue with basic error
        }
        
        return res.status(response.status).json({ 
          error: `Ticketmaster API error: ${response.statusText}`,
          details: errorDetail
        });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Ticketmaster proxy error:", error);
      res.status(500).json({ 
        error: "Failed to fetch from Ticketmaster API",
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Proxy endpoint for Eventbrite API
  app.get("/api/proxy/eventbrite", async (req, res) => {
    try {
      const { apiKey, latitude, longitude, radius = 25 } = req.query;
      
      if (!apiKey || !latitude || !longitude) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      // Eventbrite V3 API requires a different endpoint structure and OAuth 2.0 authorization
      const url = `https://www.eventbriteapi.com/v3/events/search/`;
      
      // Build proper query params
      const params = new URLSearchParams({
        'location.latitude': latitude as string,
        'location.longitude': longitude as string,
        'location.within': `${radius}km`, 
        'expand': 'venue,category,ticket_availability',
        'sort_by': 'date'
      });
      
      console.log("Eventbrite API URL:", `${url}?${params.toString()}`);
      
      const response = await fetch(`${url}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error("Eventbrite API error status:", response.status);
        console.error("Eventbrite API error text:", response.statusText);
        
        // Try to get more detailed error information
        let errorDetail: Record<string, unknown> = {};
        try {
          const jsonResponse = await response.json();
          errorDetail = jsonResponse as Record<string, unknown>;
        } catch (e) {
          // If json parsing fails, continue with basic error
        }
        
        return res.status(response.status).json({ 
          error: `Eventbrite API error: ${response.statusText}`,
          details: errorDetail
        });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Eventbrite proxy error:", error);
      res.status(500).json({ error: "Failed to fetch from Eventbrite API", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Proxy endpoint for TripAdvisor location search
  app.get("/api/proxy/tripadvisor/location", async (req, res) => {
    try {
      const { apiKey, latitude, longitude } = req.query;
      
      if (!apiKey || !latitude || !longitude) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      // Updated URL with correct format for TripAdvisor API - adding required searchQuery parameter
      const url = `https://api.content.tripadvisor.com/api/v1/location/search?key=${apiKey}&latLng=${latitude},${longitude}&searchQuery=attractions&category=attractions&radius=25&language=en&radiusUnit=km`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ActivityPlanner/1.0'
        }
      });
      
      if (!response.ok) {
        console.error("TripAdvisor API error status:", response.status);
        console.error("TripAdvisor API error text:", response.statusText);
        
        // Try to get more detailed error information
        let errorDetail: Record<string, unknown> = {};
        try {
          const jsonResponse = await response.json();
          errorDetail = jsonResponse as Record<string, unknown>;
          console.error("TripAdvisor error details:", JSON.stringify(errorDetail));
        } catch (e) {
          // If json parsing fails, continue with basic error
        }
        
        return res.status(response.status).json({ 
          error: `TripAdvisor API error: ${response.statusText}`,
          details: errorDetail
        });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("TripAdvisor location search proxy error:", error);
      res.status(500).json({ 
        error: "Failed to fetch from TripAdvisor API", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Proxy endpoint for TripAdvisor attractions
  app.get("/api/proxy/tripadvisor/attractions", async (req, res) => {
    try {
      const { apiKey, locationId } = req.query;
      
      if (!apiKey || !locationId) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      const url = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/attractions?key=${apiKey}&language=en&limit=20`;
      
      console.log("TripAdvisor Attractions URL:", url);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ActivityPlanner/1.0'
        }
      });
      
      if (!response.ok) {
        console.error("TripAdvisor Attractions API error status:", response.status);
        console.error("TripAdvisor Attractions API error text:", response.statusText);
        
        // Try to get more detailed error information
        let errorDetail: Record<string, unknown> = {};
        try {
          const jsonResponse = await response.json();
          errorDetail = jsonResponse as Record<string, unknown>;
          console.error("TripAdvisor Attractions error details:", JSON.stringify(errorDetail));
        } catch (e) {
          // If json parsing fails, continue with basic error
        }
        
        return res.status(response.status).json({ 
          error: `TripAdvisor API error: ${response.statusText}`,
          details: errorDetail
        });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("TripAdvisor attractions proxy error:", error);
      res.status(500).json({ 
        error: "Failed to fetch from TripAdvisor API",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Google Custom Search JSON API for events
  app.get("/api/proxy/google-search", async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q) {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      // Create a search query that focuses on events
      let searchQuery = q as string;
      
      // If the query doesn't explicitly mention events, add "events" to it
      if (!searchQuery.toLowerCase().includes('event') && !searchQuery.toLowerCase().includes('show')) {
        searchQuery = `events ${searchQuery}`;
      }
      
      // Get API key from environment variables
      const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
      
      if (!apiKey || !searchEngineId) {
        console.log("Google Search API credentials missing. Using fallback data.");
        
        // If API keys are missing, use fallback data
        // Extract location information from query if available
        const locationMatch = searchQuery.match(/in ([a-z0-9 ]+)/i);
        const location = locationMatch ? locationMatch[1] : 'your area';
        
        // Extract event types from query if available
        const eventTypes = ['concert', 'festival', 'exhibition', 'show', 'game', 'workshop'];
        const matchedTypes = eventTypes.filter(type => searchQuery.toLowerCase().includes(type));
        const eventType = matchedTypes.length > 0 ? matchedTypes[0] : 'events';
        
        // Create a few sample events
        const eventNames = [
          `${location.charAt(0).toUpperCase() + location.slice(1)} ${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Weekend`,
          `Annual ${eventType.charAt(0).toUpperCase() + eventType.slice(1)} in ${location.charAt(0).toUpperCase() + location.slice(1)}`,
          `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} at City Center`,
          `Local ${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Showcase`,
          `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Celebration`
        ];
        
        const venues = ['City Center', 'Downtown Arena', 'Community Hall', 'Exhibition Center', 'Arts District'];
        
        // Get the next few dates for the coming weekend
        const today = new Date();
        const nextFriday = new Date(today);
        nextFriday.setDate(today.getDate() + (5 - today.getDay() + 7) % 7);
        
        const nextSaturday = new Date(nextFriday);
        nextSaturday.setDate(nextFriday.getDate() + 1);
        
        const nextSunday = new Date(nextSaturday);
        nextSunday.setDate(nextSaturday.getDate() + 1);
        
        const dates = [
          nextFriday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          nextSaturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          nextSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        ];
        
        // Generate 5 sample events with a fallback data flag
        const results = [];
        for (let i = 0; i < 5; i++) {
          results.push({
            title: eventNames[i],
            link: `https://example.com/events/${i}`,
            snippet: `Join us for ${eventNames[i]} on ${dates[i % 3]} at ${venues[i % 5]} in ${location}. Great ${eventType} and activities for all ages.`,
            formattedDate: dates[i % 3],
            venue: venues[i % 5],
            // Add a flag to indicate this is fallback data
            usingFallbackData: true
          });
        }
        
        return res.json(results);
      }
      
      // Extract the actual search engine ID from any HTML code
      // The cx ID should be in the format "123456789012345678:abcdefghij"
      let cleanSearchEngineId = searchEngineId;
      
      // Check if it's wrapped in HTML (from Google's embed code)
      const cxMatch = searchEngineId.match(/cx=([^"&\s]+)/);
      if (cxMatch && cxMatch[1]) {
        cleanSearchEngineId = cxMatch[1];
        console.log("Extracted search engine ID:", cleanSearchEngineId);
      }
      
      // Build Google Custom Search API URL
      const googleApiUrl = new URL('https://www.googleapis.com/customsearch/v1');
      googleApiUrl.searchParams.append('key', apiKey);
      googleApiUrl.searchParams.append('cx', cleanSearchEngineId);
      googleApiUrl.searchParams.append('q', searchQuery);
      
      // We can use Google's date restriction feature to get recent results
      googleApiUrl.searchParams.append('dateRestrict', 'w2'); // Last 2 weeks
      
      // You can customize further with parameters like num (results per page) or start (pagination)
      googleApiUrl.searchParams.append('num', '10');
      
      console.log(`Making request to Google Custom Search API with query: ${searchQuery}`);
      
      const response = await fetch(googleApiUrl.toString());
      
      if (!response.ok) {
        console.error(`Google API error: ${response.status} ${response.statusText}`);
        let errorText = '';
        try {
          const errorJson = await response.json();
          errorText = JSON.stringify(errorJson);
          console.error('Error details:', errorText);
        } catch (e) {
          errorText = await response.text();
          console.error('Error text:', errorText);
        }
        
        throw new Error(`Google Search API error: ${response.status} ${errorText}`);
      }
      
      // Define the expected response structure
      interface GoogleSearchResponse {
        items?: Array<{
          title?: string;
          link?: string;
          snippet?: string;
          pagemap?: {
            cse_image?: Array<{ src?: string }>;
          };
        }>;
      }
      
      const data = await response.json() as GoogleSearchResponse;
      
      if (!data.items || data.items.length === 0) {
        console.log("No search results found from Google API");
        return res.json([]);
      }
      
      // Transform Google Search results to our format
      const transformedResults = data.items.map(item => {
        // Try to extract date information from the snippet
        const dateMatch = item.snippet?.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(,? \d{4})?/i);
        const formattedDate = dateMatch ? dateMatch[0] : "Upcoming";
        
        // Try to extract venue/location information
        const venueMatch = item.snippet?.match(/at ([^,.]+)/i);
        const venue = venueMatch ? venueMatch[1] : "Various Locations";
        
        return {
          title: item.title || "Event",
          link: item.link || "#",
          snippet: item.snippet || "",
          formattedDate,
          venue,
          // If the API returns images, you can include them
          image: item.pagemap?.cse_image?.[0]?.src
        };
      });
      
      res.json(transformedResults);
    } catch (error) {
      console.error('Google Search Error:', error);
      res.status(500).json({ 
        error: 'Failed to search for events',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // This is a static app for now, but these routes will be used in the future
  // when the app is expanded with dynamic functionality

  const httpServer = createServer(app);
  return httpServer;
}
