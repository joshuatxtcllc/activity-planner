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
        size: "20",
        sort: "date,asc"
      });
      
      const response = await fetch(`${baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        return res.status(response.status).json({ 
          error: `Ticketmaster API error: ${response.statusText}` 
        });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Ticketmaster proxy error:", error);
      res.status(500).json({ error: "Failed to fetch from Ticketmaster API" });
    }
  });

  // Proxy endpoint for Eventbrite API
  app.get("/api/proxy/eventbrite", async (req, res) => {
    try {
      const { apiKey, latitude, longitude, radius = 25 } = req.query;
      
      if (!apiKey || !latitude || !longitude) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      // Updated URL with correct parameters and headers
      const url = `https://www.eventbriteapi.com/v3/events/search/?location.latitude=${latitude}&location.longitude=${longitude}&location.within=${radius}km&expand=venue,category,ticket_availability`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
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
      
      // Updated URL with correct format for TripAdvisor API
      const url = `https://api.content.tripadvisor.com/api/v1/location/search?key=${apiKey}&latLng=${latitude},${longitude}&category=attractions&radius=25&language=en&radiusUnit=km`;
      
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
      
      const url = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/attractions?key=${apiKey}&language=en`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        return res.status(response.status).json({ 
          error: `TripAdvisor API error: ${response.statusText}` 
        });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("TripAdvisor attractions proxy error:", error);
      res.status(500).json({ error: "Failed to fetch from TripAdvisor API" });
    }
  });

  // This is a static app for now, but these routes will be used in the future
  // when the app is expanded with dynamic functionality

  const httpServer = createServer(app);
  return httpServer;
}
