import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ActivityCard from "@/components/ActivityCard";
import ComingSoonFeatures from "@/components/ComingSoonFeatures";

const Dashboard = () => {
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<string>("All Activities");

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    toast({
      title: "Filter Applied",
      description: `Filtering activities by: ${filter}`,
    });
  };

  const handleNewIdea = () => {
    toast({
      title: "Coming Soon",
      description: "This feature will allow users to create new activity ideas. Coming soon!",
    });
  };

  const handleDetailsClick = (activityTitle: string) => {
    toast({
      title: "Activity Details",
      description: `You'll see detailed information about "${activityTitle}" here. This will include full description, RSVP options, and comments.`,
    });
  };

  const activities = [
    {
      id: 1,
      title: "Burlesque Night",
      isPrivate: true,
      isFeatured: true,
      date: "Sat, Aug 28 • 8:00 PM",
      location: "Secret Speakeasy",
      tags: [
        { name: "Nightlife", color: "secondary" as const },
        { name: "Edgy", color: "accent" as const },
        { name: "Adults Only", color: "default" as const },
      ],
      attendees: 5,
      icon: "music" as const,
      iconBgClass: "bg-primary bg-opacity-30",
    },
    {
      id: 2,
      title: "Cocktail Masterclass",
      isPrivate: false,
      date: "Fri, Sep 3 • 7:30 PM",
      location: "Velvet Lounge Downtown",
      tags: [
        { name: "Class", color: "secondary" as const },
        { name: "Cocktails", color: "default" as const },
        { name: "Classy", color: "accent" as const },
      ],
      attendees: 3,
      icon: "cocktail" as const,
      iconBgClass: "bg-secondary bg-opacity-30",
    },
    {
      id: 3,
      title: "Underground Art Show",
      isPrivate: false,
      date: "Sun, Sep 12 • 6:00 PM",
      location: "The Factory Warehouse",
      tags: [
        { name: "Art", color: "secondary" as const },
        { name: "Edgy", color: "accent" as const },
        { name: "Alternative", color: "default" as const },
      ],
      attendees: 7,
      icon: "art" as const,
      iconBgClass: "bg-accent bg-opacity-30",
    },
  ];

  return (
    <section id="dashboard" className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Welcome to Your Activity Planner</h1>
        <Button 
          id="new-idea" 
          onClick={handleNewIdea}
          className="bg-accent hover:bg-opacity-80 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Idea
        </Button>
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

      <div id="activity-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activities.map((activity) => (
          <div key={activity.id} onClick={() => handleDetailsClick(activity.title)}>
            <ActivityCard {...activity} />
          </div>
        ))}
      </div>

      <ComingSoonFeatures />
    </section>
  );
};

export default Dashboard;
