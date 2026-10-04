import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadGoogleMaps } from "../utils/googleMaps";
import { computeWindow, formatHouston, type WindowKey } from "../utils/mapWindows";

/* ---------- types mirrored from /api/map ---------- */

interface MapConfig {
  enabled: boolean;
  browserKey: string | null;
  mapId: string;
  defaultCenter: { lat: number; lng: number };
}

interface VenueMarker {
  key: string;
  name: string;
  address: string | null;
  neighborhood: string | null;
  lat: number;
  lng: number;
  placeId: string | null;
  watchedSlug: string | null;
  eventCount: number;
  categories: Record<string, number>;
  primaryCategory: string | null;
  nextEvent: { id: string; title: string; startDate: string } | null;
}

interface VenuesResponse {
  markers: VenueMarker[];
  eventCount: number;
  truncated: boolean;
  ungeocodedInWindow: number;
}

interface VenueEvent {
  id: string;
  title: string;
  startDate: string;
  venue: string | null;
  category: string | null;
  source: string;
  url: string;
  timeUnknown: boolean;
}

interface GoogleDetails {
  name: string;
  address: string | null;
  rating: number | null;
  ratingCount: number | null;
  type: string | null;
  website: string | null;
  mapsUrl: string | null;
  openNow: boolean | null;
}

interface Selection {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  placeId: string | null;
  marker: VenueMarker | null;
}

/* ---------- presentation constants ---------- */

const CATEGORIES = [
  { key: "music", label: "Live music", color: "#4F46E5" },
  { key: "comedy", label: "Comedy", color: "#D97706" },
  { key: "game_night", label: "Game nights", color: "#0D9488" },
] as const;

const WINDOWS: { key: WindowKey; label: string }[] = [
  { key: "tonight", label: "Tonight" },
  { key: "weekend", label: "This weekend" },
  { key: "twoWeeks", label: "Next 2 weeks" },
];

const OTHER_COLOR = "#64748B";
const colorFor = (cat: string | null) => CATEGORIES.find((c) => c.key === cat)?.color ?? OTHER_COLOR;
const labelFor = (cat: string | null) =>
  CATEGORIES.find((c) => c.key === cat)?.label ?? (cat ? cat.replace(/_/g, " ") : "Other");

/* ---------- data fetching ---------- */

async function fetchConfig(): Promise<MapConfig> {
  const r = await fetch("/api/map/config");
  if (!r.ok) throw new Error("Failed to load map config");
  return r.json();
}

async function fetchVenues(bbox: string, from: Date, to: Date, cats: string[]): Promise<VenuesResponse> {
  const q = new URLSearchParams({ bbox, from: from.toISOString(), to: to.toISOString() });
  if (cats.length) q.set("categories", cats.join(","));
  const r = await fetch(`/api/map/venues?${q}`);
  if (!r.ok) throw new Error("Failed to load venues");
  return r.json();
}

async function fetchVenueEvents(sel: Selection, from: Date, to: Date): Promise<{ events: VenueEvent[]; watchedVenue: { slug: string } | null }> {
  const q = new URLSearchParams({ name: sel.name, lat: String(sel.lat), lng: String(sel.lng), from: from.toISOString(), to: to.toISOString() });
  if (sel.placeId) q.set("placeId", sel.placeId);
  const r = await fetch(`/api/map/venue-events?${q}`);
  if (!r.ok) throw new Error("Failed to load events");
  return r.json();
}

async function fetchGoogleDetails(placeId: string): Promise<GoogleDetails | null> {
  try {
    const { Place } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
    const place = new Place({ id: placeId });
    await place.fetchFields({
      fields: [
        "displayName", "formattedAddress", "rating", "userRatingCount", "primaryTypeDisplayName",
        "websiteURI", "googleMapsURI", "regularOpeningHours", "utcOffsetMinutes",
      ],
    });
    let openNow: boolean | null = null;
    try {
      openNow = (await place.isOpen()) ?? null;
    } catch {
      openNow = null;
    }
    return {
      name: place.displayName ?? "",
      address: place.formattedAddress ?? null,
      rating: place.rating ?? null,
      ratingCount: place.userRatingCount ?? null,
      type: place.primaryTypeDisplayName ?? null,
      website: place.websiteURI ?? null,
      mapsUrl: place.googleMapsURI ?? null,
      openNow,
    };
  } catch {
    // Places API (New) not enabled on the key, quota, or network: the
    // panel still works from our own data.
    return null;
  }
}

/* ---------- page ---------- */

