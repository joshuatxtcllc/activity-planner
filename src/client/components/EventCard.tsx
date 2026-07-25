import { useState, useMemo } from "react";
import ExternalLinkWarning from "./ExternalLinkWarning";
import { getVerifiedSellerName } from "../utils/linkSafety";
import type { GroupedEvent } from "../utils/eventGrouping";

interface EventCardProps {
  event: GroupedEvent;
  onLike?: (eventId: string, liked: boolean | null) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  ticketmaster: "Ticketmaster",
  eventbrite: "Eventbrite",
  seatgeek: "SeatGeek",
  google: "Google",
  perplexity: "Event Listing",
  reddit: "Reddit",
  meetup: "Meetup",
  tripadvisor: "TripAdvisor",
  do713: "Do713",
  houstonpress: "Houston Press",
  spacecityrock: "Space City Rock",
  houstonzoo: "Houston Zoo",
  nrgpark: "NRG Park",
  eventcartel: "EventCartel",
};

function getSourceLabel(source: string): string {
  return SOURCE_LABELS[source] || source.charAt(0).toUpperCase() + source.slice(1);
}

export default function EventCard({ event, onLike }: EventCardProps) {
  const [userPreference, setUserPreference] = useState<boolean | null>(null);

  const handlePreference = (liked: boolean) => {
    const newPreference = userPreference === liked ? null : liked;
    setUserPreference(newPreference);

    if (onLike) {
      onLike(event.id, newPreference);
    }
  };

  const sources = event.sources.length > 0 ? event.sources : [
    { id: event.id, source: event.source, url: event.url, isFree: event.isFree, priceMin: event.priceMin, priceMax: event.priceMax },
  ];

  return (
    <div className="relative bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden">
      {event.imageUrl && (
        <img
          src={event.imageUrl}
          alt={event.title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
            {event.title}
          </h3>
          {event.isFree && (
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
              FREE
            </span>
          )}
        </div>

        {event.description && (
          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
            {event.description}
          </p>
        )}

        <div className="space-y-2 text-sm text-gray-500">
          {event.venue && (
            <div className="flex items-center">
              <span className="mr-2">📍</span>
              <span className="truncate">{event.venue}</span>
            </div>
          )}

          <div className="flex items-center">
            <span className="mr-2">📅</span>
            <span>{formatDateTime(new Date(event.startDate))}</span>
          </div>

          {!event.isFree && event.priceMin && (
            <div className="flex items-center">
              <span className="mr-2">💵</span>
              <span>
                {formatPrice(event.priceMin)}
                {event.priceMax && event.priceMax !== event.priceMin
                  ? ` - ${formatPrice(event.priceMax)}`
                  : ""}
              </span>
            </div>
          )}

          {event.category && (
            <div className="flex items-center justify-end pt-1">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                {event.category}
              </span>
            </div>
          )}
        </div>

        {/* Source links - one per source this event was found on */}
        <div className="mt-3 pt-3 border-t space-y-1.5">
          {sources.map((src) => (
            <SourceLink key={src.id} source={src.source} url={src.url} eventTitle={event.title} priceMin={src.priceMin} priceMax={src.priceMax} />
          ))}
        </div>
      </div>

      {/* Like/Dislike Buttons */}
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        <button
          onClick={() => handlePreference(true)}
          className={`p-2 rounded-full shadow-md transition-all ${
            userPreference === true
              ? "bg-green-500 text-white scale-110"
              : "bg-white text-gray-600 hover:bg-green-50 hover:text-green-600"
          }`}
          title="I like this event"
          aria-label="Like event"
        >
          👍
        </button>
        <button
          onClick={() => handlePreference(false)}
          className={`p-2 rounded-full shadow-md transition-all ${
            userPreference === false
              ? "bg-red-500 text-white scale-110"
              : "bg-white text-gray-600 hover:bg-red-50 hover:text-red-600"
          }`}
          title="Not interested"
          aria-label="Dislike event"
        >
          👎
        </button>
      </div>
    </div>
  );
}

function SourceLink({
  source,
  url,
  eventTitle,
  priceMin,
  priceMax,
}: {
  source: string;
  url: string;
  eventTitle: string;
  priceMin: number | null;
  priceMax: number | null;
}) {
  const verifiedSeller = useMemo(() => getVerifiedSellerName(url), [url]);

  return (
    <ExternalLinkWarning
      href={url}
      className="flex items-center justify-between text-sm text-indigo-600 hover:text-indigo-800 font-medium py-1"
      eventTitle={eventTitle}
      displayedPrice={priceMin ? { min: priceMin, max: priceMax ?? undefined } : undefined}
    >
      <span className="flex items-center gap-1.5">
        View details on {getSourceLabel(source)} →
        {verifiedSeller && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium" title={`Verified seller: ${verifiedSeller}`}>
            ✓ Verified
          </span>
        )}
      </span>
    </ExternalLinkWarning>
  );
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
