
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchGoogleEvents } from "@/lib/googleEventsSearch";
import { EnhancedActivityType, upgradeToEnhancedActivity } from "@/lib/activityModel";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  CalendarDays, 
  MapPin, 
  PlusCircle,
  Loader2,
  Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CategoryType } from "@/lib/activityCategories";

interface GoogleEventsExplorerProps {
  onAddToWheel: (activity: EnhancedActivityType) => void;
}

export function GoogleEventsExplorer({ onAddToWheel }: GoogleEventsExplorerProps) {
  const { toast } = useToast();
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState("");
  const [dateFilter, setDateFilter] = useState("this weekend");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Track which events have been added to the wheel
  const [addedEvents, setAddedEvents] = useState<Set<string>>(new Set());

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ["googleEvents", searchQuery, location, eventType, dateFilter],
    queryFn: async () => {
      if (!searchQuery && !location && !eventType) return [];

      setIsSearching(true);
      try {
        const query = searchQuery || 
                    `${eventType ? eventType + " " : ""}${location ? "in " + location : ""} events`;

        const results = await searchGoogleEvents(query, location, eventType, dateFilter);
        return results;
      } catch (error) {
        console.error("Error fetching Google events:", error);
        toast({
          title: "Error",
          description: "Failed to fetch events. Please try again.",
          variant: "destructive"
        });
        return [];
      } finally {
        setIsSearching(false);
      }
    },
    enabled: false, // Don't run the query automatically
  });

  const handleSearch = () => {
    refetch();
  };

  const handleAddToWheel = (event: any) => {
    // Convert Google event to EnhancedActivityType
    const category: CategoryType = event.eventType || "ENTERTAINMENT";

    const enhancedActivity: EnhancedActivityType = {
      id: `google-${event.link.replace(/[^a-zA-Z0-9]/g, "-")}`,
      title: event.title,
      description: event.snippet,
      category,
      costLevel: "MEDIUM",
      timeCommitment: "MEDIUM", 
      location: event.venue || event.location || location,
      isPrivate: false,
      isFeatured: false,
      date: event.formattedDate ? `Event Date: ${event.formattedDate}` : undefined,
      tags: [{ name: eventType || "Event", color: "default" }],
      eventUrl: event.link,
      isUserAdded: true,
      dateAdded: new Date(),
      lastSelected: null,
      timesSelected: 0,
    };

    // Add to wheel
    onAddToWheel(enhancedActivity);

    // Mark as added
    setAddedEvents(prev => new Set(prev).add(event.link));

    toast({
      title: "Added to Wheel",
      description: `${event.title} has been added to your activity wheel!`,
    });
  };

  // Date filter options
  const dateOptions = [
    { value: "today", label: "Today" },
    { value: "this weekend", label: "This Weekend" },
    { value: "this week", label: "This Week" },
    { value: "next week", label: "Next Week" },
    { value: "this month", label: "This Month" },
  ];

  // Event type suggestions
  const eventTypes = [
    "Music", "Arts", "Food", "Sports", "Family", "Nightlife", 
    "Festival", "Theater", "Comedy", "Education", "Networking"
  ];

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Discover Events</CardTitle>
          <CardDescription>
            Find local events to add to your activity wheel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search events (optional)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Input
                placeholder="Location (e.g., New York)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="When?" />
                </SelectTrigger>
                <SelectContent>
                  {dateOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Event Type</div>
            <div className="flex flex-wrap gap-2">
              {eventTypes.map(type => (
                <Button
                  key={type}
                  variant={eventType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEventType(type === eventType ? "" : type)}
                  className="text-xs"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleSearch} 
            disabled={isLoading || isSearching}
            className="w-full"
          >
            {(isLoading || isSearching) ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Search for Events
          </Button>
        </CardContent>
      </Card>

      {events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event, index) => (
            <Card key={`${event.link}-${index}`} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
              </CardHeader>
              <CardContent className="pb-4 pt-0">
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-3">
                  {event.snippet}
                </p>
                <div className="flex flex-col space-y-1.5 mb-3">
                  {event.formattedDate && (
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <CalendarDays className="mr-1 h-3 w-3" />
                      <span>{event.formattedDate}</span>
                    </div>
                  )}
                  {(event.venue || event.location) && (
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <MapPin className="mr-1 h-3 w-3" />
                      <span>{event.venue || event.location}</span>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full"
                  variant={addedEvents.has(event.link) ? "secondary" : "default"}
                  onClick={() => handleAddToWheel(event)}
                  disabled={addedEvents.has(event.link)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {addedEvents.has(event.link) ? "Added to Wheel" : "Add to Wheel"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isSearching && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {!isSearching && events.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <p className="text-gray-500">No events found. Try different search terms.</p>
        </div>
      )}
    </div>
  );
}

// Also export as default for backward compatibility
export default GoogleEventsExplorer;
