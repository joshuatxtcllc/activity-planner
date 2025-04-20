import { ActivityType } from "@/pages/Dashboard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarDays, 
  MapPin, 
  Users, 
  Music, 
  Palette, 
  Utensils,
  Clock,
  ExternalLink,
  Plus,
  Ticket,
  Navigation
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${event.iconBgClass}`}>
              {getActivityIcon()}
            </div>
            <div>
              <DialogTitle className="text-xl">{event.title}</DialogTitle>
              <DialogDescription>
                <div className="flex gap-2 flex-wrap mt-2">
                  {event.tags.map((tag, i) => (
                    <Badge 
                      key={i} 
                      variant={tag.color === "accent" ? "destructive" : tag.color === "secondary" ? "secondary" : "outline"}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                  {event.isFeatured && <Badge variant="secondary">Featured</Badge>}
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-2 text-gray-400">
            <CalendarDays className="h-5 w-5 text-accent" />
            <span>{event.date}</span>
          </div>
          
          <div className="flex items-start gap-2 text-gray-400">
            <MapPin className="h-5 w-5 min-w-[20px] text-accent" />
            <span>{event.location}</span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-400">
            <Users className="h-5 w-5 text-accent" />
            <span>{event.attendees} {event.attendees === 1 ? 'person' : 'people'} interested</span>
          </div>

          {/* Add a placeholder for event description */}
          <div className="mt-2">
            <h4 className="text-md font-medium mb-2">About this event</h4>
            <p className="text-gray-400 text-sm">
              This is an {event.isPrivate ? 'private' : 'public'} event featuring {event.tags.map(t => t.name).join(', ')}. 
              Join others in experiencing this unique opportunity in {event.location.split(',')[0]}.
            </p>
          </div>

          <Separator className="my-2" />

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

        {/* Ticket and Directions buttons */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {event.eventUrl && (
            <Button
              onClick={() => window.open(event.eventUrl, '_blank')}
              className="w-full gap-1 bg-gradient-to-r from-primary to-primary-600"
            >
              <Ticket className="h-4 w-4" />
              Purchase Tickets
            </Button>
          )}
          
          {event.coordinates && (
            <Button
              onClick={() => {
                const { latitude, longitude } = event.coordinates!;
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank');
              }}
              variant="secondary"
              className="w-full gap-1"
            >
              <Navigation className="h-4 w-4" />
              Get Directions
            </Button>
          )}
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