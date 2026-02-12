import type { Event } from "../../shared/schema";
import { useState, useMemo } from "react";
import ExternalLinkWarning from "./ExternalLinkWarning";
import { getVerifiedSellerName } from "../utils/linkSafety";

interface EventCardProps {
  event: Event;
  onLike?: (eventId: string, liked: boolean | null) => void;
}

export default function EventCard({ event, onLike }: EventCardProps) {
  const [userPreference, setUserPreference] = useState<boolean | null>(null);

  const handlePreference = async (liked: boolean, e: React.MouseEvent) => {
    e.preventDefault(); // Don't navigate to event URL
    e.stopPropagation();

    const newPreference = userPreference === liked ? null : liked;
    setUserPreference(newPreference);

    if (onLike) {
      onLike(event.id, newPreference);
    }
  };

  const verifiedSeller = useMemo(() => getVerifiedSellerName(event.url), [event.url]);

  return (
    <div className="relative bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden">
      <ExternalLinkWarning
        href={event.url}
        className="block"
        eventTitle={event.title}
        displayedPrice={event.priceMin ? { min: event.priceMin, max: event.priceMax ?? undefined } : undefined}
      >
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

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 capitalize">
                  {event.source}
                </span>
                {verifiedSeller && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium" title={`Verified seller: ${verifiedSeller}`}>
                    ✓ Verified
                  </span>
                )}
              </div>
              {event.category && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                  {event.category}
                </span>
              )}
            </div>
          </div>
        </div>
      </ExternalLinkWarning>

      {/* Like/Dislike Buttons */}
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        <button
          onClick={(e) => handlePreference(true, e)}
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
          onClick={(e) => handlePreference(false, e)}
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
