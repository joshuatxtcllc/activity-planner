import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  fetchAggregatedActivities, 
  activitySources, 
  ExternalActivitySource 
} from "@/lib/activityService";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  CalendarDays, 
  MapPin, 
  Music, 
  Palette, 
  Utensils, 
  Calendar, 
  Plus, 
  ExternalLink, 
  Loader2 
} from "lucide-react";
import ActivityCard from "@/components/ActivityCard";
import { useToast } from "@/hooks/use-toast";

interface ActivityAggregatorProps {
  onSaveActivity: (activity: ActivityType) => void;
}

export function ActivityAggregator({ onSaveActivity }: ActivityAggregatorProps) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Query for aggregated activities
  const { data: activities, isLoading, isError } = useQuery({
    queryKey: ['aggregatedActivities', selectedSource],
    queryFn: () => fetchAggregatedActivities(selectedSource || undefined),
  });
  
  // Get icon for a source
  const getSourceIcon = (sourceId: string) => {
    switch (sourceId) {
      case 'localevents':
        return <Calendar className="w-5 h-5" />;
      case 'artgalleries':
        return <Palette className="w-5 h-5" />;
      case 'nightlife':
        return <Music className="w-5 h-5" />;
      case 'dining':
        return <Utensils className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };
  
  // Handle adding an activity to user's collection
  const handleAddActivity = (activity: ActivityType) => {
    onSaveActivity(activity);
    toast({
      title: "Activity saved",
      description: `"${activity.title}" has been added to your collection`,
    });
  };
  
  return (
    <Card className="border-gray-800">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <ExternalLink className="mr-2 h-5 w-5 text-accent" />
          Discover New Activities
        </CardTitle>
        <CardDescription>
          Find exciting activities from our curated sources
        </CardDescription>
      </CardHeader>
      
      <Tabs defaultValue="all" className="w-full">
        <CardContent>
          <TabsList className="grid grid-cols-5 mb-6">
            <TabsTrigger 
              value="all" 
              onClick={() => setSelectedSource(null)}
              className="text-xs sm:text-sm"
            >
              All Sources
            </TabsTrigger>
            
            {activitySources.map(source => (
              <TabsTrigger 
                key={source.id} 
                value={source.id} 
                onClick={() => setSelectedSource(source.id)}
                className="text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">{source.name}</span>
                <span className="sm:hidden">{getSourceIcon(source.id)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-10 w-10 animate-spin text-accent" />
              </div>
            ) : isError ? (
              <div className="text-center py-8 text-gray-400">
                <p>Unable to load activities. Please try again later.</p>
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="relative flex flex-col rounded-lg overflow-hidden border border-gray-800 bg-dark-surface hover:bg-opacity-80 transition-colors">
                    <div className="p-4 flex-grow">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-md ${activity.iconBgClass} mr-3`}>
                            {activity.icon === "music" ? (
                              <Music className="h-5 w-5 text-primary" />
                            ) : activity.icon === "cocktail" ? (
                              <Utensils className="h-5 w-5 text-secondary" />
                            ) : (
                              <Palette className="h-5 w-5 text-accent" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-light">
                              {activity.title}
                            </h3>
                          </div>
                        </div>
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
                      <span className="text-xs text-gray-400">Suggested activity</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-accent hover:text-accent hover:bg-accent/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddActivity(activity);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add to Collection
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>No activities found from this source. Try another one!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Tabs>
    </Card>
  );
}

export default ActivityAggregator;