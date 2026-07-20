import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import EventCard from "../components/EventCard";
import type { Event } from "../../shared/schema";

async function fetchWeekendEvents(): Promise<Event[]> {
  const response = await fetch("/api/events/weekend");
  if (!response.ok) throw new Error("Failed to fetch events");
  return response.json();
}

export default function EventsPage() {
  const queryClient = useQueryClient();
  
  const { data: events, isLoading, error } = useQuery({
    queryKey: ["weekend-events"],
    queryFn: fetchWeekendEvents,
  });

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const startResponse = await fetch("/api/scrape", { method: "POST" });
      if (!startResponse.ok) throw new Error("Scrape failed to start");
      const { jobId } = await startResponse.json();

      // Scraping can take a while (one source uses live web search), so poll
      // instead of holding one long HTTP request open.
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const statusResponse = await fetch(`/api/scrape/status/${jobId}`);
        if (!statusResponse.ok) throw new Error("Lost track of the scrape job");

        const statusData = await statusResponse.json();

        if (statusData.status === "completed") {
          return statusData.result;
        }
        if (statusData.status === "failed") {
          throw new Error(statusData.error || "Scraping failed");
        }
      }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["weekend-events"] });
      alert(`Events Updated! Found ${data.total} events: ${data.new} new, ${data.duplicates} duplicates`);
    },
    onError: () => {
      alert("Failed to refresh events. Please try again.");
    },
  });

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

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load events. Please try again later.</p>
        </div>
      </div>
    );
  }

  const groupedByDate = groupEventsByDate(events || []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            This Weekend in Houston
          </h2>
          <p className="mt-2 text-gray-600">
            {events?.length || 0} events happening this weekend
          </p>
        </div>
        <button
          onClick={() => scrapeMutation.mutate()}
          disabled={scrapeMutation.isPending}
          data-testid="button-refresh-events"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {scrapeMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Updating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Events
            </>
          )}
        </button>
      </div>

      {Object.keys(groupedByDate).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No events found for this weekend.</p>
          <p className="text-gray-400 text-sm mt-2">Check back later!</p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedByDate).map(([date, dateEvents]) => (
            <div key={date}>
              <h3 className="text-xl font-semibold text-gray-800 mb-4 sticky top-0 bg-gray-50 py-2 z-10">
                {formatDate(new Date(date))}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dateEvents.map((event) => (
                  <EventCard key={event.id} event={event} onLike={handleLike} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupEventsByDate(events: Event[]): Record<string, Event[]> {
  return events.reduce(
    (acc, event) => {
      const dateKey = event.startDate.toString().split("T")[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(event);
      return acc;
    },
    {} as Record<string, Event[]>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}
