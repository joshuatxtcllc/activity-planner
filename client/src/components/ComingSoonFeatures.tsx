import { CalendarDays, Users, Layers } from "lucide-react";

const ComingSoonFeatures = () => {
  return (
    <div className="mt-12 bg-dark-surface rounded-xl p-6 shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-light">Coming Soon</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 border border-dashed border-gray-600 rounded-lg">
          <div className="flex items-center mb-3">
            <Layers className="h-6 w-6 mr-2 text-secondary" />
            <h3 className="text-lg font-semibold text-secondary">Event Aggregation</h3>
          </div>
          <p className="text-gray-400 text-sm">
            Automatically collect events from local venues, concert halls, and underground scenes to keep your options fresh.
          </p>
        </div>
        
        <div className="p-4 border border-dashed border-gray-600 rounded-lg">
          <div className="flex items-center mb-3">
            <Users className="h-6 w-6 mr-2 text-primary" />
            <h3 className="text-lg font-semibold text-primary">Shared Planning</h3>
          </div>
          <p className="text-gray-400 text-sm">
            Collaborative planning with friends and partners. Vote on ideas, share suggestions, and coordinate schedules.
          </p>
        </div>
        
        <div className="p-4 border border-dashed border-gray-600 rounded-lg">
          <div className="flex items-center mb-3">
            <CalendarDays className="h-6 w-6 mr-2 text-accent" />
            <h3 className="text-lg font-semibold text-accent">Calendar Integration</h3>
          </div>
          <p className="text-gray-400 text-sm">
            Sync with Google Calendar, Apple Calendar and other platforms to manage all your activities in one place.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonFeatures;
