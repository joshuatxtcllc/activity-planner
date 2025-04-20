import { ActivityType } from "@/pages/Dashboard";
import { convertToActivityType } from "@/lib/activityService";

// Types for location information
export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
}

// Interface for actual event data coming from APIs
export interface ExternalEventApiResponse {
  events: Array<{
    id: string;
    title: string;
    description: string;
    start_time: string;
    end_time?: string;
    venue: {
      name: string;
      address: string;
      city: string;
      state?: string;
      country: string;
      latitude?: number;
      longitude?: number;
    };
    categories: string[];
    image_url?: string;
    url: string;
    price?: {
      min: number;
      max?: number;
      currency?: string;
    };
    organizer?: {
      name: string;
      description?: string;
    };
  }>;
  meta: {
    total: number;
    page: number;
    per_page: number;
  };
}

// Available event APIs to use
export const eventApiSources = [
  {
    id: 'ticketmaster',
    name: 'Ticketmaster',
    apiBaseUrl: 'https://app.ticketmaster.com/discovery/v2/events',
    logo: 'ticket',
  },
  {
    id: 'eventbrite',
    name: 'Eventbrite',
    apiBaseUrl: 'https://www.eventbriteapi.com/v3/events/search/',
    logo: 'calendar',
  },
  {
    id: 'meetup',
    name: 'Meetup',
    apiBaseUrl: 'https://api.meetup.com/find/events',
    logo: 'users',
  }
];

// Current location cache
let currentUserLocation: UserLocation | null = null;

// Get the user's location using the browser's Geolocation API
export const getUserLocation = async (): Promise<UserLocation> => {
  if (currentUserLocation) {
    return currentUserLocation;
  }
  
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Try to reverse geocode to get city name
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          
          if (response.ok) {
            const data = await response.json();
            
            currentUserLocation = {
              latitude,
              longitude,
              city: data.address?.city || data.address?.town || data.address?.village,
              state: data.address?.state,
              country: data.address?.country
            };
            
            resolve(currentUserLocation);
          } else {
            // If reverse geocoding fails, just return coordinates
            currentUserLocation = { latitude, longitude };
            resolve(currentUserLocation);
          }
        } catch (error) {
          // If there's any error with reverse geocoding, just return coordinates
          currentUserLocation = { latitude, longitude };
          resolve(currentUserLocation);
        }
      },
      (error) => {
        reject(new Error(`Unable to get location: ${error.message}`));
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 1000 * 60 * 10 // 10 minutes
      }
    );
  });
};

// Set a manual location
export const setUserLocation = (location: UserLocation) => {
  currentUserLocation = location;
};

