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

// Sample data for different categories - in a real implementation this would come from API calls
const musicEvents: ActivityType[] = [
  {
    id: 5001,
    title: "Classical Symphony Orchestra",
    isPrivate: false,
    isFeatured: true,
    date: "Fri, Apr 24 • 8:00 PM",
    location: "Symphony Hall, Boston",
    tags: [
      { name: "Classical", color: "secondary" },
      { name: "Orchestra", color: "accent" },
      { name: "Live Music", color: "default" },
    ],
    attendees: 12,
    icon: "music",
    iconBgClass: "bg-primary bg-opacity-30",
  },
  {
    id: 5002,
    title: "Jazz in the Park",
    isPrivate: false,
    isFeatured: false,
    date: "Sat, Apr 25 • 7:30 PM",
    location: "Central Park, New York",
    tags: [
      { name: "Jazz", color: "secondary" },
      { name: "Outdoor", color: "accent" },
      { name: "Free", color: "default" },
    ],
    attendees: 8,
    icon: "music",
    iconBgClass: "bg-primary bg-opacity-30",
  },
  {
    id: 5003,
    title: "Electronic Music Festival",
    isPrivate: false,
    isFeatured: true,
    date: "Sun, May 2 • 2:00 PM",
    location: "Waterfront Arena, Miami",
    tags: [
      { name: "EDM", color: "secondary" },
      { name: "Festival", color: "accent" },
      { name: "DJ Sets", color: "default" },
    ],
    attendees: 25,
    icon: "music",
    iconBgClass: "bg-primary bg-opacity-30",
  }
];

const artEvents: ActivityType[] = [
  {
    id: 5004,
    title: "Modern Art Exhibition",
    isPrivate: false,
    isFeatured: true,
    date: "Sat, Apr 25 • 10:00 AM",
    location: "Contemporary Arts Museum, Chicago",
    tags: [
      { name: "Modern Art", color: "secondary" },
      { name: "Exhibition", color: "accent" },
      { name: "Weekend", color: "default" },
    ],
    attendees: 10,
    icon: "art",
    iconBgClass: "bg-accent bg-opacity-30",
  },
  {
    id: 5005,
    title: "Sculpture Garden Tour",
    isPrivate: false,
    isFeatured: false,
    date: "Sun, Apr 26 • 11:00 AM",
    location: "National Sculpture Garden, Washington DC",
    tags: [
      { name: "Sculpture", color: "secondary" },
      { name: "Tour", color: "accent" },
      { name: "Outdoor", color: "default" },
    ],
    attendees: 6,
    icon: "art",
    iconBgClass: "bg-accent bg-opacity-30",
  }
];

const foodEvents: ActivityType[] = [
  {
    id: 5006,
    title: "Wine & Cheese Tasting",
    isPrivate: false,
    isFeatured: true,
    date: "Fri, Apr 24 • 6:30 PM",
    location: "The Wine Cellar, San Francisco",
    tags: [
      { name: "Wine", color: "secondary" },
      { name: "Tasting", color: "accent" },
      { name: "Gourmet", color: "default" },
    ],
    attendees: 15,
    icon: "cocktail",
    iconBgClass: "bg-secondary bg-opacity-30",
  },
  {
    id: 5007,
    title: "Street Food Festival",
    isPrivate: false,
    isFeatured: false,
    date: "Sat, Apr 25 • 12:00 PM",
    location: "Riverfront Park, Portland",
    tags: [
      { name: "Food Trucks", color: "secondary" },
      { name: "Festival", color: "accent" },
      { name: "International", color: "default" },
    ],
    attendees: 30,
    icon: "cocktail",
    iconBgClass: "bg-secondary bg-opacity-30",
  },
  {
    id: 5008,
    title: "Craft Beer Workshop",
    isPrivate: false,
    isFeatured: true,
    date: "Sun, Apr 26 • 3:00 PM",
    location: "Brewery District, Denver",
    tags: [
      { name: "Beer", color: "secondary" },
      { name: "Workshop", color: "accent" },
      { name: "Craft", color: "default" },
    ],
    attendees: 12,
    icon: "cocktail",
    iconBgClass: "bg-secondary bg-opacity-30",
  }
];

