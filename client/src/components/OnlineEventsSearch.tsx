import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  MapPin, 
  CalendarDays, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  Plus, 
  Music, 
  Utensils, 
  Palette, 
  Globe 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ActivityType } from "@/pages/Dashboard";
import { 
  EventSearchParams, 
  searchOnlineEvents, 
  eventCategories, 
  popularLocations 
} from "@/lib/onlineEventsSearch";

interface OnlineEventsSearchProps {
  onSaveActivity: (activity: ActivityType) => void;
}

export function OnlineEventsSearch({ onSaveActivity }: OnlineEventsSearchProps) {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useState<EventSearchParams>({
    query: "",
    location: "",
    category: "all",
    page: 1
  });
  
  // Query for events based on search parameters
  const { 
    data, 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['onlineEvents', searchParams],
    queryFn: () => searchOnlineEvents(searchParams)
  });

  // Handle form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
    
    toast({
      title: "Searching for events",
      description: `Looking for ${searchParams.query || "all events"}${searchParams.location ? ` in ${searchParams.location}` : ""}`,
    });
  };

  // Handle saving an activity
  const handleSaveActivity = (activity: ActivityType) => {
    onSaveActivity(activity);
    toast({
      title: "Event saved",
      description: `"${activity.title}" has been added to your collection`,
    });
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => ({ ...prev, page: newPage }));
  };

  // Function to get icon based on activity type
  const getActivityIcon = (activity: ActivityType) => {
    switch (activity.icon) {
      case "music":
        return <Music className="h-5 w-5 text-primary" />;
      case "cocktail":
        return <Utensils className="h-5 w-5 text-secondary" />;
      case "art":
        return <Palette className="h-5 w-5 text-accent" />;
      default:
        return <Palette className="h-5 w-5 text-accent" />;
    }
  };

  // Handle location selection from popular locations
  const handleLocationSelect = (location: string) => {
    setSearchParams(prev => ({ ...prev, location }));
  };

  return (
    <Card className="border-gray-800">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Globe className="mr-2 h-5 w-5 text-accent" />
          Find Events Online
        </CardTitle>
        <CardDescription>
          Discover trending events and activities around the world
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="query">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="query"
                placeholder="Jazz, art exhibition, cocktail class..."
                className="pl-8"
                value={searchParams.query}
                onChange={(e) => setSearchParams(prev => ({ ...prev, query: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="City or venue"
              value={searchParams.location}
              onChange={(e) => setSearchParams(prev => ({ ...prev, location: e.target.value }))}
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {popularLocations.slice(0, 4).map((location) => (
                <Badge 
                  key={location} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-accent/10"
                  onClick={() => handleLocationSelect(location)}
                >
                  {location}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              value={searchParams.category} 
              onValueChange={(value) => setSearchParams(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {eventCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button type="submit" className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search Events
              </>
            )}
          </Button>
        </form>
        
        <Separator className="my-6" />
        
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-accent" />
          </div>
        ) : isError ? (
          <div className="text-center py-8 text-gray-400">
            <AlertCircle className="mx-auto h-10 w-10 mb-4" />
            <p>Unable to load events. Please try again.</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : data && data.activities.length > 0 ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Showing {data.activities.length} of {data.totalResults} results
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {data.activities.map((activity) => (
                <div key={activity.id} className="relative flex flex-col rounded-lg overflow-hidden border border-gray-800 bg-dark-surface hover:bg-opacity-80 transition-colors">
                  <div className="p-4 flex-grow">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-md ${activity.iconBgClass} mr-3`}>
                          {getActivityIcon(activity)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-light">
                            {activity.title}
                          </h3>
                        </div>
                      </div>
                      
                      {activity.isFeatured && (
                        <Badge variant="secondary" className="ml-2">Featured</Badge>
                      )}
                    </div>
                    
                    <div className="mt-3 text-gray-400 text-sm">
                      <div className="flex items-center mb-1">
                        <CalendarDays className="h-4 w-4 mr-1 inline" />
                        {activity.date}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1 inline" />
                        {activity.location}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-3">
                      {activity.tags.map((tag, i) => (
                        <Badge key={i} variant={tag.color === "accent" ? "destructive" : tag.color === "secondary" ? "secondary" : "outline"}>
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-xs text-gray-400">Online event</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-accent hover:text-accent hover:bg-accent/10"
                      onClick={() => handleSaveActivity(activity)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add to Collection
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex justify-center mt-6 space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.currentPage - 1)}
                  disabled={data.currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === data.currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.currentPage + 1)}
                  disabled={data.currentPage === data.totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        ) : data ? (
          <div className="text-center py-8 text-gray-400">
            <p>No events found matching your search criteria. Try different search terms or filters.</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        ) : null}
      </CardContent>
      
      <CardFooter className="flex justify-center border-t border-gray-800 pt-4">
        <p className="text-xs text-gray-500">
          Events are aggregated from various online sources. Click "Add to Collection" to save them to your activities.
        </p>
      </CardFooter>
    </Card>
  );
}

export default OnlineEventsSearch;