// Get events from Ticketmaster API
export const getTicketmasterEvents = async (apiKey: string, location: UserLocation, radius: number = 25): Promise<ActivityType[]> => {
  try {
    // Use our server-side proxy to avoid CORS issues
    const url = `/api/proxy/ticketmaster?apiKey=${apiKey}&latitude=${location.latitude}&longitude=${location.longitude}&radius=${radius}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check if we have events
    if (!data._embedded || !data._embedded.events) {
      return [];
    }
    
    // Convert Ticketmaster events to our app format
    return data._embedded.events.map((event: any) => {
      // Extract date and format it
      const eventDate = new Date(event.dates.start.dateTime || event.dates.start.localDate);
      const formattedDate = eventDate.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      
      // Build venue/location string and extract venue information
      let locationStr = "TBA";
      let venueName = "";
      let venueCoordinates = null;
      
      if (event._embedded && event._embedded.venues && event._embedded.venues[0]) {
        const venue = event._embedded.venues[0];
        venueName = venue.name;
        locationStr = venue.name;
        
        if (venue.city && venue.city.name) {
          locationStr += `, ${venue.city.name}`;
        }
        
        // Extract venue coordinates if available
        if (venue.location && venue.location.latitude && venue.location.longitude) {
          venueCoordinates = {
            latitude: parseFloat(venue.location.latitude),
            longitude: parseFloat(venue.location.longitude)
          };
        }
      }
      
      // Extract tags from classifications
      const tags = [];
      if (event.classifications && event.classifications.length > 0) {
        const classification = event.classifications[0];
        
        if (classification.segment && classification.segment.name) {
          tags.push({ 
            name: classification.segment.name, 
            color: "accent" as "accent" | "secondary" | "default" 
          });
        }
        
        if (classification.genre && classification.genre.name) {
          tags.push({ 
            name: classification.genre.name, 
            color: "secondary" as "accent" | "secondary" | "default" 
          });
        }
        
        if (classification.subGenre && classification.subGenre.name) {
          tags.push({ 
            name: classification.subGenre.name, 
            color: "default" as "accent" | "secondary" | "default" 
          });
        }
      }
      
      // If no tags were extracted, add a default tag
      if (tags.length === 0) {
        tags.push({ name: "Event", color: "default" });
      }
      
      // Determine the icon based on event type
      let icon: "music" | "cocktail" | "art" = "art";
      let iconBgClass = "bg-accent bg-opacity-30";
      
      if (event.classifications && event.classifications[0]) {
        const segment = event.classifications[0].segment?.name?.toLowerCase();
        
        if (segment === "music") {
          icon = "music";
          iconBgClass = "bg-primary bg-opacity-30";
        } else if (segment === "food" || segment === "drinks" || segment === "food & drink") {
          icon = "cocktail";
          iconBgClass = "bg-secondary bg-opacity-30";
        }
      }
      
      return {
        id: parseInt(event.id) || Math.floor(Math.random() * 10000),
        title: event.name,
        isPrivate: false,
        isFeatured: event.featured || false,
        date: formattedDate,
        location: locationStr,
        tags: tags.slice(0, 3), // Limit to 3 tags
        attendees: Math.floor(Math.random() * 10), // We don't have real attendee data
        icon,
        iconBgClass,
        eventUrl: event.url || null,
        venueName: venueName || null,
        coordinates: venueCoordinates || null
      };
    });
  } catch (error) {
    console.error("Error fetching Ticketmaster events:", error);
    return [];
  }
};

// Get events from Eventbrite API
export const getEventbriteEvents = async (apiKey: string, location: UserLocation, radius: number = 25): Promise<ActivityType[]> => {
  try {
    // Use our server-side proxy to avoid CORS issues
    const url = `/api/proxy/eventbrite?apiKey=${apiKey}&latitude=${location.latitude}&longitude=${location.longitude}&radius=${radius}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Eventbrite API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.events || !data.events.length) {
      return [];
    }
    
    return data.events.map((event: any) => {
      // Parse and format the date
      const startDate = new Date(event.start.local || event.start.utc);
      const formattedDate = startDate.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      
      // Format the location
      let locationStr = "TBA";
      if (event.venue && event.venue.name) {
        locationStr = event.venue.name;
        
        if (event.venue.address && event.venue.address.city) {
          locationStr += `, ${event.venue.address.city}`;
        }
      }
      
      // Create tags from category and format
      const tags = [];
      
      if (event.category && event.category.name) {
        tags.push({ 
          name: event.category.name, 
          color: "accent" as "accent" | "secondary" | "default" 
        });
      }
      
      if (event.format && event.format.name) {
        tags.push({ 
          name: event.format.name, 
          color: "secondary" as "accent" | "secondary" | "default" 
        });
      }
      
      // Add ticket availability info
      if (event.ticket_availability) {
        const availability = event.ticket_availability;
        
        if (availability.is_free) {
          tags.push({ name: "Free", color: "default" });
        } else if (availability.minimum_ticket_price) {
          tags.push({ 
            name: `From ${availability.minimum_ticket_price.currency} ${availability.minimum_ticket_price.value}`, 
            color: "default" 
          });
        }
      }
      
      // If no tags were extracted, add a default tag
      if (tags.length === 0) {
        tags.push({ name: "Event", color: "default" });
      }
      
      // Determine icon based on category
      let icon: "music" | "cocktail" | "art" = "art";
      let iconBgClass = "bg-accent bg-opacity-30";
      
      if (event.category) {
        const category = event.category.name.toLowerCase();
        
        if (category.includes("music") || category.includes("concert")) {
          icon = "music";
          iconBgClass = "bg-primary bg-opacity-30";
        } else if (category.includes("food") || category.includes("drink") || 
                   category.includes("tasting")) {
          icon = "cocktail";
          iconBgClass = "bg-secondary bg-opacity-30";
        }
      }
      
      return {
        id: parseInt(event.id.split('-')[0]) || Math.floor(Math.random() * 10000),
        title: event.name.text,
        isPrivate: false,
        isFeatured: false,
        date: formattedDate,
        location: locationStr,
        tags: tags.slice(0, 3),
        attendees: Math.floor(Math.random() * 10), // We don't have attendee data
        icon,
        iconBgClass,
      };
    });
  } catch (error) {
    console.error("Error fetching Eventbrite events:", error);
    return [];
  }
};

