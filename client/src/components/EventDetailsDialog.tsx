import { ActivityType } from "@/pages/Dashboard";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, ExternalLink, MapPin, Music, Palette, Plus, User, Utensils } from "lucide-react";
import CalendarIntegration from "./CalendarIntegration";

interface EventDetailsDialogProps {
  event: ActivityType | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveActivity: (activity: ActivityType) => void;
}

export function EventDetailsDialog({
  event,
  isOpen,
  onOpenChange,
  onSaveActivity
}: EventDetailsDialogProps) {
  if (!event) return null;
  
  const getActivityIcon = () => {
    switch (event.icon) {
      case "music":
        return <Music className="h-8 w-8 text-primary" />;
      case "cocktail":
        return <Utensils className="h-8 w-8 text-secondary" />;
      case "art":
        return <Palette className="h-8 w-8 text-accent" />;
      default:
        return <Palette className="h-8 w-8 text-accent" />;
    }
  };

  const isExternalEvent = !!event.eventUrl;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-dark text-white border-gray-700 max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{event.title}</DialogTitle>
          <DialogDescription className="text-gray-400">
            {event.date}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-2">
          <div className="flex items-start gap-4">
            <div className={`rounded-lg p-3 ${event.iconBgClass} flex items-center justify-center`}>
              {getActivityIcon()}
            </div>
            <div className="flex-1">
              <div className="flex items-center text-gray-300 mb-2">
                <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                <span>{event.location}</span>
              </div>
              
              <div className="flex items-center text-gray-300 mb-3">
                <CalendarDays className="h-4 w-4 mr-2 text-gray-400" />
                <span>{event.date}</span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {event.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className={`text-xs px-2 py-1 rounded-full ${
                      tag.color === "secondary"
                        ? "bg-secondary/20 text-secondary"
                        : tag.color === "accent"
                        ? "bg-accent/20 text-accent"
                        : "bg-gray-700 text-gray-300"
                    }`}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
              
              <div className="flex items-center text-gray-400 text-sm">
                <User className="h-4 w-4 mr-1" />
                <span>{event.attendees} attending</span>
              </div>
            </div>
          </div>
          
          {isExternalEvent && (
            <div className="border border-gray-800 rounded-md p-4 bg-black bg-opacity-30">
              <h4 className="font-medium mb-2">Event Information</h4>
              <p className="text-sm text-gray-400 mb-3">
                This is an external event from a third-party source. Click the button below to visit the official event page for more details and ticket information.
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    if (event.eventUrl) {
                      window.open(event.eventUrl, '_blank');
                    }
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Visit Event Page
                </Button>
                
                <CalendarIntegration 
                  activity={event}
                  variant="button"
                  size="sm"
                />
              </div>
            </div>
          )}
          
          {/* Details and important information */}
          <div>
            <h4 className="text-md font-medium mb-2">Details</h4>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                <span>Doors open 30 minutes before start time</span>
              </div>
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-accent" />
                <span>Visit official event page for more details</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="sm:w-auto w-full"
          >
            Close
          </Button>
          <Button 
            onClick={() => {
              onSaveActivity(event);
              onOpenChange(false);
            }}
            className="sm:w-auto w-full gap-1"
          >
            <Plus className="h-4 w-4" />
            Add to Collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EventDetailsDialog;