export default function MapPage() {
  const { data: config, isLoading: configLoading, error: configError } = useQuery({
    queryKey: ["map-config"],
    queryFn: fetchConfig,
    staleTime: Infinity,
  });

  if (configLoading) return <FullBleedMessage title="Loading map…" />;
  if (configError || !config) {
    return <FullBleedMessage title="The map couldn't load" body="The server didn't return map settings. Refresh to try again." />;
  }
  if (!config.enabled || !config.browserKey) {
    return (
      <FullBleedMessage
        title="The map isn't set up yet"
        body="Add GOOGLE_MAPS_BROWSER_KEY (or GOOGLE_MAPS_API_KEY) to the server environment, with the Maps JavaScript API and Places API (New) enabled on that key."
      />
    );
  }
  return <MapView config={config} />;
}

function MapView({ config }: { config: MapConfig }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const idleTimer = useRef<number | null>(null);

  const [mapError, setMapError] = useState<string | null>(null);
  const [bbox, setBbox] = useState<string | null>(null);
  const [windowKey, setWindowKey] = useState<WindowKey>("weekend");
  const [cats, setCats] = useState<string[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);

  // Recompute the window when the filter changes, not on every render.
  const range = useMemo(() => computeWindow(windowKey), [windowKey]);

  /* --- boot the map once --- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadGoogleMaps(config.browserKey!);
        const { Map } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
        if (cancelled || !mapEl.current) return;
        const map = new Map(mapEl.current, {
          center: config.defaultCenter,
          zoom: 13,
          mapId: config.mapId,
          // Keep Google's own bars, clubs and venues visible and clickable.
          clickableIcons: true,
          gestureHandling: "greedy",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;

        map.addListener("idle", () => {
          if (idleTimer.current) window.clearTimeout(idleTimer.current);
          idleTimer.current = window.setTimeout(() => {
            const b = map.getBounds();
            if (!b) return;
            const sw = b.getSouthWest();
            const ne = b.getNorthEast();
            setBbox([sw.lat(), sw.lng(), ne.lat(), ne.lng()].map((n) => n.toFixed(5)).join(","));
          }, 250);
        });

        // Clicking one of Google's own POIs: suppress Google's default
        // bubble and open our panel for that place instead.
        map.addListener("click", (e: google.maps.MapMouseEvent | google.maps.IconMouseEvent) => {
          const placeId = "placeId" in e ? e.placeId : null;
          if (!placeId || !e.latLng) {
            setSelection(null);
            return;
          }
          e.stop();
          setSelection({ name: "", address: null, lat: e.latLng.lat(), lng: e.latLng.lng(), placeId, marker: null });
        });
      } catch (err) {
        if (!cancelled) setMapError(err instanceof Error ? err.message : "Could not load Google Maps");
      }
    })();
    return () => {
      cancelled = true;
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [config]);

  /* --- venue markers for the current viewport + filters --- */
  const { data: venues, isFetching, error: venuesError } = useQuery({
    queryKey: ["map-venues", bbox, windowKey, cats.join(",")],
    queryFn: () => fetchVenues(bbox!, range.from, range.to, cats),
    enabled: !!bbox,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !venues) return;
    let cancelled = false;
    (async () => {
      const { AdvancedMarkerElement, PinElement } = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;
      if (cancelled) return;
      const live = markersRef.current;
      const wanted = new Set(venues.markers.map((m) => m.key));
      for (const [key, mk] of live) {
        if (!wanted.has(key)) {
          mk.map = null;
          live.delete(key);
        }
      }
      for (const m of venues.markers) {
        // Rebuild each pin so counts and colors track the current filters.
        const existing = live.get(m.key);
        if (existing) existing.map = null;
        const hasEvents = m.eventCount > 0;
        const color = colorFor(m.primaryCategory);
        const pin = new PinElement({
          background: hasEvents ? color : "#FFFFFF",
          borderColor: hasEvents ? "#1F2937" : "#94A3B8",
          glyphColor: hasEvents ? "#FFFFFF" : "#94A3B8",
          glyphText: hasEvents ? String(Math.min(m.eventCount, 99)) : "",
          scale: hasEvents ? Math.min(1 + m.eventCount / 20, 1.5) : 0.9,
        });
        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: m.lat, lng: m.lng },
          content: pin,
          title: hasEvents ? `${m.name}: ${m.eventCount} event${m.eventCount === 1 ? "" : "s"}` : `${m.name} (watched)`,
          gmpClickable: true,
          zIndex: hasEvents ? 10 + m.eventCount : 1,
        });
        marker.addEventListener("gmp-click", () =>
          setSelection({ name: m.name, address: m.address, lat: m.lat, lng: m.lng, placeId: m.placeId, marker: m })
        );
        live.set(m.key, marker);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [venues]);

  const toggleCat = useCallback(
    (key: string) => setCats((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key])),
    []
  );

  const centerOnMe = useCallback(() => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        mapRef.current?.setZoom(14);
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  const emptyHint =
    venues && venues.markers.every((m) => m.eventCount === 0)
      ? venues.ungeocodedInWindow > 0
        ? `${venues.ungeocodedInWindow >= 500 ? "500+" : venues.ungeocodedInWindow} events in this window don't have map locations yet. Run the venue backfill (enrich_venue_geo) to place them.`
        : "No events in this area for the selected time. Try zooming out or picking a longer window."
      : null;

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden bg-gray-100">
      <div ref={mapEl} className="absolute inset-0" aria-label="Map of Houston venues and events" role="region" />

      {mapError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-50/95 p-6">
          <div className="max-w-md rounded-lg border bg-white p-6 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Google Maps didn't load</h2>
            <p className="mt-2 text-sm text-gray-600">
              {mapError}. Check that the key allows this site's address and has the Maps JavaScript API enabled.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="absolute left-3 right-3 top-3 z-10 flex flex-col gap-2 sm:right-auto sm:max-w-md">
        <div className="rounded-lg border border-gray-200 bg-white/95 p-2 shadow-sm backdrop-blur">
          <div className="flex gap-1" role="group" aria-label="Time window">
            {WINDOWS.map((w) => (
              <button
                key={w.key}
                onClick={() => setWindowKey(w.key)}
                aria-pressed={windowKey === w.key}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  windowKey === w.key ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Categories">
            {CATEGORIES.map((c) => {
              const on = cats.includes(c.key);
              return (
                <button
                  key={c.key}
                  onClick={() => toggleCat(c.key)}
                  aria-pressed={on}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    on ? "border-transparent text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  style={on ? { backgroundColor: c.color } : undefined}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: on ? "#fff" : c.color }} />
                  {c.label}
                </button>
              );
            })}
            {cats.length > 0 && (
              <button onClick={() => setCats([])} className="px-2 text-xs text-gray-500 hover:text-gray-800">
                Clear
              </button>
            )}
            <span className="ml-auto text-xs tabular-nums text-gray-500" aria-live="polite">
              {isFetching ? "Updating…" : venues ? countLabel(venues) : ""}
            </span>
          </div>
        </div>
        {venuesError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            Couldn't load events for this area. Move the map to retry.
          </div>
        )}
        {emptyHint && !venuesError && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{emptyHint}</div>
        )}
      </div>

      {/* Bottom-left: the app's chat widget owns the bottom-right corner. */}
      <div className="absolute bottom-6 left-3 z-10 flex flex-col items-start gap-2">
        <Legend />
        <button
          onClick={centerOnMe}
          className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Near me
        </button>
      </div>

      {selection && (
        <VenuePanel key={`${selection.placeId}|${selection.lat}|${selection.lng}`} selection={selection} range={range} onClose={() => setSelection(null)} />
      )}
    </div>
  );
}

function countLabel(v: VenuesResponse): string {
  const venues = v.markers.filter((m) => m.eventCount > 0).length;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  return `${plural(v.eventCount, "event")} · ${plural(venues, "venue")}${v.truncated ? " (zoom in for all)" : ""}`;
}

function Legend() {
  return (
    <div className="hidden rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-xs text-gray-600 shadow-sm sm:block">
      {CATEGORIES.map((c) => (
        <div key={c.key} className="flex items-center gap-2 py-0.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
          {c.label}
        </div>
      ))}
      <div className="flex items-center gap-2 py-0.5">
        <span className="h-2.5 w-2.5 rounded-full border border-gray-400 bg-white" />
        Watched, nothing scheduled
      </div>
      <div className="mt-1 border-t pt-1 text-gray-500">Tap any Google place for details</div>
    </div>
  );
}

function VenuePanel({ selection, range, onClose }: { selection: Selection; range: { from: Date; to: Date }; onClose: () => void }) {
  const [watchState, setWatchState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const { data: google, isLoading: googleLoading } = useQuery({
    queryKey: ["place-details", selection.placeId],
    queryFn: () => fetchGoogleDetails(selection.placeId!),
    enabled: !!selection.placeId,
    staleTime: 10 * 60 * 1000,
  });

  // For a Google POI click we only know the name once Places responds.
  const name = selection.name || google?.name || "";
  const effective: Selection = { ...selection, name };

  const { data, isLoading, error } = useQuery({
    queryKey: ["venue-events", selection.placeId, name, selection.lat, selection.lng, range.from.toISOString()],
    queryFn: () => fetchVenueEvents(effective, range.from, range.to),
    enabled: !!name || !!selection.placeId,
  });

  const watch = async () => {
    if (!name) return;
    setWatchState("saving");
    try {
      const r = await fetch("/api/alert-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Watch: ${name}`,
          keywords: [],
          venues: [name],
          categories: [],
          emailTo: null,
          smsTo: null,
          channelEmail: false,
          channelSms: false,
          channelInApp: true,
        }),
      });
      setWatchState(r.ok ? "saved" : "error");
    } catch {
      setWatchState("error");
    }
  };

  const address = google?.address ?? selection.address;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address || `${selection.lat},${selection.lng}`)}${
    selection.placeId ? `&destination_place_id=${encodeURIComponent(selection.placeId)}` : ""
  }`;
  const loadingName = !name && googleLoading;
  const events = data?.events ?? [];

  return (
    <aside
      className="absolute inset-x-0 bottom-0 z-30 flex max-h-[65vh] flex-col rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl sm:bottom-24 sm:left-auto sm:right-3 sm:top-3 sm:max-h-none sm:w-96 sm:rounded-xl sm:border"
      aria-label={name ? `Details for ${name}` : "Place details"}
    >
      <div className="flex items-start justify-between gap-3 border-b px-5 pb-3 pt-4">
        <div className="min-w-0">
          {loadingName ? (
            <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
          ) : (
            <h2 className="truncate text-lg font-semibold text-gray-900">{name || "Unnamed place"}</h2>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
            {google?.type && <span>{google.type}</span>}
            {google?.rating != null && (
              <span>
                ★ {google.rating.toFixed(1)}
                {google.ratingCount ? ` (${google.ratingCount.toLocaleString()})` : ""}
              </span>
            )}
            {google?.openNow != null && (
              <span className={google.openNow ? "font-medium text-emerald-700" : "text-gray-500"}>
                {google.openNow ? "Open now" : "Closed now"}
              </span>
            )}
            {selection.marker?.neighborhood && <span>{selection.marker.neighborhood}</span>}
          </div>
          {address && <p className="mt-1 text-sm text-gray-600">{address}</p>}
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      <div className="flex gap-2 border-b px-5 py-3">
        <a href={directions} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700">
          Directions
        </a>
        {google?.website && (
          <a href={google.website} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">
            Website
          </a>
        )}
        {data?.watchedVenue ? (
          <span className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-center text-sm text-gray-600">Watched</span>
        ) : (
          <button
            onClick={watch}
            disabled={!name || watchState === "saving" || watchState === "saved"}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {watchState === "saved" ? "Alert added" : watchState === "saving" ? "Saving…" : watchState === "error" ? "Retry watch" : "Watch"}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-3 sm:pb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Upcoming here</h3>
        {isLoading || loadingName ? (
          <ul className="mt-3 space-y-3">
            {[0, 1, 2].map((i) => (
              <li key={i} className="space-y-1.5">
                <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-56 animate-pulse rounded bg-gray-200" />
              </li>
            ))}
          </ul>
        ) : error ? (
          <p className="mt-3 text-sm text-red-700">Couldn't load events for this place.</p>
        ) : events.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            Nothing from Activity Planner in this window.
            {google?.website ? " The venue's own site may list more." : ""}
          </p>
        ) : (
          <ul className="mt-2 divide-y">
            {events.map((e) => (
              <li key={e.id} className="py-2.5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorFor(e.category) }} />
                  <span className="tabular-nums">{formatHouston(e.startDate, e.timeUnknown)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{labelFor(e.category)}</span>
                </div>
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-sm font-medium text-gray-900 hover:text-indigo-600">
                  {e.title}
                </a>
              </li>
            ))}
          </ul>
        )}
        {google === null && selection.placeId && (
          <p className="mt-4 text-xs text-gray-400">Google place details unavailable. Check that Places API (New) is enabled on the key.</p>
        )}
      </div>
    </aside>
  );
}

function FullBleedMessage({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md rounded-lg border bg-white p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {body && <p className="mt-2 text-sm text-gray-600">{body}</p>}
      </div>
    </div>
  );
}