// Fallback to Open Tripadvisor API for general events and activities
export const getTripAdvisorActivities = async (apiKey: string, location: UserLocation): Promise<ActivityType[]> => {
  try {
    // TripAdvisor API requires a partner key
    const locationId = await getTripAdvisorLocationId(apiKey, location);
    
    if (!locationId) {
      throw new Error("Could not find location ID for coordinates");
    }
    
    // Use our server-side proxy to avoid CORS issues
    const url = `/api/proxy/tripadvisor/attractions?apiKey=${apiKey}&locationId=${locationId}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TripAdvisor API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.data || !data.data.length) {
      return [];
    }
    
    return data.data.slice(0, 10).map((attraction: any) => {
      // Generate a random upcoming date within the next 2 weeks
      const daysToAdd = Math.floor(Math.random() * 14) + 1;
      const hoursToAdd = Math.floor(Math.random() * 12) + 9; // 9am to 9pm
      
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + daysToAdd);
      eventDate.setHours(hoursToAdd, 0, 0, 0);
      
      const formattedDate = eventDate.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      
      // Create tags based on subcategory and category
      const tags = [];
      
      if (attraction.subcategory && attraction.subcategory.name) {
        tags.push({ 
          name: attraction.subcategory.name, 
          color: "accent" as "accent" | "secondary" | "default" 
        });
      }
      
      if (attraction.category && attraction.category.name) {
        tags.push({ 
          name: attraction.category.name, 
          color: "secondary" as "accent" | "secondary" | "default" 
        });
      }
      
      if (attraction.offer_group && attraction.offer_group.lowest_price) {
        tags.push({ 
          name: `From ${attraction.offer_group.lowest_price}`, 
          color: "default" as "accent" | "secondary" | "default" 
        });
      }
      
      // If no tags were extracted, add a default tag
      if (tags.length === 0) {
        tags.push({ name: "Attraction", color: "default" });
      }
      
      // Determine icon based on category
      let icon: "music" | "cocktail" | "art" = "art";
      let iconBgClass = "bg-accent bg-opacity-30";
      
      if (attraction.category) {
        const category = attraction.category.name.toLowerCase();
        
        if (category.includes("music") || category.includes("concert") || 
            category.includes("theater") || category.includes("show")) {
          icon = "music";
          iconBgClass = "bg-primary bg-opacity-30";
        } else if (category.includes("food") || category.includes("drink") || 
                   category.includes("restaurant") || category.includes("bar")) {
          icon = "cocktail";
          iconBgClass = "bg-secondary bg-opacity-30";
        }
      }
      
      return {
        id: parseInt(attraction.location_id) || Math.floor(Math.random() * 10000),
        title: attraction.name,
        isPrivate: false,
        isFeatured: Math.random() > 0.8, // Randomly feature some
        date: formattedDate,
        location: attraction.address_obj ? 
          `${attraction.address_obj.street1 || ''}, ${attraction.address_obj.city}` : 
          attraction.location_string || "Location TBA",
        tags: tags.slice(0, 3),
        attendees: Math.floor(Math.random() * 10),
        icon,
        iconBgClass,
      };
    });
  } catch (error) {
    console.error("Error fetching TripAdvisor activities:", error);
    return [];
  }
};

// Helper function to get TripAdvisor location ID for a pair of coordinates
async function getTripAdvisorLocationId(apiKey: string, location: UserLocation): Promise<string | null> {
  try {
    // Use our server-side proxy to avoid CORS issues
    const url = `/api/proxy/tripadvisor/location?apiKey=${apiKey}&latitude=${location.latitude}&longitude=${location.longitude}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TripAdvisor location search API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.data || !data.data.length) {
      return null;
    }
    
    // Return the location_id of the first result
    return data.data[0].location_id;
  } catch (error) {
    console.error("Error getting TripAdvisor location ID:", error);
    return null;
  }
}

