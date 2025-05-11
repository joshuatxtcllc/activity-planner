// Google Events Search API Integration
interface GoogleEventResult {
  title: string;
  link: string;
  snippet: string;
  formattedDate?: string;
  venue?: string;
  location?: string;
  eventType?: string;
  usingFallbackData?: boolean;
}

/**
 * Searches for events using Google Custom Search
 */
export async function searchGoogleEvents(
  query: string,
  location?: string,
  eventType?: string,
  date?: string
): Promise<GoogleEventResult[]> {
  try {
    // Build the search query
    const searchParams = new URLSearchParams();

    // Base query is the user's input or event type + location
    let searchQuery = query;

    // Add date to query if provided
    if (date) {
      searchQuery += ` ${date}`;
    }

    searchParams.append('query', searchQuery);

    // Add location if provided
    if (location) {
      searchParams.append('location', location);
    }

    // Add event type if provided
    if (eventType) {
      searchParams.append('eventType', eventType);
    }

    // Add date if provided
    if (date) {
      searchParams.append('date', date);
    }

    // Log the search parameters
    console.log("Searching Google for events:", {
      query: searchQuery,
      location,
      eventType,
      date,
    });

    // Make the API request
    const response = await fetch(`/api/proxy/google-search?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Error fetching Google events: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Found", data.length, "Google search results");

    return data;
  } catch (error) {
    console.error("Error searching Google events:", error);
    return [];
  }
}