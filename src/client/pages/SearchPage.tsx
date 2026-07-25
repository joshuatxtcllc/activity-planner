import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import EventCard from "../components/EventCard";
import ExternalLinkWarning from "../components/ExternalLinkWarning";
import type { Event } from "../../shared/schema";
import { groupDuplicateEvents } from "../utils/eventGrouping";

interface Activity {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  neighborhood: string;
  priceLevel: number;
  energyLevel: string;
  url?: string;
}

interface SearchResults {
  query: string;
  events: Event[];
  activities: Activity[];
}

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const searchMutation = useMutation({
    mutationFn: async (q: string) => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!response.ok) throw new Error("Search failed");
      return response.json() as Promise<SearchResults>;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    searchMutation.mutate(query.trim());
  };

  const likeMutation = useMutation({
    mutationFn: async ({ eventId, liked }: { eventId: string; liked: boolean | null }) => {
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, liked }),
      });
      if (!response.ok) throw new Error("Failed to save preference");
      return response.json();
    },
  });

  const handleLike = (eventId: string, liked: boolean | null) => {
    likeMutation.mutate({ eventId, liked });
  };

  const getPriceSymbol = (level: number) => "$".repeat(level);

  const results = searchMutation.data;
  const hasSearched = searchMutation.isSuccess;
  const dedupedEvents = groupDuplicateEvents(results?.events ?? []);
  const totalResults = dedupedEvents.length + (results?.activities.length ?? 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Search Houston Events &amp; Activities
        </h2>
        <p className="text-gray-600">
          Search real upcoming events and curated Houston activities
        </p>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-sm p-6 flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, category, or neighborhood..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!query.trim() || searchMutation.isPending}
          className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {searchMutation.isPending ? "Searching..." : "Search"}
        </button>
      </form>

      {searchMutation.isError && (
        <div className="mt-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          Search failed. Please try again.
        </div>
      )}

      {hasSearched && (
        <div className="mt-8 space-y-8">
          {totalResults === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No results for "{results?.query}". Try a different search term.
            </p>
          ) : (
            <>
              {dedupedEvents.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Upcoming Events ({dedupedEvents.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dedupedEvents.map((event) => (
                      <EventCard key={event.id} event={event} onLike={handleLike} />
                    ))}
                  </div>
                </div>
              )}

              {results && results.activities.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Houston Activities ({results.activities.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="border border-gray-200 rounded-xl p-4 bg-white hover:border-indigo-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-bold text-gray-900">{activity.name}</span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            {activity.neighborhood}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{activity.description}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {activity.type}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {getPriceSymbol(activity.priceLevel)}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {activity.energyLevel} energy
                          </span>
                        </div>
                        {activity.url && (
                          <ExternalLinkWarning
                            href={activity.url}
                            className="inline-block mt-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                          >
                            Learn more →
                          </ExternalLinkWarning>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!hasSearched && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-900 font-semibold mb-2">Search Tips</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Try searching for specific event types like "concerts", "festivals", or "food"</li>
            <li>• Search for neighborhoods like "Montrose" or "Heights"</li>
            <li>• Results are split into real upcoming events and curated Houston activities</li>
          </ul>
        </div>
      )}
    </div>
  );
}
