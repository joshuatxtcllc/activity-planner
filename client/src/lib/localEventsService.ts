// Local events service for fetching events from various sources
import { getApiKey } from './apiConfig';

export interface UserLocation {
  latitude: number;
  longitude: number;
  city: string;
  state?: string;
  country?: string;
}

// We use LocationData internally for consistency
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

// Store user location in memory (could be enhanced with localStorage)
let currentUserLocation: UserLocation | null = null;

// Get the user's location either from browser or from stored value
export const getUserLocation = async (): Promise<UserLocation> => {
  if (currentUserLocation) {
    return currentUserLocation;
  }
  
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Create location with city lookup
            const location: UserLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              city: "Unknown Location", // Default value
            };
            
            // Try to get city name from coordinates using a reverse geocode lookup
            try {
              // Here we could implement a reverse geocoding service
              // For now, we'll just use a placeholder
              location.city = "Houston";
              location.state = "Texas";
              location.country = "United States";
            } catch (error) {
              console.error("Error getting city name:", error);
            }
            
            // Save and return the location
            currentUserLocation = location;
            resolve(location);
          } catch (error) {
            reject(error);
          }
        },
        (error) => {
          reject(error);
        }
      );
    } else {
      reject(new Error("Geolocation is not supported by this browser."));
    }
  });
};

// Set a custom user location
export const setUserLocation = (location: UserLocation): void => {
  currentUserLocation = location;
};

// Main function to get local events from various sources
export const getLocalEvents = async (apiKeys: {
  ticketmaster: string;
  eventbrite: string;
  tripadvisor: string;
}): Promise<any[]> => {
  try {
    const location = await getUserLocation();
    if (!location) {
      throw new Error("Location is required to fetch local events");
    }
    
    let allEvents: any[] = [];
    
    // If we have a Ticketmaster API key, fetch events from there
    if (apiKeys.ticketmaster) {
      const ticketmasterEvents = await fetchTicketmasterEvents(location as LocationData);
      
      // Transform Ticketmaster events to our standard format
      const formattedEvents = ticketmasterEvents.map((event: any, index: number) => ({
        id: event.id || `tm-${index}`,
        title: event.name || "Unnamed Event",
        isPrivate: false,
        isFeatured: index < 3, // Mark first three as featured
        date: event.dates?.start?.localDate 
          ? new Date(event.dates.start.localDate).toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric'
            })
          : "Date TBD",
        location: event._embedded?.venues?.[0]?.name || "Location TBD",
        tags: [
          { name: event.classifications?.[0]?.segment?.name || "Event", color: "secondary" },
          { name: event.classifications?.[0]?.genre?.name || "Entertainment", color: "accent" },
          { name: event._embedded?.venues?.[0]?.city?.name || location.city, color: "default" },
        ],
        attendees: Math.floor(Math.random() * 30) + 5,
        icon: event.classifications?.[0]?.segment?.name === "Music" ? "music" : 
              event.classifications?.[0]?.segment?.name === "Food" ? "cocktail" : "art",
        iconBgClass: "bg-primary bg-opacity-30",
        externalUrl: event.url,
        imageUrl: event.images?.[0]?.url,
        description: event.info || event.description || "Join us for this exciting event!",
        price: event.priceRanges ? 
          `$${event.priceRanges[0].min} - $${event.priceRanges[0].max}` : 
          "Price TBD"
      }));
      
      allEvents = [...allEvents, ...formattedEvents];
    }
    
    // Return the combined events
    return allEvents;
  } catch (error) {
    console.error("Error in getLocalEvents:", error);
    return [];
  }
};