import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLocalEvents, getUserLocation, UserLocation } from "@/lib/localEventsService";
import { ActivityType } from "@/pages/Dashboard";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  AlertCircle,
  CalendarDays, 
  MapPin, 
  Music, 
  Palette, 
  Utensils, 
  Plus, 
  Loader2,
  RefreshCw,
  MapIcon,
  MapPinIcon,
  Info
} from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import EventDetailsDialog from "./EventDetailsDialog";

interface LocalEventsExplorerProps {
  onSaveActivity: (activity: ActivityType) => void;
}

export function LocalEventsExplorer({ onSaveActivity }: LocalEventsExplorerProps) {
  const { toast } = useToast();
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [customLocation, setCustomLocation] = useState({
    city: "New York",
    latitude: "40.7128",
    longitude: "-74.0060"
  });
  
  // State for event details dialog
  const [selectedEvent, setSelectedEvent] = useState<ActivityType | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  // Using the API keys from environment variables
  const apiKeys = {
    ticketmaster: import.meta.env.VITE_TICKETMASTER_API_KEY as string || "",
    eventbrite: import.meta.env.VITE_EVENTBRITE_API_KEY as string || "",
    tripadvisor: import.meta.env.VITE_TRIPADVISOR_API_KEY as string || ""
  };
  
  // Check if we have at least one API key with actual content
  const hasApiKeys = (
    (apiKeys.ticketmaster && apiKeys.ticketmaster.length > 5) || 
    (apiKeys.eventbrite && apiKeys.eventbrite.length > 5) || 
    (apiKeys.tripadvisor && apiKeys.tripadvisor.length > 5)
  );
  
  // Fetch user location on component mount
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const location = await getUserLocation();
        setUserLocation(location);
      } catch (error) {
        console.error("Error getting user location:", error);
        // Set a default location if browser geolocation fails
        const defaultLocation: UserLocation = {
          city: "New York",
          latitude: 40.7128,
          longitude: -74.0060,
          state: "NY",
          country: "USA"
        };
        
        // Update the custom location form with these values
        setCustomLocation({
          city: defaultLocation.city || "New York",
          latitude: defaultLocation.latitude.toString(),
          longitude: defaultLocation.longitude.toString()
        });
        
        // Show a toast to let the user know
        toast({
          title: "Location Access",
          description: "Please use the 'Set Your Location' button to choose your city.",
          variant: "destructive"
        });
        
        // Set the user location to the default
        setUserLocation(defaultLocation);
      }
    };
    
    fetchLocation();
  }, [toast]);
  
  // Query for local events
  const { 
    data: localEvents, 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['localEvents', userLocation?.city, userLocation?.latitude, userLocation?.longitude],
    queryFn: () => {
      console.log("Fetching events for location:", userLocation);
      return getLocalEvents(apiKeys);
    },
    enabled: !!userLocation,
  });
  
  // Handle saving an activity
  const handleSaveActivity = (activity: ActivityType) => {
    onSaveActivity(activity);
    toast({
      title: "Event saved",
      description: `"${activity.title}" has been added to your collection`,
    });
  };
  
  // Handle setting a custom location
  const handleSetCustomLocation = () => {
    // Basic validation
    if (!customLocation.city) {
      toast({
        title: "Error",
        description: "Please enter a city name",
        variant: "destructive"
      });
      return;
    }
    
    const lat = parseFloat(customLocation.latitude);
    const lng = parseFloat(customLocation.longitude);
    
    // If coordinates are provided, validate them
    if (customLocation.latitude || customLocation.longitude) {
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        toast({
          title: "Error",
          description: "Please enter valid coordinates",
          variant: "destructive"
        });
        return;
      }
    }
    
    // Create location object with default coordinates if not provided
    const newLocation: UserLocation = {
      city: customLocation.city,
      // Use provided coordinates or defaults for major cities
      latitude: !isNaN(lat) ? lat : 40.7128, // Default to NYC coordinates
      longitude: !isNaN(lng) ? lng : -74.0060
    };
    
    // Show loading state
    // The refresh will happen automatically when location changes
    
    // First update the global location service
    import('@/lib/localEventsService').then(module => {
      module.setUserLocation(newLocation);
    });
    
    // Update local state and close modal
    setUserLocation(newLocation);
    setLocationModalOpen(false);
    
    // Force a refresh with the new location
    setTimeout(() => {
      console.log("Refreshing events with new location:", newLocation);
      refetch();
    }, 200);
    
    toast({
      title: "Location Updated",
      description: `Showing events near ${newLocation.city}`,
    });
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
  
  // Function to handle opening details dialog
  const handleOpenDetails = (activity: ActivityType) => {
    setSelectedEvent(activity);
    setDetailsDialogOpen(true);
  };
  
  return (
    <div>
      <Card className="border-gray-800">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl flex items-center">
                <MapPinIcon className="mr-2 h-5 w-5 text-accent" />
                Local Events
              </CardTitle>
              <CardDescription>
                {userLocation?.city 
                  ? `Showing ${hasApiKeys ? 'real' : 'sample'} events near ${userLocation.city}` 
                  : `Please set your location to see local events`}
              </CardDescription>
              
              {userLocation?.city && (
                <div className="mt-2 flex items-center">
                  <Badge variant="outline" className="bg-primary/30 text-primary-foreground font-medium">
                    {userLocation.city}
                  </Badge>
                </div>
              )}
            </div>
            
            <AlertDialog open={locationModalOpen} onOpenChange={setLocationModalOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="default" size="sm" className="flex items-center gap-1 bg-accent hover:bg-accent/90">
                  <MapIcon className="h-4 w-4" />
                  <span>{userLocation?.city ? "Change Location" : "Set Your Location"}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Set Your Location</AlertDialogTitle>
                  <AlertDialogDescription>
                    Enter your city name to find events in your area. Browser location detection may not work in all environments.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="city" className="text-right">
                      City
                    </Label>
                    <Input
                      id="city"
                      className="col-span-3"
                      value={customLocation.city}
                      onChange={(e) => setCustomLocation({...customLocation, city: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="latitude" className="text-right">
                      Latitude
                    </Label>
                    <Input
                      id="latitude"
                      className="col-span-3"
                      value={customLocation.latitude}
                      onChange={(e) => setCustomLocation({...customLocation, latitude: e.target.value})}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="longitude" className="text-right">
                      Longitude
                    </Label>
                    <Input
                      id="longitude"
                      className="col-span-3"
                      value={customLocation.longitude}
                      onChange={(e) => setCustomLocation({...customLocation, longitude: e.target.value})}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSetCustomLocation}>
                    Set Location
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-10 w-10 animate-spin text-accent" />
            </div>
          ) : isError ? (
            <div className="text-center py-8 text-gray-400">
              <AlertCircle className="mx-auto h-10 w-10 mb-4" />
              <p>Unable to load events. Please try again later.</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : localEvents && localEvents.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {localEvents.map((activity) => (
                <div 
                  key={activity.id} 
                  className="relative flex flex-col rounded-lg overflow-hidden border border-gray-800 bg-dark-surface hover:bg-opacity-80 transition-colors cursor-pointer"
                  onClick={() => handleOpenDetails(activity)}
                >
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
                    <span className="text-xs text-gray-400">
                      <Button size="sm" variant="ghost" className="flex items-center px-2 py-0 h-auto text-xs text-gray-400 hover:text-accent">
                        <Info className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-accent hover:text-accent hover:bg-accent/10"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent opening the details dialog
                        handleSaveActivity(activity);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add to Collection
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : !userLocation ? (
            <div className="text-center py-8 text-gray-400">
              <p>Please set your location to see events in your area.</p>
              <Button variant="default" className="mt-4 bg-accent hover:bg-accent/90" onClick={() => setLocationModalOpen(true)}>
                <MapIcon className="mr-2 h-4 w-4" />
                Set Your Location
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p>No events found in your area. Try changing your location or check back later.</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col items-center border-t border-gray-800 pt-4">
          <p className="text-xs text-gray-500 mb-2">
            Events are aggregated from various sources and may be subject to change. Always check the official event website for the most up-to-date information.
          </p>
          {hasApiKeys && (
            <div className="flex flex-wrap gap-2 justify-center">
              {apiKeys.ticketmaster && <Badge variant="outline">Ticketmaster</Badge>}
              {apiKeys.eventbrite && <Badge variant="outline">Eventbrite</Badge>}
              {apiKeys.tripadvisor && <Badge variant="outline">TripAdvisor</Badge>}
            </div>
          )}
        </CardFooter>
      </Card>
      
      <EventDetailsDialog
        event={selectedEvent}
        isOpen={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onSaveActivity={handleSaveActivity}
      />
    </div>
  );
}

export default LocalEventsExplorer;
