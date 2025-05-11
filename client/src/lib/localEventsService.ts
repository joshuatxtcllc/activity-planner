// Local events service for fetching events from various sources
import { getApiKey } from './apiConfig';

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
}

export interface EventResponse {
  ticketmaster: any[];
  eventbrite: any[];
  tripadvisor: any[];
}

export const fetchLocalEvents = async (
  location: LocationData,
  category: string = 'all'
): Promise<any[]> => {
  try {
    console.log("Using saved location:", location);

    // Fetch from API
    const response = await fetch(`/api/local-events?lat=${location.latitude}&lng=${location.longitude}&category=${category}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to fetch local events:', response.status, errorData);
      throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error("Error fetching local events:", error);
    throw error;
  }
};

// Function to fetch events from Ticketmaster API
export const fetchTicketmasterEvents = async (location: LocationData, radius: number = 25): Promise<any[]> => {
  try {
    const apiKey = getApiKey('ticketmaster');
    if (!apiKey) {
      console.warn("No Ticketmaster API key found");
      return [];
    }

    console.log("Fetching from Ticketmaster API");

    const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&latlong=${location.latitude},${location.longitude}&radius=${radius}&size=50`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status}`);
    }

    const data = await response.json();
    const events = data?._embedded?.events || [];
    console.log(`Retrieved ${events.length} events from Ticketmaster`);
    return events;
  } catch (error) {
    console.error("Error fetching from Ticketmaster:", error);
    return [];
  }
};

// Function to fetch events from Eventbrite API
export const fetchEventbriteEvents = async (location: LocationData): Promise<any[]> => {
  try {
    const apiKey = getApiKey('eventbrite');
    if (!apiKey) {
      console.warn("No Eventbrite API key found");
      return [];
    }

    console.log("Fetching from Eventbrite API");

    // Note: This is a placeholder - actual Eventbrite API implementation would go here
    // The Eventbrite API requires OAuth and is more complex to implement directly in the browser
    console.log(`Retrieved 0 events from Eventbrite`);
    return [];
  } catch (error) {
    console.error("Error fetching from Eventbrite:", error);
    return [];
  }
};

// Function to fetch events from TripAdvisor API
export const fetchTripAdvisorEvents = async (location: LocationData): Promise<any[]> => {
  try {
    const apiKey = getApiKey('tripadvisor');
    if (!apiKey) {
      console.warn("No TripAdvisor API key found");
      return [];
    }

    console.log("Fetching from TripAdvisor API");

    // Note: This is a placeholder - actual TripAdvisor API implementation would go here
    console.log(`Retrieved 0 events from TripAdvisor`);
    return [];
  } catch (error) {
    console.error("Error fetching from TripAdvisor:", error);
    return [];
  }
};