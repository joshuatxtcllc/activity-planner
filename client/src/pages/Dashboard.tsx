import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ActivityCard from "@/components/ActivityCard";
import ComingSoonFeatures from "@/components/ComingSoonFeatures";
import NewIdeaDialog from "@/components/NewIdeaDialog";
import SpinningWheel from "@/components/SpinningWheel";
import ActivityAggregator from "@/components/ActivityAggregator";
import LocalEventsExplorer from "@/components/LocalEventsExplorer";
import { GoogleEventsExplorer } from "@/components/GoogleEventsExplorer";
import CalendarWidget from "@/components/CalendarWidget";
import CalendarIntegration from "@/components/CalendarIntegration";

export interface ActivityType {
  id: number;
  title: string;
  isPrivate: boolean;
  isFeatured?: boolean;
  date: string;
  location: string;
  tags: Array<{
    name: string;
    color: "secondary" | "accent" | "default";
  }>;
  attendees: number;
  icon: "music" | "cocktail" | "art";
  iconBgClass: string;
  eventUrl?: string;
  venueName?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

const Dashboard = () => {
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<string>("All Activities");
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch activities from the API
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/activities');
        
        if (!response.ok) {
          throw new Error('Failed to fetch activities');
        }
        
        const data = await response.json();
        setActivities(data);
      } catch (error) {
        console.error('Error fetching activities:', error);
        toast({
          title: "Error",
          description: "Failed to load activities. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, [toast]);

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    toast({
      title: "Filter Applied",
      description: `Filtering activities by: ${filter}`,
    });
  };

  const handleDetailsClick = (activityTitle: string) => {
    toast({
      title: "Activity Details",
      description: `You'll see detailed information about "${activityTitle}" here. This will include full description, RSVP options, and comments.`,
    });
  };

  const handleAddActivity = async (activity: any) => {
    try {
      // Prepare the activity data
      const activityData = {
        title: activity.title,
        description: activity.description || "",
        category: activity.category || "ENTERTAINMENT",
        costLevel: activity.costLevel || "MEDIUM",
        timeCommitment: activity.timeCommitment || "MEDIUM",
        location: activity.location,
        isPrivate: activity.isPrivate || false,
        isFeatured: activity.isFeatured || false,
        seasonality: activity.seasonality || ["ALL_YEAR"],
        tags: activity.tags || [],
        attendees: 0, // Start with 0 attendees for new activities
        icon: activity.icon || "music",
        iconBgClass: activity.iconBgClass || "bg-primary/10",
        date: activity.date || null
      };
      
      // Send the activity data to the server
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save activity');
      }
      
      // Get the new activity from the response
      const newActivity = await response.json();
      
      // Update the state with the new activity
      setActivities(prev => [...prev, newActivity]);
      
      toast({
        title: "Success",
        description: `Activity "${activity.title}" has been saved.`,
      });
    } catch (error) {
      console.error('Error saving activity:', error);
      toast({
        title: "Error",
        description: "Failed to save activity. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleActivitySelected = (activity: ActivityType) => {
    // Here we can do something when an activity is selected from the wheel
    toast({
      title: "Activity Selected!",
      description: `Why not try "${activity.title}" today?`,
    });
  };
  
  // For the event search tabs
  const [activeSearchTab, setActiveSearchTab] = useState<'google' | 'local'>('google');
  
  const handleTabSwitch = useCallback((tab: 'google' | 'local') => {
    setActiveSearchTab(tab);
  }, []);

  return (
    <section id="dashboard" className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Welcome to Edge Class Entertainment</h1>
        <NewIdeaDialog onAddActivity={handleAddActivity} />
      </div>

      <div className="mb-8">
        <div className="flex flex-wrap gap-2 md:gap-4">
          {["All Activities", "Upcoming", "This Month", "With Friends", "Date Night"].map((filter) => (
            <button
              key={filter}
              onClick={() => handleFilterClick(filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === filter
                  ? "bg-accent text-white"
                  : "bg-dark-surface hover:bg-opacity-80 text-light"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Spinning Wheel */}
      <div className="my-10 py-6 px-4 bg-dark-surface rounded-xl border border-gray-800">
        {activities.length > 0 ? (
          <SpinningWheel 
            activities={activities.map(act => ({
              ...act,
              id: typeof act.id === 'string' ? parseInt(act.id) : act.id,
              category: act.category || 'ENTERTAINMENT',
              costLevel: act.costLevel || 'MEDIUM',
              timeCommitment: act.timeCommitment || 'SHORT',
              description: act.description || '',
              seasonality: act.seasonality || ['ALL_YEAR'],
              dateAdded: act.dateAdded || new Date(),
              timesSelected: act.timesSelected || 0
            }))} 
            onActivitySelected={handleActivitySelected} 
          />
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">No activities available. Add your first activity!</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6">Your Activities</h2>
          <div id="activity-list" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activities.map((activity) => (
              <div key={activity.id} onClick={() => handleDetailsClick(activity.title)}>
                <ActivityCard {...activity} />
              </div>
            ))}
          </div>
        </div>
        
        <div className="lg:col-span-1 space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-6">Find Events</h2>
            <div className="bg-dark-surface border border-gray-800 rounded-xl p-4">
              <div>
                <div className="border-b border-gray-800 mb-4">
                  <ul className="flex -mb-px text-sm font-medium">
                    <li className="mr-2">
                      <button 
                        onClick={() => handleTabSwitch('google')}
                        className={`inline-block p-4 border-b-2 ${
                          activeSearchTab === 'google' 
                            ? 'border-accent text-accent' 
                            : 'border-transparent hover:text-gray-300 hover:border-gray-700'
                        } rounded-t-lg`}
                      >
                        Google Search
                      </button>
                    </li>
                    <li className="mr-2">
                      <button 
                        onClick={() => handleTabSwitch('local')}
                        className={`inline-block p-4 border-b-2 ${
                          activeSearchTab === 'local' 
                            ? 'border-accent text-accent' 
                            : 'border-transparent hover:text-gray-300 hover:border-gray-700'
                        } rounded-t-lg`}
                      >
                        Local Events
                      </button>
                    </li>
                  </ul>
                </div>
                <div className="tab-content">
                  {activeSearchTab === 'google' && (
                    <div className="tab-pane">
                      <GoogleEventsExplorer onSaveActivity={handleAddActivity} />
                    </div>
                  )}
                  {activeSearchTab === 'local' && (
                    <div className="tab-pane">
                      <LocalEventsExplorer onSaveActivity={handleAddActivity} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-6">Curated Activities</h2>
            <ActivityAggregator onSaveActivity={handleAddActivity} />
          </div>
          
          <div>
            <CalendarWidget activities={activities} maxDisplay={3} />
          </div>
        </div>
      </div>

      <ComingSoonFeatures />
    </section>
  );
};

export default Dashboard;
