import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import EventCard from "../components/EventCard";
import type { Event } from "../../shared/schema";
import { groupDuplicateEvents, type GroupedEvent } from "../utils/eventGrouping";

type SortKey = "date_asc" | "date_desc" | "newest" | "title";

const VENUE_PRESETS = [
  { label: "All venues", value: "" },
  { label: "Toyota Center", value: "Toyota Center" },
  { label: "House of Blues", value: "House of Blues" },
  { label: "713 Music Hall", value: "713 Music Hall" },
  { label: "Houston Improv", value: "Houston Improv" },
];

const CATEGORY_PRESETS = [
  { label: "All", value: "" },
  { label: "Live Music", value: "music" },
  { label: "Comedy", value: "comedy" },
  { label: "Sports", value: "sports" },
  { label: "Game Night", value: "game_night" },
  { label: "Arts", value: "arts" },
  { label: "Food", value: "food" },
];

const PRICE_PRESETS = [
  { label: "Any price", value: "any" },
  { label: "Free only", value: "free" },
  { label: "Under $50", value: "under50" },
];

const SORT_PRESETS: { label: string; value: SortKey }[] = [
  { label: "Date (soonest first)", value: "date_asc" },
  { label: "Date (latest first)", value: "date_desc" },
  { label: "Recently added", value: "newest" },
  { label: "Title (A–Z)", value: "title" },
];

async function fetchEvents(params: URLSearchParams): Promise<Event[]> {
  const qs = params.toString();
  const response = await fetch(`/api/events${qs ? "?" + qs : ""}`);
  if (!response.ok) throw new Error("Failed to fetch events");
  return response.json();
}

/**
 * Return ISO strings for the coming week (today → today + 6 days) so
 * the default view is the sortable/filterable weekly dashboard the
 * nightlife spec asks for.
 */
function defaultWeekWindow(): { start: string; end: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function EventsPage() {
  const queryClient = useQueryClient();
  const initialWindow = useMemo(defaultWeekWindow, []);

  const [venue, setVenue] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("any");
  const [dateStart, setDateStart] = useState(initialWindow.start.slice(0, 10));
  const [dateEnd, setDateEnd] = useState(initialWindow.end.slice(0, 10));
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date_asc");

  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set("upcoming", "true");
    p.set("sort", sort);
    if (venue) p.set("venue", venue);
    if (category) p.set("category", category);
    if (dateStart) p.set("dateStart", new Date(dateStart).toISOString());
    if (dateEnd) {
      // Include the whole end day.
      const d = new Date(dateEnd);
      d.setHours(23, 59, 59, 999);
      p.set("dateEnd", d.toISOString());
    }
    if (search) p.set("search", search);
    return p;
  }, [venue, category, dateStart, dateEnd, search, sort]);

  const { data: events, isLoading, error } = useQuery({
    queryKey: ["events", params.toString()],
    queryFn: () => fetchEvents(params),
  });

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const startResponse = await fetch("/api/scrape", { method: "POST" });
      if (!startResponse.ok) throw new Error("Scrape failed to start");
      const { jobId } = await startResponse.json();

      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const statusResponse = await fetch(`/api/scrape/status/${jobId}`);
        if (!statusResponse.ok) throw new Error("Lost track of the scrape job");
        const statusData = await statusResponse.json();
        if (statusData.status === "completed") return statusData.result;
        if (statusData.status === "failed") throw new Error(statusData.error || "Scraping failed");
      }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      alert(`Events Updated! Found ${data.total} events: ${data.new} new, ${data.duplicates} duplicates`);
    },
    onError: () => alert("Failed to refresh events. Please try again."),
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

  // Client-side price filter (server doesn't expose price band presets).
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (price === "free") return events.filter((e) => e.isFree || (e.priceMin ?? 0) === 0);
    if (price === "under50")
      return events.filter((e) => (e.priceMin != null ? e.priceMin < 5000 : true));
    return events;
  }, [events, price]);

  const deduplicatedEvents = useMemo(() => groupDuplicateEvents(filteredEvents), [filteredEvents]);
  const groupedByDate = useMemo(() => groupEventsByDate(deduplicatedEvents), [deduplicatedEvents]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Houston Weekly Dashboard</h2>
          <p className="mt-2 text-gray-600">
            {deduplicatedEvents.length} events matching your filters
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
            "Refresh Events"
          )}
        </button>
      </div>

      {/* Filter + sort bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Venue</label>
            <select
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full border rounded-md px-2 py-1.5 text-sm"
            >
              {VENUE_PRESETS.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border rounded-md px-2 py-1.5 text-sm"
            >
              {CATEGORY_PRESETS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Price</label>
            <select
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full border rounded-md px-2 py-1.5 text-sm"
            >
              {PRICE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sort by</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="w-full border rounded-md px-2 py-1.5 text-sm"
            >
              {SORT_PRESETS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="w-full border rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="w-full border rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <input
              type="text"
              placeholder="Artist, keyword…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-md px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load events. Please try again later.</p>
        </div>
      ) : Object.keys(groupedByDate).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No events match these filters.</p>
          <p className="text-gray-400 text-sm mt-2">Try broadening the date range or clearing a filter.</p>
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

function groupEventsByDate(events: GroupedEvent[]): Record<string, GroupedEvent[]> {
  return events.reduce(
    (acc, event) => {
      const dateKey = event.startDate.toString().split("T")[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(event);
      return acc;
    },
    {} as Record<string, GroupedEvent[]>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}
