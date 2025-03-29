import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ActivityCard from "@/components/ActivityCard";
import ComingSoonFeatures from "@/components/ComingSoonFeatures";
import NewIdeaDialog from "@/components/NewIdeaDialog";
import SpinningWheel from "@/components/SpinningWheel";
import ActivityAggregator from "@/components/ActivityAggregator";

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
}

const Dashboard = () => {
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<string>("All Activities");
  const [activities, setActivities] = useState<ActivityType[]>([
    {
      id: 1,
      title: "Burlesque Night",
      isPrivate: true,
      isFeatured: true,
      date: "Sat, Aug 28 • 8:00 PM",
      location: "Secret Speakeasy",
      tags: [
        { name: "Nightlife", color: "secondary" },
        { name: "Edgy", color: "accent" },
        { name: "Adults Only", color: "default" },
      ],
      attendees: 5,
      icon: "music",
      iconBgClass: "bg-primary bg-opacity-30",
    },
    {
      id: 2,
      title: "Cocktail Masterclass",
      isPrivate: false,
      date: "Fri, Sep 3 • 7:30 PM",
      location: "Velvet Lounge Downtown",
      tags: [
        { name: "Class", color: "secondary" },
        { name: "Cocktails", color: "default" },
        { name: "Classy", color: "accent" },
      ],
      attendees: 3,
      icon: "cocktail",
      iconBgClass: "bg-secondary bg-opacity-30",
    },
    {
      id: 3,
      title: "Underground Art Show",
      isPrivate: false,
      date: "Sun, Sep 12 • 6:00 PM",
      location: "The Factory Warehouse",
      tags: [
        { name: "Art", color: "secondary" },
        { name: "Edgy", color: "accent" },
        { name: "Alternative", color: "default" },
      ],
      attendees: 7,
      icon: "art",
      iconBgClass: "bg-accent bg-opacity-30",
    },
  ]);

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

  const handleAddActivity = (activity: any) => {
    const newActivity: ActivityType = {
      id: activities.length + 1,
      title: activity.title,
      isPrivate: activity.isPrivate,
      isFeatured: activity.isFeatured,
      date: activity.date,
      location: activity.location,
      tags: activity.tags,
      attendees: 0, // Start with 0 attendees for new activities
      icon: activity.icon,
      iconBgClass: activity.iconBgClass,
    };
    
    setActivities([...activities, newActivity]);
  };

  const handleActivitySelected = (activity: ActivityType) => {
    // Here we can do something when an activity is selected from the wheel
    toast({
      title: "Activity Selected!",
      description: `Why not try "${activity.title}" today?`,
    });
  };

  return (
    <section id="dashboard" className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Welcome to Your Activity Planner</h1>
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
        <SpinningWheel 
          activities={activities} 
          onActivitySelected={handleActivitySelected} 
        />
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
        
        <div className="lg:col-span-1">
          <h2 className="text-2xl font-bold mb-6">External Activities</h2>
          <ActivityAggregator onSaveActivity={handleAddActivity} />
        </div>
      </div>

      <ComingSoonFeatures />
    </section>
  );
};

export default Dashboard;