const nightlifeEvents: ActivityType[] = [
  {
    id: 5009,
    title: "Rooftop Cocktail Party",
    isPrivate: false,
    isFeatured: true,
    date: "Fri, Apr 24 • 9:00 PM",
    location: "Sky Lounge, Los Angeles",
    tags: [
      { name: "Cocktails", color: "secondary" },
      { name: "Rooftop", color: "accent" },
      { name: "DJ", color: "default" },
    ],
    attendees: 20,
    icon: "cocktail",
    iconBgClass: "bg-secondary bg-opacity-30",
  },
  {
    id: 5010,
    title: "Underground Jazz Club",
    isPrivate: false,
    isFeatured: false,
    date: "Sat, Apr 25 • 10:00 PM",
    location: "Blue Note, New York",
    tags: [
      { name: "Jazz", color: "secondary" },
      { name: "Live Music", color: "accent" },
      { name: "Intimate", color: "default" },
    ],
    attendees: 15,
    icon: "music",
    iconBgClass: "bg-primary bg-opacity-30",
  }
];

const theaterEvents: ActivityType[] = [
  {
    id: 5011,
    title: "Broadway Musical",
    isPrivate: false,
    isFeatured: true,
    date: "Sat, Apr 25 • 7:00 PM",
    location: "Theater District, New York",
    tags: [
      { name: "Musical", color: "secondary" },
      { name: "Broadway", color: "accent" },
      { name: "Theater", color: "default" },
    ],
    attendees: 18,
    icon: "art",
    iconBgClass: "bg-accent bg-opacity-30",
  },
  {
    id: 5012,
    title: "Shakespeare in the Park",
    isPrivate: false,
    isFeatured: false,
    date: "Sun, Apr 26 • 6:00 PM",
    location: "Central Park, New York",
    tags: [
      { name: "Shakespeare", color: "secondary" },
      { name: "Outdoor", color: "accent" },
      { name: "Classic", color: "default" },
    ],
    attendees: 22,
    icon: "art",
    iconBgClass: "bg-accent bg-opacity-30",
  }
];

const workshopEvents: ActivityType[] = [
  {
    id: 5013,
    title: "Painting Workshop",
    isPrivate: false,
    isFeatured: false,
    date: "Sat, Apr 25 • 2:00 PM",
    location: "Art Studio, Seattle",
    tags: [
      { name: "Painting", color: "secondary" },
      { name: "Workshop", color: "accent" },
      { name: "Beginner", color: "default" },
    ],
    attendees: 8,
    icon: "art",
    iconBgClass: "bg-accent bg-opacity-30",
  },
  {
    id: 5014,
    title: "Cocktail Mixing Class",
    isPrivate: false,
    isFeatured: true,
    date: "Sun, Apr 26 • 4:00 PM",
    location: "Mixology Bar, Chicago",
    tags: [
      { name: "Cocktails", color: "secondary" },
      { name: "Class", color: "accent" },
      { name: "Hands-on", color: "default" },
    ],
    attendees: 10,
    icon: "cocktail",
    iconBgClass: "bg-secondary bg-opacity-30",
  }
];

// Function to simulate fetching events from online sources
export const searchOnlineEvents = async (params: EventSearchParams): Promise<SearchResult> => {
  // In a real implementation, this would make API calls to event websites
  console.log("Searching for events with params:", params);
  
  // Simulated search delay
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  // Filter events based on category
  let filteredEvents: ActivityType[] = [];
  
  switch (params.category) {
    case "music":
      filteredEvents = [...musicEvents];
      break;
    case "art":
      filteredEvents = [...artEvents];
      break;
    case "food":
      filteredEvents = [...foodEvents];
      break;
    case "nightlife":
      filteredEvents = [...nightlifeEvents];
      break;
    case "theater":
      filteredEvents = [...theaterEvents];
      break;
    case "workshops":
      filteredEvents = [...workshopEvents];
      break;
    default:
      // "all" or empty category returns all events
      filteredEvents = [
        ...musicEvents,
        ...artEvents,
        ...foodEvents,
        ...nightlifeEvents,
        ...theaterEvents,
        ...workshopEvents
      ];
  }
  
  // Filter by location if provided
  if (params.location && params.location.trim() !== '') {
    const locationLower = params.location.toLowerCase();
    filteredEvents = filteredEvents.filter(event => 
      event.location.toLowerCase().includes(locationLower)
    );
  }
  
  // Filter by search query if provided
  if (params.query && params.query.trim() !== '') {
    const queryLower = params.query.toLowerCase();
    filteredEvents = filteredEvents.filter(event => 
      event.title.toLowerCase().includes(queryLower) || 
      event.location.toLowerCase().includes(queryLower) ||
      event.tags.some(tag => tag.name.toLowerCase().includes(queryLower))
    );
  }
  
  // Return paginated results
  const page = params.page || 1;
  const pageSize = 5;
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
};