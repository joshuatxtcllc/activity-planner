import React, { useState } from 'react';
import { 
  activityCategories, 
  CategoryType, 
  costLevels, 
  CostLevelType, 
  timeCommitments, 
  TimeCommitmentType 
} from '@/lib/activityCategories';
import { EnhancedActivityType, createEnhancedActivity } from '@/lib/activityModel';
import { 
  CategoryBadge, 
  CostLevelBadge, 
  TimeCommitmentBadge 
} from './CategoryBadge';
import EnhancedActivityCard from './EnhancedActivityCard';
import CategoryFilter from './CategoryFilter';
import { Button } from './ui/button';
import { 
  Grid3X3, 
  List, 
  LayoutGrid 
} from 'lucide-react';

// Sample activities for demonstration
const sampleActivities: EnhancedActivityType[] = [
  createEnhancedActivity({
    id: 1,
    title: "Jazz Night at Blue Note",
    description: "Experience live jazz music at the famous Blue Note venue with world-class musicians in an intimate setting.",
    category: "ENTERTAINMENT",
    costLevel: "MEDIUM",
    timeCommitment: "SHORT",
    location: "Blue Note Jazz Club, New York",
    date: "Fri, May 15",
    tags: [
      { name: "Music", color: "secondary" },
      { name: "Nightlife", color: "accent" },
      { name: "Jazz", color: "default" }
    ],
    attendees: 42
  }),
  createEnhancedActivity({
    id: 2,
    title: "Hiking at Runyon Canyon",
    description: "Enjoy breathtaking views of Los Angeles on this moderately challenging 3-mile loop trail.",
    category: "OUTDOOR",
    costLevel: "FREE",
    timeCommitment: "MEDIUM",
    location: "Runyon Canyon Park, Los Angeles",
    date: "Sat, May 16",
    tags: [
      { name: "Hiking", color: "secondary" },
      { name: "Nature", color: "accent" },
      { name: "Views", color: "default" }
    ],
    attendees: 15
  }),
  createEnhancedActivity({
    id: 3,
    title: "Wine Tasting Tour",
    description: "Explore the Napa Valley region with a guided tour of three premium wineries with tastings included.",
    category: "FOOD_DRINK",
    costLevel: "HIGH",
    timeCommitment: "LONG",
    location: "Napa Valley, California",
    date: "Sun, May 17",
    tags: [
      { name: "Wine", color: "secondary" },
      { name: "Tasting", color: "accent" },
      { name: "Tour", color: "default" }
    ],
    attendees: 28
  }),
  createEnhancedActivity({
    id: 4,
    title: "MoMA Contemporary Art Tour",
    description: "Guided tour of the Museum of Modern Art's contemporary collection with insights into artist techniques and history.",
    category: "CULTURE",
    costLevel: "MEDIUM",
    timeCommitment: "SHORT",
    location: "Museum of Modern Art, New York",
    date: "Wed, May 20",
    tags: [
      { name: "Art", color: "secondary" },
      { name: "Museum", color: "accent" },
      { name: "Tour", color: "default" }
    ],
    attendees: 22
  }),
  createEnhancedActivity({
    id: 5,
    title: "Yoga at Sunset Beach",
    description: "Relaxing yoga session on the beach at sunset. All experience levels welcome. Bring your own mat.",
    category: "RELAXING",
    costLevel: "LOW",
    timeCommitment: "SHORT",
    location: "Venice Beach, Los Angeles",
    date: "Thu, May 21",
    tags: [
      { name: "Yoga", color: "secondary" },
      { name: "Beach", color: "accent" },
      { name: "Wellness", color: "default" }
    ],
    attendees: 18
  }),
  createEnhancedActivity({
    id: 6,
    title: "Beach Volleyball Tournament",
    description: "Join or watch the annual beach volleyball tournament with teams from across the region competing.",
    category: "ACTIVE",
    costLevel: "FREE",
    timeCommitment: "LONG",
    location: "Manhattan Beach, Los Angeles",
    date: "Sat, May 23",
    tags: [
      { name: "Sports", color: "secondary" },
      { name: "Beach", color: "accent" },
      { name: "Competition", color: "default" }
    ],
    attendees: 96
  })
];

interface ActivityCategoriesShowcaseProps {
  onSaveActivity?: (activity: EnhancedActivityType) => void;
}

const ActivityCategoriesShowcase: React.FC<ActivityCategoriesShowcaseProps> = ({
  onSaveActivity
}) => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<{
    categories: CategoryType[];
    costs: CostLevelType[];
    times: TimeCommitmentType[];
  }>({
    categories: [],
    costs: [],
    times: []
  });

  // Filter activities based on selected filters
  const filteredActivities = sampleActivities.filter(activity => {
    const categoryMatch = filters.categories.length === 0 || filters.categories.includes(activity.category);
    const costMatch = filters.costs.length === 0 || filters.costs.includes(activity.costLevel);
    const timeMatch = filters.times.length === 0 || filters.times.includes(activity.timeCommitment);
    
    return categoryMatch && costMatch && timeMatch;
  });

  // Handle filter changes
  const handleFilterChange = (newFilters: {
    categories: CategoryType[];
    costs: CostLevelType[];
    times: TimeCommitmentType[];
  }) => {
    setFilters(newFilters);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Activity Categories</h1>
      
      {/* Category Icons Display */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Activity Types</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {Object.entries(activityCategories).map(([key, info]) => (
            <div key={key} className="flex flex-col items-center justify-center p-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
              <CategoryBadge category={key as CategoryType} size="lg" withLabel={false} />
              <span className="mt-2 text-sm text-center line-clamp-1">{info.label}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Cost and Time Badges Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <h2 className="text-xl font-semibold mb-4">Cost Levels</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(costLevels).map(([key, info]) => (
              <CostLevelBadge key={key} costLevel={key as CostLevelType} size="md" />
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4">Time Commitments</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(timeCommitments).map(([key, info]) => (
              <TimeCommitmentBadge key={key} timeCommitment={key as TimeCommitmentType} size="md" />
            ))}
          </div>
        </div>
      </div>
      
      {/* Activity Filtering and Display */}
      <div className="mt-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Sample Activities</h2>
          <div className="flex items-center gap-2">
            <Button
              variant={view === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('grid')}
              className="w-9 h-9 p-0"
            >
              <LayoutGrid size={18} />
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
              className="w-9 h-9 p-0"
            >
              <List size={18} />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <CategoryFilter onFilterChange={handleFilterChange} />
          </div>
          
          <div className="md:col-span-3">
            {view === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredActivities.map(activity => (
                  <EnhancedActivityCard
                    key={activity.id}
                    activity={activity}
                    onSave={() => onSaveActivity?.(activity)}
                    onViewDetails={() => console.log(`View details for ${activity.title}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredActivities.map(activity => (
                  <EnhancedActivityCard
                    key={activity.id}
                    activity={activity}
                    onSave={() => onSaveActivity?.(activity)}
                    onViewDetails={() => console.log(`View details for ${activity.title}`)}
                    variant="compact"
                    className="h-24"
                  />
                ))}
              </div>
            )}
            
            {filteredActivities.length === 0 && (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400">No activities match your selected filters.</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => setFilters({ categories: [], costs: [], times: [] })}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityCategoriesShowcase;