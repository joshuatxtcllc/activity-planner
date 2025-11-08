import type { Event } from "../../shared/schema";

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  return (
    <a
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden"
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
            <span>{formatTime(new Date(event.startDate))}</span>
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
            <span className="text-xs text-gray-400 capitalize">
              {event.source}
            </span>
            {event.category && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                {event.category}
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
