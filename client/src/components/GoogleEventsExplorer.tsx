
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ActivityType } from "@/pages/Dashboard";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  CalendarDays, 
  MapPin, 
  Music, 
  Loader2 
} from "lucide-react";
import { searchGoogleEvents } from "@/lib/googleEventsSearch";

interface GoogleEventsExplorerProps {
  onSaveActivity: (activity: ActivityType) => void;
}

export function GoogleEventsExplorer({ onSaveActivity }: GoogleEventsExplorerProps) {
  // State for search parameters
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [dateFilter, setDateFilter] = useState("this weekend");
  const [eventType, setEventType] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [events, setEvents] = useState<ActivityType[]>([]);
  
  // Date options for the dropdown
  const dateOptions = [
    { value: "today", label: "Today" },
    { value: "tomorrow", label: "Tomorrow" },
    { value: "this weekend", label: "This Weekend" },
    { value: "next week", label: "Next Week" },
    { value: "this month", label: "This Month" }
  ];
  
  // Event types for filtering
  const eventTypes = ["Music", "Art", "Sports", "Food", "Comedy", "Festival"];
  
  // Query for searching events
  const { 
    data, 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['googleEvents', searchQuery, location, dateFilter, eventType],
    queryFn: () => searchGoogleEvents({
      query: searchQuery || (eventType ? `${eventType} events` : "events"),
      location: location,
      date: dateFilter,
      eventType: eventType
    }),
    enabled: false, // Don't execute the query on component mount
  });
  
  // Handle search button click
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    
    try {
      // Build query based on user input
      const searchParams = {
        query: searchQuery || (eventType ? `${eventType} events` : "events"),
        location: location,
        date: dateFilter,
        eventType: eventType
      };
      
      console.log("Searching Google for events:", searchParams);
      
      // Execute the query
      const results = await refetch();
      
      // Update state with results
      if (results.data) {
        setEvents(results.data);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error("Error searching for events:", error);
      setEvents([]);
    } finally {
      setIsSearching(false);
    }
  };

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden border-gray-800 bg-dark-surface hover:bg-opacity-80 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-md ${event.iconBgClass || 'bg-primary/20'} mr-3`}>
                      <Music className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-light">{event.title}</h3>
                    </div>
                  </div>
                  {event.isFeatured && (
                    <Badge variant="secondary" className="ml-2">Featured</Badge>
                  )}
                </div>
                
                <div className="mt-3 text-gray-400 text-sm">
                  <div className="flex items-center mb-1">
                    <CalendarDays className="h-4 w-4 mr-1 inline" />
                    {event.date}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1 inline" />
                    {event.location}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mt-3">
                  {event.tags && event.tags.map((tag, i) => (
                    <Badge key={i} variant={tag.color === "accent" ? "destructive" : tag.color === "secondary" ? "secondary" : "outline"}>
                      {tag.name}
                    </Badge>
                  ))}
                </div>
                
                <Button 
                  className="w-full mt-4" 
                  size="sm"
                  onClick={() => onSaveActivity(event)}
                >
                  Add to Collection
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
