import { ActivityType } from "@/pages/Dashboard";
import { apiRequest } from "./queryClient";

interface GoogleSearchParams {
  query: string;
  location?: string;
  date?: string;
}

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  formattedDate?: string;
  venue?: string;
  image?: string;
  usingFallbackData?: boolean;
}

/**
 * Transforms raw Google search results into ActivityType objects
 */
function transformGoogleResultsToActivities(results: GoogleSearchResult[]): ActivityType[] {
  if (!results || results.length === 0) return [];
  
  return results.map((result, index) => {
    // Extract location from snippet if possible
    const locationMatch = result.snippet.match(/at\s+([^,.]+)/i);
    const dateMatch = result.snippet.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/i);
    
    // Generate a random icon
    const icons = ["music", "cocktail", "art"] as const;
    const icon = icons[Math.floor(Math.random() * icons.length)];
    
    // Generate icon background class based on icon
    const iconBgClass = icon === "music" 
      ? "bg-primary bg-opacity-30" 
      : icon === "cocktail" 
      ? "bg-secondary bg-opacity-30" 
      : "bg-accent bg-opacity-30";
    
    // Extract tags from title and snippet
    const extractTags = (text: string) => {
      const commonEventTypes = [
        "concert", "festival", "show", "exhibition", "party", 
        "fair", "market", "performance", "game", "match",
        "music", "art", "food", "drink", "sports", "comedy"
      ];
      
      const foundTags: string[] = [];
      
      commonEventTypes.forEach(type => {
        if (text.toLowerCase().includes(type) && !foundTags.includes(type)) {
          foundTags.push(type);
        }
      });
      
      return foundTags;
    };
    
    const allTags = [...extractTags(result.title), ...extractTags(result.snippet)];
    // Use Array.from to convert Set to Array for better compatibility
    const uniqueTags = Array.from(new Set(allTags)).slice(0, 3); // Limit to 3 tags
    
    const tagColors = ["secondary", "accent", "default"] as const;
    
    return {
      id: index + 1000, // Use 1000+ range to avoid conflicts with existing activities
      title: result.title,
      isPrivate: false,
      date: result.formattedDate || (dateMatch ? dateMatch[0] : "Upcoming Event"),
      location: result.venue || (locationMatch ? locationMatch[1] : "Various Locations"),
      tags: uniqueTags.map((tag, i) => ({
        name: tag.charAt(0).toUpperCase() + tag.slice(1), // Capitalize first letter
        color: tagColors[i % tagColors.length]
      })),
      attendees: Math.floor(Math.random() * 20) + 5, // Random number of attendees
      icon,
      iconBgClass,
      eventUrl: result.link
    };
  });
}

/**
 * Searches for events using Google Search (via our backend proxy)
 * @returns Object with activities and a flag indicating if real data is being used
 */
export async function searchGoogleEvents(params: GoogleSearchParams): Promise<{ activities: ActivityType[], isUsingRealData: boolean }> {
  try {
    console.log("Searching Google for events:", params);
    
    // Build query string - "events in [location] [date]" format
    let fullQuery = params.query || "events";
    
    if (params.location) {
      fullQuery += ` in ${params.location}`;
    }
    
    if (params.date) {
      fullQuery += ` ${params.date}`;
    }
    
    // Make API request to our backend proxy
    const response = await fetch(`/api/proxy/google-search?q=${encodeURIComponent(fullQuery)}`);
    
    if (!response.ok) {
      console.error("Error response from Google search API:", response.status);
      return { activities: [], isUsingRealData: false };
    }
    
    const results: GoogleSearchResult[] = await response.json();
    
    if (!results || results.length === 0) {
      console.log("No Google search results found");
      return { activities: [], isUsingRealData: false };
    }
    
    console.log(`Found ${results.length} Google search results`);
    
    // Check if we're using fallback data
    const isUsingRealData = !results[0]?.usingFallbackData;
    
    // Transform results to ActivityType objects
    return { 
      activities: transformGoogleResultsToActivities(results),
      isUsingRealData
    };
  } catch (error) {
    console.error("Error searching Google for events:", error);
    return { activities: [], isUsingRealData: false };
  }
}