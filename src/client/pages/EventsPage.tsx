import { useQuery } from "@tanstack/react-query";
import EventCard from "../components/EventCard";
import type { Event } from "../../shared/schema";

async function fetchWeekendEvents(): Promise<Event[]> {
  const response = await fetch("/api/events/weekend");
  if (!response.ok) throw new Error("Failed to fetch events");
  return response.json();
}

export default function EventsPage() {
  const { data: events, isLoading, error } = useQuery({
    queryKey: ["weekend-events"],
    queryFn: fetchWeekendEvents,
  });

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
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">
          This Weekend in Houston
        </h2>
        <p className="mt-2 text-gray-600">
          {events?.length || 0} events happening this weekend
        </p>
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
                  <EventCard key={event.id} event={event} />
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
