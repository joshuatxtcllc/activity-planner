import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

interface ItineraryPreferences {
  date: string;
  time?: string;
  duration?: number;
  budget?: "free" | "budget" | "moderate" | "upscale";
  interests?: string[];
  partySize?: number;
  specialRequirements?: string;
}

interface ItineraryActivity {
  order: number;
  time: string;
  title: string;
  description: string;
  venue: string;
  address: string;
  category: string;
  estimatedCost: string;
  estimatedDuration: string;
  tips?: string;
}

interface GeneratedItinerary {
  id: string;
  title: string;
  description: string;
  totalEstimatedCost: string;
  totalDuration: string;
  activities: ItineraryActivity[];
  transportationTips?: string;
}

const INTEREST_OPTIONS = [
  { value: "food", label: "🍽️ Food & Dining", emoji: "🍽️" },
  { value: "music", label: "🎵 Live Music", emoji: "🎵" },
  { value: "arts", label: "🎨 Arts & Culture", emoji: "🎨" },
  { value: "outdoors", label: "🌳 Outdoors & Nature", emoji: "🌳" },
  { value: "sports", label: "⚽ Sports & Fitness", emoji: "⚽" },
  { value: "nightlife", label: "🍸 Nightlife & Bars", emoji: "🍸" },
  { value: "shopping", label: "🛍️ Shopping", emoji: "🛍️" },
  { value: "entertainment", label: "🎭 Entertainment", emoji: "🎭" },
];

export default function ItineraryPlannerPage() {
  const [preferences, setPreferences] = useState<ItineraryPreferences>({
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0], // Tomorrow
    time: "18:00",
    duration: 4,
    budget: "moderate",
    interests: [],
    partySize: 2,
    specialRequirements: "",
  });

  const [generatedItinerary, setGeneratedItinerary] = useState<GeneratedItinerary | null>(null);

  const generateMutation = useMutation({
    mutationFn: async (prefs: ItineraryPreferences) => {
      const response = await fetch("/api/itinerary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate itinerary");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedItinerary(data);
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate(preferences);
  };

  const handleRegenerate = () => {
    // Clear current itinerary and generate fresh one
    setGeneratedItinerary(null);
    generateMutation.mutate(preferences);
  };

  const toggleInterest = (interest: string) => {
    setPreferences((prev) => ({
      ...prev,
      interests: prev.interests?.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...(prev.interests || []), interest],
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🗓️ AI Itinerary Planner
          </h1>
          <p className="text-lg text-gray-600">
            Get personalized Houston activity suggestions powered by AI
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side: Preferences Form */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Tell us your preferences
            </h2>

            <div className="space-y-6">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 Date
                </label>
                <input
                  type="date"
                  value={preferences.date}
                  onChange={(e) =>
                    setPreferences({ ...preferences, date: e.target.value })
                  }
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🕐 Start Time
                </label>
                <input
                  type="time"
                  value={preferences.time}
                  onChange={(e) =>
                    setPreferences({ ...preferences, time: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ⏱️ Duration: {preferences.duration} hours
                </label>
                <input
                  type="range"
                  min="2"
                  max="8"
                  step="1"
                  value={preferences.duration}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      duration: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>2h</span>
                  <span>4h</span>
                  <span>6h</span>
                  <span>8h</span>
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💰 Budget
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "free", label: "Free", desc: "Under $20" },
                    { value: "budget", label: "Budget", desc: "$20-50" },
                    { value: "moderate", label: "Moderate", desc: "$50-100" },
                    { value: "upscale", label: "Upscale", desc: "$100+" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setPreferences({
                          ...preferences,
                          budget: option.value as any,
                        })
                      }
                      className={`p-3 rounded-lg border-2 transition-all ${
                        preferences.budget === option.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Party Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  👥 Party Size
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={preferences.partySize}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      partySize: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Interests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  ✨ Interests (select any)
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((interest) => (
                    <button
                      key={interest.value}
                      onClick={() => toggleInterest(interest.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        preferences.interests?.includes(interest.value)
                          ? "bg-blue-500 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {interest.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 Special Requirements (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., vegetarian, kid-friendly, romantic..."
                  value={preferences.specialRequirements}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      specialRequirements: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {generateMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating your perfect day...
                  </span>
                ) : (
                  "✨ Generate Itinerary"
                )}
              </button>

              {generateMutation.isError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <strong>Error:</strong>{" "}
                  {generateMutation.error instanceof Error
                    ? generateMutation.error.message
                    : "Failed to generate itinerary"}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Generated Itinerary */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            {!generatedItinerary && !generateMutation.isPending && (
              <div className="flex items-center justify-center h-full text-center">
                <div className="max-w-sm">
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Ready to plan your day?
                  </h3>
                  <p className="text-gray-500">
                    Fill out your preferences and click "Generate Itinerary" to get
                    AI-powered suggestions for your perfect Houston experience!
                  </p>
                </div>
              </div>
            )}

            {generateMutation.isPending && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium">
                    Our AI is crafting your perfect itinerary...
                  </p>
                </div>
              </div>
            )}

            {generatedItinerary && (
              <div className="space-y-6">
                {/* Itinerary Header */}
                <div className="border-b pb-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {generatedItinerary.title}
                  </h2>
                  <p className="text-gray-600 mb-3">
                    {generatedItinerary.description}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-700">
                      <span className="font-semibold">💰 Cost:</span>
                      {generatedItinerary.totalEstimatedCost}
                    </div>
                    <div className="flex items-center gap-1 text-gray-700">
                      <span className="font-semibold">⏱️ Duration:</span>
                      {generatedItinerary.totalDuration}
                    </div>
                  </div>
                </div>

                {/* Activities */}
                <div className="space-y-4">
                  {generatedItinerary.activities.map((activity) => (
                    <div
                      key={activity.order}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                          {activity.order}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-blue-600">
                              {activity.time}
                            </span>
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                              {activity.category}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {activity.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {activity.description}
                          </p>
                          <div className="space-y-1 text-sm text-gray-700">
                            <div className="flex items-start gap-1">
                              <span className="font-semibold">📍</span>
                              <div>
                                <div className="font-medium">{activity.venue}</div>
                                <div className="text-gray-500">{activity.address}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs">
                              <span>💵 {activity.estimatedCost}</span>
                              <span>⏱️ {activity.estimatedDuration}</span>
                            </div>
                            {activity.tips && (
                              <div className="mt-2 p-2 bg-yellow-50 rounded-lg text-xs">
                                <span className="font-semibold">💡 Tip:</span> {activity.tips}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Transportation Tips */}
                {generatedItinerary.transportationTips && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                      <span className="text-xl">🚗</span>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          Getting Around
                        </h4>
                        <p className="text-sm text-gray-700">
                          {generatedItinerary.transportationTips}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Regenerate Button */}
                <button
                  onClick={handleRegenerate}
                  disabled={generateMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                  🔄 Generate Different Ideas
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
