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

// Simulated API fetch for aggregated activities
export async function fetchAggregatedActivities(sourceId?: string): Promise<ActivityType[]> {
  // In a real implementation, this would fetch from actual APIs
  // For now, we'll simulate a response with sample data
  
  // Simulated server response delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Sample external activities (in a real app, this would come from API)
  const sampleActivities: ExternalActivity[] = [
    {
      id: '1001',
      title: 'Jazz Night at Blue Note',
      description: 'Live jazz performances featuring local artists',
      date: 'Fri, Apr 10 • 9:00 PM',
      location: 'Blue Note Jazz Club',
      externalUrl: 'https://example.com/events/jazz-night',
      source: activitySources.find(s => s.id === 'nightlife')!,
      tags: ['Jazz', 'Live Music', 'Nightlife'],
    },
    {
      id: '1002',
      title: 'Contemporary Art Exhibition',
      description: 'Featuring works from emerging artists',
      date: 'Sat, Apr 11 • 11:00 AM',
      location: 'Modern Art Gallery',
      externalUrl: 'https://example.com/events/art-exhibition',
      source: activitySources.find(s => s.id === 'artgalleries')!,
      tags: ['Art', 'Exhibition', 'Cultural'],
    },
    {
      id: '1003',
      title: 'Mixology Workshop',
      description: 'Learn to craft signature cocktails with a master mixologist',
      date: 'Sun, Apr 12 • 6:30 PM',
      location: 'Craft Cocktail Bar',
      externalUrl: 'https://example.com/events/mixology',
      price: '$75',
      source: activitySources.find(s => s.id === 'dining')!,
      tags: ['Cocktails', 'Workshop', 'Hands-on'],
    },
    {
      id: '1004',
      title: 'Rooftop Sunset Dining',
      description: 'Five-course tasting menu with wine pairings',
      date: 'Thu, Apr 16 • 7:00 PM',
      location: 'Sky Lounge Restaurant',
      externalUrl: 'https://example.com/events/rooftop-dining',
      price: '$120',
      source: activitySources.find(s => s.id === 'dining')!,
      tags: ['Fine Dining', 'Tasting Menu', 'Views'],
    },
    {
      id: '1005',
      title: 'Underground Electronic Music Party',
      description: 'International DJs in a converted warehouse space',
      date: 'Sat, Apr 18 • 10:00 PM',
      location: 'The Warehouse',
      externalUrl: 'https://example.com/events/electronic',
      source: activitySources.find(s => s.id === 'nightlife')!,
      tags: ['Electronic', 'DJ', 'Dancing'],
    },
    {
      id: '1006',
      title: 'Avant-Garde Theater Performance',
      description: 'Experimental theater pushing boundaries',
      date: 'Sun, Apr 19 • 8:00 PM',
      location: 'Black Box Theater',
      externalUrl: 'https://example.com/events/theater',
      source: activitySources.find(s => s.id === 'localevents')!,
      tags: ['Theater', 'Performance Art', 'Avant-Garde'],
    },
  ];
  
  // Filter by source if provided
  const filteredActivities = sourceId 
    ? sampleActivities.filter(activity => activity.source.id === sourceId)
    : sampleActivities;
  
  // Convert external activities to our application format
  return filteredActivities.map(convertToActivityType);
}

// Function to save an external activity to user's collection
export function saveExternalActivity(activity: ActivityType): void {
  // In a real app, this would call the backend API to save the activity
  console.log('Saving external activity:', activity);
  // Could dispatch to Redux store or use React Query mutations
}