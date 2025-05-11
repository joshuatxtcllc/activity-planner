import React, { useState, useEffect } from 'react';
import SpinningWheel from '@/components/SpinningWheel';
import { EnhancedActivityType, markActivityAsSelected, upgradeToEnhancedActivity } from '@/lib/activityModel';
import { useToast } from '@/hooks/use-toast';
import CategoryFilter from '@/components/CategoryFilter';
import { CategoryType, CostLevelType, TimeCommitmentType } from '@/lib/activityCategories';
import { Button } from '@/components/ui/button';
import { Filter, RefreshCw, Instagram, CalendarRange, Map, Plus } from 'lucide-react';
import InstagramActivityScraper from '@/components/InstagramActivityScraper';
import { GoogleEventsExplorer } from '@/components/GoogleEventsExplorer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ActivityCreationForm from '@/components/ActivityCreationForm';

export default function ActivityWheelPage() {
  const { toast } = useToast();
  const [activities, setActivities] = useState<EnhancedActivityType[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<EnhancedActivityType[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("wheel");
  const [filters, setFilters] = useState<{
    categories: CategoryType[];
    costs: CostLevelType[];
    times: TimeCommitmentType[];
  }>({
    categories: [],
    costs: [],
    times: []
  });

  // Fetch activities from API on component mount
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Fetch activities from the API
        const response = await fetch('/api/activities');
        
        if (!response.ok) {
          throw new Error('Failed to fetch activities');
        }
        
        const data = await response.json();
        
        // Transform regular activities to enhanced activities
        const enhancedActivities = data.map((activity: any) => 
          upgradeToEnhancedActivity(activity)
        );
        
        setActivities(enhancedActivities);
        setFilteredActivities(enhancedActivities);
      } catch (error) {
        console.error('Error fetching activities:', error);
        toast({
          title: "Error",
          description: "Failed to load activities. Please try again later.",
          variant: "destructive"
        });
      }
    };
    
    // Check if we're coming from Instagram auth redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('instagram') === 'connected') {
      setActiveTab('instagram');
      toast({
        title: urlParams.get('simulated') ? "Instagram Connected (Simulated)" : "Instagram Connected",
        description: "Your Instagram account has been connected successfully.",
      });
      
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
    
    fetchActivities();
  }, [toast]);

  // Apply filters when filter state changes
  useEffect(() => {
    const filtered = activities.filter(activity => {
      const categoryMatch = filters.categories.length === 0 || filters.categories.includes(activity.category);
      const costMatch = filters.costs.length === 0 || filters.costs.includes(activity.costLevel);
      const timeMatch = filters.times.length === 0 || filters.times.includes(activity.timeCommitment);
      
      return categoryMatch && costMatch && timeMatch;
    });
    
    setFilteredActivities(filtered);
  }, [filters, activities]);

  const handleActivitySelected = async (activity: EnhancedActivityType) => {
    try {
      // Call API to update the selection count
      const activityId = typeof activity.id === 'string' ? parseInt(activity.id) : activity.id;
      
      if (typeof activityId === 'number') {
        const response = await fetch(`/api/activities/${activityId}/select`, {
          method: 'POST',
        });
        
        if (!response.ok) {
          throw new Error('Failed to update activity selection count');
        }
        
        // Get the updated activity from the response
        const updatedActivity = await response.json();
        const enhancedUpdatedActivity = upgradeToEnhancedActivity(updatedActivity);
        
        // Update the activity in our local state
        setActivities(prev => 
          prev.map(a => a.id === enhancedUpdatedActivity.id ? enhancedUpdatedActivity : a)
        );
        
        // Also update filtered activities
        setFilteredActivities(prev => 
          prev.map(a => a.id === enhancedUpdatedActivity.id ? enhancedUpdatedActivity : a)
        );
      } else {
        // Fallback to client-side update if we can't determine the ID
        const updatedActivity = markActivityAsSelected(activity);
        
        // Update the activity in our local state
        setActivities(prev => 
          prev.map(a => a.id === updatedActivity.id ? updatedActivity : a)
        );
        
        // Also update filtered activities
        setFilteredActivities(prev => 
          prev.map(a => a.id === updatedActivity.id ? updatedActivity : a)
        );
      }
      
      toast({
        title: "Activity Selected",
        description: `You've selected "${activity.title}". Enjoy your adventure!`,
      });
    } catch (error) {
      console.error('Error updating activity selection count:', error);
      toast({
        title: "Error",
        description: "Failed to update activity selection count.",
        variant: "destructive"
      });
    }
  };

  const handleFilterChange = (newFilters: {
    categories: CategoryType[];
    costs: CostLevelType[];
    times: TimeCommitmentType[];
  }) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({
      categories: [],
      costs: [],
      times: []
    });
  };
  
  // Handler for adding Instagram activities to the wheel
  const handleInstagramActivitiesAdded = (newActivities: EnhancedActivityType[]) => {
    if (newActivities.length === 0) return;
    
    // Add the new activities to our state
    setActivities(prev => [...prev, ...newActivities]);
    
    // Also add to filtered activities if they match the current filters
    const matchingActivities = newActivities.filter(activity => {
      const categoryMatch = filters.categories.length === 0 || 
                            filters.categories.includes(activity.category as CategoryType);
      const costMatch = filters.costs.length === 0 || 
                        filters.costs.includes(activity.costLevel as CostLevelType);
      const timeMatch = filters.times.length === 0 || 
                        filters.times.includes(activity.timeCommitment as TimeCommitmentType);
      
      return categoryMatch && costMatch && timeMatch;
    });
    
    if (matchingActivities.length > 0) {
      setFilteredActivities(prev => [...prev, ...matchingActivities]);
    }
    
    // Save the new activities to the database
    Promise.all(newActivities.map(async (activity) => {
      try {
        // Convert enhanced activity to insert format
        const activityToSave = {
          title: activity.title,
          description: activity.description,
          category: activity.category,
          costLevel: activity.costLevel,
          timeCommitment: activity.timeCommitment,
          location: activity.location,
          isPrivate: activity.isPrivate,
          isFeatured: activity.isFeatured,
          seasonality: activity.seasonality,
          imageUrl: activity.imageUrl,
          eventUrl: activity.eventUrl,
          contactInfo: activity.contactInfo,
          rating: activity.rating,
          date: activity.date,
          tags: activity.tags,
          coordinates: activity.coordinates,
          venue: activity.venue,
          venueName: activity.venueName,
          isUserAdded: true,
          attendees: activity.attendees,
          icon: activity.icon,
          iconBgClass: activity.iconBgClass
        };
        
        // Save to database
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(activityToSave),
        });
        
        if (!response.ok) {
          throw new Error('Failed to save activity');
        }
      } catch (error) {
        console.error('Error saving Instagram activity:', error);
      }
    }));
    
    toast({
      title: "Activities Added",
      description: `${newActivities.length} activities have been added from Instagram.`,
    });
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2 text-center">Activity Wheel</h1>
      <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
        Spin the wheel to discover your next adventure!
      </p>
      
      {/* Tab navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
          <TabsTrigger value="wheel">
            <Filter className="mr-2 h-4 w-4" />
            Wheel
          </TabsTrigger>
          <TabsTrigger value="events">
            <CalendarRange className="mr-2 h-4 w-4" /> 
            Find Events
          </TabsTrigger>
          <TabsTrigger value="instagram">
            <Instagram className="mr-2 h-4 w-4 text-pink-500" />
            Instagram
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* For mobile filters toggle button */}
      {activeTab === "wheel" && (
        <div className="flex justify-center mb-4 md:hidden">
          <Button 
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>
      )}
      
      {/* Instagram scraper */}
      {activeTab === "instagram" && (
        <div className="mb-8">
          <InstagramActivityScraper onActivitiesAdded={handleInstagramActivitiesAdded} />
        </div>
      )}
      
      {/* Google Events Explorer */}
      {activeTab === "events" && (
        <div className="mb-8">
          <GoogleEventsExplorer 
            onAddToWheel={(activity) => handleInstagramActivitiesAdded([activity])} 
          />
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Side panel for filters */}
        <div className={`md:col-span-1 ${showFilters ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 flex items-center justify-between">
              <span>Filters</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </h2>
            <CategoryFilter 
              onFilterChange={handleFilterChange}
              compact={true}
            />
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {filteredActivities.length} activities available
            </div>
          </div>
        </div>
        
        {/* Main wheel area */}
        <div className="md:col-span-3 flex flex-col items-center">
          <div className="w-full bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            {filteredActivities.length > 0 ? (
              <SpinningWheel 
                activities={filteredActivities}
                onActivitySelected={handleActivitySelected}
              />
            ) : (
              <div className="text-center py-20">
                <h3 className="text-xl font-semibold mb-4">No activities available</h3>
                <p className="text-gray-500 mb-8">
                  You don't have any activities that match your current filters.
                </p>
                <div className="flex justify-center">
                  <Button onClick={clearFilters} className="mr-4">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                  <Button onClick={() => setActiveTab("instagram")}>
                    <Instagram className="mr-2 h-4 w-4" />
                    Import from Instagram
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}