// Fallback to mock data when API keys aren't available
export const getFallbackLocalEvents = async (location: UserLocation | null): Promise<ActivityType[]> => {
  // Sample local events with locations that seem real
  const mockEvents = [
    {
      id: '4001',
      title: 'Downtown Jazz Festival',
      description: 'Annual jazz festival featuring local and international artists',
      date: 'Sat, Apr 15 • 3:00 PM',
      location: 'City Center Park',
      externalUrl: 'https://example.com/events/jazz-festival',
      tags: ['Jazz', 'Music Festival', 'Outdoor'],
      icon: 'music',
    },
    {
      id: '4002',
      title: 'Modern Art Exhibition Opening',
      description: 'Opening night for the new modern art collection',
      date: 'Fri, Apr 21 • 7:00 PM',
      location: 'Contemporary Art Museum',
      externalUrl: 'https://example.com/events/art-exhibition',
      tags: ['Art', 'Exhibition', 'Opening Night'],
      icon: 'art',
    },
    {
      id: '4003',
      title: 'Craft Beer & Food Pairing',
      description: 'Taste local craft beers paired with gourmet bites',
      date: 'Thu, Apr 27 • 6:30 PM',
      location: 'Brewmaster\'s Pub',
      externalUrl: 'https://example.com/events/beer-pairing',
      tags: ['Beer', 'Food', 'Tasting'],
      icon: 'cocktail',
    },
    {
      id: '4004',
      title: 'Indie Film Festival',
      description: 'Showcase of independent films from around the world',
      date: 'Sun, Apr 30 • 1:00 PM',
      location: 'Paramount Theater',
      externalUrl: 'https://example.com/events/film-festival',
      tags: ['Film', 'Festival', 'Independent'],
      icon: 'art',
    },
    {
      id: '4005',
      title: 'Night Market & Street Food',
      description: 'Explore local vendors and try international street food',
      date: 'Sat, May 6 • 7:00 PM',
      location: 'Waterfront Plaza',
      externalUrl: 'https://example.com/events/night-market',
      tags: ['Food', 'Market', 'International'],
      icon: 'cocktail',
    },
  ];
  
  // Add some location context if we have the user's location
  let locationContext = '';
  if (location && location.city) {
    locationContext = ` in ${location.city}`;
    
    // Update some mock data to include the city name
    mockEvents[0].location += `, ${location.city}`;
    mockEvents[2].location += `, ${location.city}`;
    mockEvents[4].title = `${location.city} Night Market & Street Food`;
  }
  
  // Convert to our activity format
  return mockEvents.map(event => {
    // Determine the color scheme based on event type
    let icon: "music" | "cocktail" | "art" = "art";
    let iconBgClass = "bg-accent bg-opacity-30";
    
    if (event.icon === 'music') {
      icon = "music";
      iconBgClass = "bg-primary bg-opacity-30";
    } else if (event.icon === 'cocktail') {
      icon = "cocktail";
      iconBgClass = "bg-secondary bg-opacity-30";
    }
    
    // Convert tags to our app format
    const tags = event.tags.map(tag => {
      let color: "secondary" | "accent" | "default" = "default";
      
      if (tag.toLowerCase().includes('music') || tag.toLowerCase().includes('jazz')) {
        color = "secondary";
      } else if (tag.toLowerCase().includes('art') || tag.toLowerCase().includes('film')) {
        color = "accent";
      }
      
      return { name: tag, color };
    });
    
    return {
      id: parseInt(event.id, 10) || Math.floor(Math.random() * 10000),
      title: event.title,
      isPrivate: false,
      isFeatured: Math.random() > 0.7,
      date: event.date,
      location: event.location,
      tags: tags.slice(0, 3),
      attendees: Math.floor(Math.random() * 20) + 5,
      icon,
      iconBgClass,
    };
  });
};

