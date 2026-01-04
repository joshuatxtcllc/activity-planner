import axios from "axios";
import logger from "../utils/logger";

export interface ItineraryPreferences {
  date: string; // ISO date string
  time?: string; // Preferred start time (e.g., "19:00" for 7 PM)
  duration?: number; // Desired duration in hours (default: 3-4 hours)
  budget?: "free" | "budget" | "moderate" | "upscale"; // Budget level
  interests?: string[]; // e.g., ["food", "music", "arts", "outdoors"]
  partySize?: number; // Number of people
  specialRequirements?: string; // e.g., "vegetarian", "kid-friendly", "romantic"
}

export interface ItineraryActivity {
  order: number;
  time: string; // Suggested time for this activity
  title: string;
  description: string;
  venue: string;
  address: string;
  category: string;
  estimatedCost: string;
  estimatedDuration: string; // e.g., "1-2 hours"
  tips?: string;
}

export interface GeneratedItinerary {
  id: string;
  title: string;
  description: string;
  totalEstimatedCost: string;
  totalDuration: string;
  activities: ItineraryActivity[];
  transportationTips?: string;
}

/**
 * Generate a personalized Houston itinerary using Perplexity AI
 */
export async function generateItinerary(
  preferences: ItineraryPreferences
): Promise<GeneratedItinerary> {
  const apiKey = process.env.PERPLEXITY_API_KEY?.trim().replace(/^['"]|['"]$/g, "");

  if (!apiKey) {
    throw new Error("Perplexity API key not configured");
  }

  try {
    logger.info("Generating Houston itinerary", { preferences });

    const prompt = buildItineraryPrompt(preferences);

    const response = await axios.post(
      "https://api.perplexity.ai/chat/completions",
      {
        model: "llama-3.1-sonar-large-128k-online", // Online model for real-time search
        messages: [
          {
            role: "system",
            content: `You are a Houston local expert and activity planner. You create personalized, geographically-smart itineraries that:
- Suggest activities in logical sequence (e.g., dinner before a show, not after)
- Keep venues close together (within 2-3 miles when possible)
- Consider timing and opening hours
- Match the user's budget and interests
- Provide specific, real Houston venues with addresses

Always respond with ONLY valid JSON, no markdown formatting or extra text.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7, // Higher creativity for varied suggestions
        max_tokens: 3000,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const content = response.data.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from Perplexity AI");
    }

    // Parse the JSON response
    let itinerary: GeneratedItinerary;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      itinerary = JSON.parse(cleanContent);

      // Generate a unique ID for this itinerary
      itinerary.id = `itinerary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    } catch (parseError) {
      logger.error("Failed to parse Perplexity AI response", {
        error: parseError,
        content: content.substring(0, 500)
      });
      throw new Error("Failed to parse AI response. Please try again.");
    }

    logger.info("Successfully generated itinerary", {
      itineraryId: itinerary.id,
      activityCount: itinerary.activities.length
    });

    return itinerary;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error("Perplexity API error", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(`AI service error: ${error.response?.data?.error?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * Build a detailed prompt for Perplexity AI
 */
function buildItineraryPrompt(preferences: ItineraryPreferences): string {
  const {
    date,
    time = "18:00",
    duration = 4,
    budget = "moderate",
    interests = [],
    partySize = 2,
    specialRequirements = ""
  } = preferences;

  const dateObj = new Date(date);
  const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  const budgetDescriptions = {
    free: "FREE or very low cost (under $20 total per person)",
    budget: "Budget-friendly ($20-50 per person)",
    moderate: "Moderate ($50-100 per person)",
    upscale: "Upscale ($100+ per person)"
  };

  const interestsStr = interests.length > 0
    ? interests.join(", ")
    : "varied activities";

  return `Create a personalized Houston itinerary for ${dayOfWeek}, ${formattedDate}.

**Requirements:**
- Party size: ${partySize} ${partySize === 1 ? "person" : "people"}
- Start time: ${time} (${convertTo12Hour(time)})
- Duration: Approximately ${duration} hours
- Budget: ${budgetDescriptions[budget]}
- Interests: ${interestsStr}
${specialRequirements ? `- Special requirements: ${specialRequirements}` : ""}

**Important Instructions:**
1. Create 3-5 activities in logical sequence (e.g., appetizers/drinks → dinner → entertainment/show)
2. All venues must be in Houston and currently open/operating
3. Keep venues close together (within 2-3 miles when possible) - suggest a central Houston area
4. Consider realistic timing and opening hours for ${dayOfWeek}
5. Provide SPECIFIC venue names and addresses (not generic suggestions)
6. Activities should flow naturally and make sense together
7. Include time estimates and costs for each activity

**Output Format (JSON only, no markdown):**
{
  "title": "A catchy title for this itinerary",
  "description": "A one-sentence overview of the evening",
  "totalEstimatedCost": "$XX-XX per person",
  "totalDuration": "X hours",
  "activities": [
    {
      "order": 1,
      "time": "${time}",
      "title": "Activity name",
      "description": "What you'll do here and why it's great",
      "venue": "Specific venue name",
      "address": "Full street address, Houston, TX",
      "category": "food|drinks|entertainment|arts|music|sports|outdoor|culture",
      "estimatedCost": "$XX-XX per person" or "Free",
      "estimatedDuration": "XX minutes" or "X-X hours",
      "tips": "Insider tips, reservations needed, parking info, etc."
    }
  ],
  "transportationTips": "How to get between venues (walking distance, drive, rideshare, etc.)"
}

Create a memorable Houston experience!`;
}

/**
 * Convert 24-hour time to 12-hour format
 */
function convertTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}
