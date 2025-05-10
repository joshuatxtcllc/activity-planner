import React, { useState, useEffect } from 'react';
import SpinningWheel from '@/components/SpinningWheel';
import { EnhancedActivityType, markActivityAsSelected } from '@/lib/activityModel';
import { useToast } from '@/hooks/use-toast';
import CategoryFilter from '@/components/CategoryFilter';
import { CategoryType, CostLevelType, TimeCommitmentType } from '@/lib/activityCategories';
import { Button } from '@/components/ui/button';
import { Filter, RefreshCw } from 'lucide-react';

// Import activity transformation helper
import { upgradeToEnhancedActivity } from '@/lib/activityModel';

export default function ActivityWheelPage() {
  const { toast } = useToast();
  const [activities, setActivities] = useState<EnhancedActivityType[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<EnhancedActivityType[]>([]);
  const [showFilters, setShowFilters] = useState(false);
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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2 text-center">Activity Wheel</h1>
      <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
        Spin the wheel to discover your next adventure!
      </p>
      
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
          <div className="mb-4 md:hidden">
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              className="w-full"
            >
              <Filter className="mr-2 h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>
          
          <div className="w-full bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <SpinningWheel 
              activities={filteredActivities}
              onActivitySelected={handleActivitySelected}
            />
          </div>
        </div>
      </div>
    </div>
  );
}