// Aggregate events from all sources
export const getLocalEvents = async (apiKeys?: { 
  ticketmaster?: string;
  eventbrite?: string;
  tripadvisor?: string;
}): Promise<ActivityType[]> => {
  try {
    // Try to get user location
    let location: UserLocation;
    
    if (currentUserLocation) {
      // Use cached location if available
      console.log("Using saved location:", currentUserLocation);
      location = {
        ...currentUserLocation,
        // Ensure we have valid coordinates
        latitude: currentUserLocation.latitude || 40.7128,
        longitude: currentUserLocation.longitude || -74.0060
      };
    } else {
      try {
        // Try to get location from browser
        location = await getUserLocation();
      } catch (error) {
        console.warn("Could not get user location:", error);
        // Default to a location (New York City)
        location = {
          latitude: 40.7128,
          longitude: -74.0060,
          city: 'New York',
          state: 'NY',
          country: 'USA'
        };
      }
    }
    
    // Array to hold all events from different sources
    let allEvents: ActivityType[] = [];
    
    // Check if we have API keys
    const hasApiKeys = apiKeys && (
      (apiKeys.ticketmaster && apiKeys.ticketmaster.length > 5) || 
      (apiKeys.eventbrite && apiKeys.eventbrite.length > 5) || 
      (apiKeys.tripadvisor && apiKeys.tripadvisor.length > 5)
    );
    
    if (!hasApiKeys) {
      // If no API keys, use fallback data
      console.log("No valid API keys found, using fallback data");
      return getFallbackLocalEvents(location);
    }
    
    // Try to fetch from Ticketmaster if API key is available
    if (apiKeys?.ticketmaster && apiKeys.ticketmaster.length > 5) {
      try {
        console.log("Fetching from Ticketmaster API");
        const ticketmasterEvents = await getTicketmasterEvents(apiKeys.ticketmaster, location);
        allEvents = [...allEvents, ...ticketmasterEvents];
        console.log(`Retrieved ${ticketmasterEvents.length} events from Ticketmaster`);
      } catch (error) {
        console.error("Error fetching from Ticketmaster:", error);
      }
    }
    
    // Try to fetch from Eventbrite if API key is available
    if (apiKeys?.eventbrite && apiKeys.eventbrite.length > 5) {
      try {
        console.log("Fetching from Eventbrite API");
        const eventbriteEvents = await getEventbriteEvents(apiKeys.eventbrite, location);
        allEvents = [...allEvents, ...eventbriteEvents];
        console.log(`Retrieved ${eventbriteEvents.length} events from Eventbrite`);
      } catch (error) {
        console.error("Error fetching from Eventbrite:", error);
      }
    }
    
    // Try to fetch from TripAdvisor if API key is available
    if (apiKeys?.tripadvisor && apiKeys.tripadvisor.length > 5) {
      try {
        console.log("Fetching from TripAdvisor API");
        const tripAdvisorEvents = await getTripAdvisorActivities(apiKeys.tripadvisor, location);
        allEvents = [...allEvents, ...tripAdvisorEvents];
        console.log(`Retrieved ${tripAdvisorEvents.length} events from TripAdvisor`);
      } catch (error) {
        console.error("Error fetching from TripAdvisor:", error);
      }
    }
    
    // If we couldn't get anything from APIs, use fallback data
    if (allEvents.length === 0) {
      console.log("No events retrieved from APIs, using fallback data");
      return getFallbackLocalEvents(location);
    }
    
    // Sort events by date
    allEvents.sort((a, b) => {
      const dateA = new Date(a.date.replace('•', ''));
      const dateB = new Date(b.date.replace('•', ''));
      return dateA.getTime() - dateB.getTime();
    });
    
    console.log(`Total events retrieved: ${allEvents.length}`);
    return allEvents;
  } catch (error) {
    console.error("Error aggregating local events:", error);
    return [];
  }
};