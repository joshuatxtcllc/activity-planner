import { useState, useEffect } from "react";
import { Search, Calendar, MapPin, Info } from "lucide-react";
import { ActivityType } from "@/pages/Dashboard";
import { searchGoogleEvents } from "@/lib/googleEventsSearch";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import EventDetailsDialog from "@/components/EventDetailsDialog";

interface GoogleEventsExplorerProps {
  onSaveActivity: (activity: ActivityType) => void;
}

export function GoogleEventsExplorer({ onSaveActivity }: GoogleEventsExplorerProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchResults, setSearchResults] = useState<ActivityType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ActivityType | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Sample popular searches for quick selection
  const popularSearches = [
    "concerts this weekend",
    "festivals",
    "food events",
    "comedy shows",
    "art exhibitions"
  ];
  
  // Search for events when the page loads with a default query
  useEffect(() => {
    handleSearch("events this weekend", "");
  }, []);

  const handleSearch = async (query = searchQuery, location = searchLocation) => {
    if (!query) {
      toast({
        title: "Search query required",
        description: "Please enter a search term or select from popular searches",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const activities = await searchGoogleEvents({
        query,
        location: location || undefined,
        date: "this weekend" // Default to this weekend if not specified in query
      });
      
      setSearchResults(activities);
      
      if (activities.length === 0) {
        toast({
          title: "No events found",
          description: `No events found for "${query}". Try a different search term.`,
        });
      }
    } catch (error) {
      console.error("Error searching for events:", error);
      toast({
        title: "Search Error",
        description: "There was a problem searching for events. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveActivity = (activity: ActivityType) => {
    onSaveActivity(activity);
    toast({
      title: "Activity Saved",
      description: `"${activity.title}" has been added to your activities.`,
    });
  };

  const handleOpenDetails = (activity: ActivityType) => {
    setSelectedEvent(activity);
    setDetailsDialogOpen(true);
  };

  const handleQuickSearch = (term: string) => {
    setSearchQuery(term);
    handleSearch(term, searchLocation);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-col space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search for events (e.g., concerts, festivals, shows)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-dark border-gray-700"
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Location (e.g., New York, Boston)"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="pl-9 bg-dark border-gray-700"
            />
          </div>
        </div>
        <Button 
          onClick={() => handleSearch()} 
          className="w-full bg-accent hover:bg-accent/90"
        >
          Search Events
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {popularSearches.map((term, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="border-gray-700 text-xs"
            onClick={() => handleQuickSearch(term)}
          >
            {term}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex flex-row justify-between items-center">
          <h3 className="text-sm font-medium text-gray-400">Search Results</h3>
          
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span>Using demo data</span>
          </div>
        </div>
        
        {isLoading ? (
          // Skeleton loading UI
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-dark-surface border-gray-800">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4 bg-gray-700" />
                    <Skeleton className="h-3 w-1/2 bg-gray-700" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-1/4 bg-gray-700" />
                      <Skeleton className="h-3 w-1/4 bg-gray-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchResults.length > 0 ? (
          <>
            <div className="space-y-3">
              {searchResults.map((activity) => (
                <Card 
                  key={activity.id}
                  className="bg-dark-surface border-gray-800 hover:border-gray-700 transition-colors cursor-pointer"
                  onClick={() => handleOpenDetails(activity)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-lg p-2 ${activity.iconBgClass} w-10 h-10 flex items-center justify-center`}>
                        {activity.icon === "music" ? (
                          <div className="h-5 w-5 text-primary">🎵</div>
                        ) : activity.icon === "cocktail" ? (
                          <div className="h-5 w-5 text-secondary">🍸</div>
                        ) : (
                          <div className="h-5 w-5 text-accent">🎨</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium mb-1">{activity.title}</h4>
                        <div className="flex items-center text-xs text-gray-400 mb-1">
                          <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{activity.date}</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-400 mb-2">
                          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{activity.location}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {activity.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className={`text-xs px-1.5 py-0.5 rounded-full ${
                                tag.color === "secondary"
                                  ? "bg-secondary/20 text-secondary"
                                  : tag.color === "accent"
                                  ? "bg-accent/20 text-accent"
                                  : "bg-gray-700 text-gray-300"
                              }`}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveActivity(activity);
                        }}
                      >
                        <span className="sr-only">Save</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                          <polyline points="17 21 17 13 7 13 7 21" />
                          <polyline points="7 3 7 8 15 8" />
                        </svg>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="bg-dark rounded-lg border border-gray-800 p-4">
              <h4 className="text-sm font-medium mb-2">Want real Google search results?</h4>
              <p className="text-xs text-gray-400 mb-3">
                This app is using demo data for search results. To use the actual Google Custom Search API:
              </p>
              <ol className="list-decimal list-inside text-xs text-gray-400 space-y-1 ml-2 mb-3">
                <li>Create a <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Google Cloud Platform</a> account</li>
                <li>Create a new project and enable the "Custom Search API"</li>
                <li>Create API credentials to get an API key</li>
                <li>Go to the <a href="https://programmablesearchengine.google.com/controlpanel/create" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Programmable Search Engine</a> page to create a search engine</li>
                <li>Add your API key and Search Engine ID to the environment variables</li>
              </ol>
              <div className="text-xs bg-gray-900 p-2 rounded font-mono mb-3">
                <code>GOOGLE_SEARCH_API_KEY=your_api_key</code><br />
                <code>GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id</code>
              </div>
              <p className="text-xs text-gray-500">Note: Google Custom Search API has a free tier that allows 100 search queries per day.</p>
            </div>
          </>
        ) : (
          <div className="text-center py-10 border border-dashed border-gray-700 rounded-lg">
            <Info className="h-12 w-12 mx-auto mb-3 text-gray-500" />
            <p className="text-gray-400 mb-4">No event results to display.</p>
            <p className="text-sm text-gray-500">
              Try searching for "concerts in Chicago" or selecting a popular search above.
            </p>
          </div>
        )}
      </div>

      {selectedEvent && (
        <EventDetailsDialog
          event={selectedEvent}
          isOpen={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          onSaveActivity={handleSaveActivity}
        />
      )}
    </div>
  );
}