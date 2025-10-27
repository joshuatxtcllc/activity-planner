import { ActivityType } from "@/pages/Dashboard";

// Interface for search parameters
export interface EventSearchParams {
  query?: string;
  location?: string;
  category?: string;
  date?: string;
  page?: number;
}

// Interface for search results
export interface SearchResult {
  activities: ActivityType[];
  totalResults: number;
  currentPage: number;
  totalPages: number;
}

// Categories for event search
export const eventCategories = [
  { id: "all", name: "All Categories" },
  { id: "music", name: "Music & Concerts" },
  { id: "art", name: "Art & Culture" },
  { id: "food", name: "Food & Drink" },
  { id: "nightlife", name: "Nightlife" },
  { id: "theater", name: "Theater & Shows" },
  { id: "workshops", name: "Classes & Workshops" },
];

// Popular locations for quick search
export const popularLocations = [
  "New York", 
  "Los Angeles", 
  "Chicago", 
  "London", 
  "Paris", 
  "Tokyo", 
  "Berlin", 
  "Sydney"
];

// Helper function to get coordinates for a location name
async function getLocationCoordinates(locationName: string): Promise<{ lat: number; lng: number } | null> {
  // Map common city names to coordinates
  const cityCoordinates: Record<string, { lat: number; lng: number }> = {
    'new york': { lat: 40.7128, lng: -74.0060 },
    'los angeles': { lat: 34.0522, lng: -118.2437 },
    'chicago': { lat: 41.8781, lng: -87.6298 },
    'houston': { lat: 29.7604, lng: -95.3698 },
    'phoenix': { lat: 33.4484, lng: -112.0740 },
    'philadelphia': { lat: 39.9526, lng: -75.1652 },
    'san antonio': { lat: 29.4241, lng: -98.4936 },
    'san diego': { lat: 32.7157, lng: -117.1611 },
    'dallas': { lat: 32.7767, lng: -96.7970 },
    'san jose': { lat: 37.3382, lng: -121.8863 },
    'austin': { lat: 30.2672, lng: -97.7431 },
    'jacksonville': { lat: 30.3322, lng: -81.6557 },
    'san francisco': { lat: 37.7749, lng: -122.4194 },
    'columbus': { lat: 39.9612, lng: -82.9988 },
    'fort worth': { lat: 32.7555, lng: -97.3308 },
    'indianapolis': { lat: 39.7684, lng: -86.1581 },
    'charlotte': { lat: 35.2271, lng: -80.8431 },
    'seattle': { lat: 47.6062, lng: -122.3321 },
    'denver': { lat: 39.7392, lng: -104.9903 },
    'washington': { lat: 38.9072, lng: -77.0369 },
    'boston': { lat: 42.3601, lng: -71.0589 },
    'nashville': { lat: 36.1627, lng: -86.7816 },
    'detroit': { lat: 42.3314, lng: -83.0458 },
    'portland': { lat: 45.5152, lng: -122.6784 },
    'miami': { lat: 25.7617, lng: -80.1918 },
    'london': { lat: 51.5074, lng: -0.1278 },
    'paris': { lat: 48.8566, lng: 2.3522 },
    'tokyo': { lat: 35.6762, lng: 139.6503 },
    'berlin': { lat: 52.5200, lng: 13.4050 },
    'sydney': { lat: -33.8688, lng: 151.2093 }
  };

  const normalizedLocation = locationName.toLowerCase().trim();
  return cityCoordinates[normalizedLocation] || null;
}

// Function to search for events from real API sources
export const searchOnlineEvents = async (params: EventSearchParams): Promise<SearchResult> => {
  try {
    console.log("Searching for events with params:", params);

    // Get coordinates for location
    let lat = 29.7604; // Default: Houston
    let lng = -95.3698;

    if (params.location && params.location.trim() !== '') {
      const coords = await getLocationCoordinates(params.location);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    // Build API URL
    const category = params.category || 'all';
    const apiUrl = `/api/local-events?lat=${lat}&lng=${lng}&category=${category}`;

    // Fetch from API
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    let filteredEvents: ActivityType[] = data.events || [];

    // Transform to ensure proper format
    filteredEvents = filteredEvents.map((event: any) => ({
      id: typeof event.id === 'string' ?
        parseInt(event.id.replace(/[^\d]/g, ''), 10) || Math.floor(Math.random() * 100000) :
        event.id,
      title: event.title,
      isPrivate: event.isPrivate || false,
      isFeatured: event.isFeatured || false,
      date: event.date,
      location: event.location,
      tags: event.tags || [],
      attendees: event.attendees || 0,
      icon: event.icon || 'art',
      iconBgClass: event.iconBgClass || 'bg-primary bg-opacity-30',
      imageUrl: event.imageUrl,
      externalUrl: event.externalUrl,
      description: event.description,
      price: event.price
    }));

    // Filter by search query if provided
    if (params.query && params.query.trim() !== '') {
      const queryLower = params.query.toLowerCase();
      filteredEvents = filteredEvents.filter(event =>
        event.title.toLowerCase().includes(queryLower) ||
        event.location.toLowerCase().includes(queryLower) ||
        (event.tags && event.tags.some((tag: any) => tag.name.toLowerCase().includes(queryLower)))
      );
    }

    // Return paginated results
    const page = params.page || 1;
    const pageSize = 10;
    const totalResults = filteredEvents.length;
    const totalPages = Math.ceil(totalResults / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedEvents = filteredEvents.slice(startIndex, startIndex + pageSize);

    return {
      activities: paginatedEvents,
      totalResults,
      currentPage: page,
      totalPages
    };
  } catch (error) {
    console.error('Error searching online events:', error);
    // Return empty results instead of throwing
    return {
      activities: [],
      totalResults: 0,
      currentPage: 1,
      totalPages: 0
    };
  }
};