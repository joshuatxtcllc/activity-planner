import { ActivityType } from '@/pages/Dashboard';

// Interfaces for external event sources
export interface ExternalActivitySource {
  id: string;
  name: string;
  url: string;
  description: string;
  logo?: string;
}

export interface ExternalActivity {
  id: string;
  title: string;
  description?: string;
  date: string;
  location: string;
  imageUrl?: string;
  externalUrl: string;
  price?: string;
  source: ExternalActivitySource;
  tags: string[];
}

// The available aggregation sources
export const activitySources: ExternalActivitySource[] = [
  {
    id: 'localevents',
    name: 'Local Events',
    url: 'https://api.localevents.example',
    description: 'Popular events happening in your city',
    logo: 'event',
  },
  {
    id: 'artgalleries',
    name: 'Art Galleries',
    url: 'https://api.artgalleries.example',
    description: 'Art exhibitions and gallery openings',
    logo: 'palette',
  },
  {
    id: 'nightlife',
    name: 'Nightlife',
    url: 'https://api.nightlife.example',
    description: 'Clubs, bars, and entertainment venues',
    logo: 'music',
  },
  {
    id: 'dining',
    name: 'Fine Dining',
    url: 'https://api.dining.example',
    description: 'Upscale restaurants and dining experiences',
    logo: 'utensils',
  },
];

// Helper to convert external activities to our application format
export function convertToActivityType(externalActivity: ExternalActivity): ActivityType {
  // Map external tags to our application's tag format
  const tags = externalActivity.tags.map(tag => {
    let color: "secondary" | "accent" | "default" = "default";
    
    // Assign colors based on tag content
    if (tag.toLowerCase().includes('art') || 
        tag.toLowerCase().includes('exhibition') || 
        tag.toLowerCase().includes('gallery')) {
      color = "accent";
    } else if (tag.toLowerCase().includes('music') || 
               tag.toLowerCase().includes('concert') || 
               tag.toLowerCase().includes('performance')) {
      color = "secondary";
    }
    
    return { name: tag, color };
  });
  
  // Determine the icon based on the source or tags
  let icon: "music" | "cocktail" | "art" = "art";
  let iconBgClass = "bg-accent bg-opacity-30";
  
  if (externalActivity.source.id === 'nightlife' || 
      externalActivity.tags.some(tag => 
        tag.toLowerCase().includes('music') || 
        tag.toLowerCase().includes('concert') || 
        tag.toLowerCase().includes('dj'))) {
    icon = "music";
    iconBgClass = "bg-primary bg-opacity-30";
  } else if (externalActivity.source.id === 'dining' || 
             externalActivity.tags.some(tag => 
               tag.toLowerCase().includes('drink') || 
               tag.toLowerCase().includes('cocktail') || 
               tag.toLowerCase().includes('bar'))) {
    icon = "cocktail";
    iconBgClass = "bg-secondary bg-opacity-30";
  }
  
  // Return activity in our application format
  return {
    id: parseInt(externalActivity.id, 10) || Math.floor(Math.random() * 10000),
    title: externalActivity.title,
    isPrivate: false,
    isFeatured: Math.random() > 0.7, // Randomly mark some as featured
    date: externalActivity.date,
    location: externalActivity.location,
    tags: tags.slice(0, 3), // Limit to 3 tags
    attendees: Math.floor(Math.random() * 10), // Placeholder attendee count
    icon,
    iconBgClass,
  };
}

// Fetch aggregated activities from multiple event sources
export async function fetchAggregatedActivities(
  latitude?: number,
  longitude?: number,
  category?: string
): Promise<ActivityType[]> {
  try {
    // Use default location (Houston, TX) if not provided
    const lat = latitude || 29.7604;
    const lng = longitude || -95.3698;
    const cat = category || 'all';

    // Call the backend API endpoint
    const response = await fetch(`/api/local-events?lat=${lat}&lng=${lng}&category=${cat}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }

    const data = await response.json();
    const events = data.events || [];

    // Transform events to match ActivityType format
    return events.map((event: any) => ({
      id: typeof event.id === 'string' ? parseInt(event.id.replace(/[^\d]/g, ''), 10) || Math.floor(Math.random() * 100000) : event.id,
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
      price: event.price,
      source: event.source
    }));
  } catch (error) {
    console.error('Error fetching aggregated activities:', error);
    // Return empty array instead of throwing to prevent UI breaking
    return [];
  }
}

// Function to save an external activity to user's collection
export function saveExternalActivity(activity: ActivityType): void {
  // In a real app, this would call the backend API to save the activity
  console.log('Saving external activity:', activity);
  // Could dispatch to Redux store or use React Query mutations
}