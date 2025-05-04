import { useState } from "react";
import { CalendarIcon, ArrowRight, Calendar, X, Apple, Mail } from "lucide-react";
import { SiGooglecalendar } from "react-icons/si";
import { ActivityType } from "@/pages/Dashboard";
import { addToCalendar, CalendarServiceType } from "@/lib/calendarService";
import { toast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface CalendarIntegrationProps {
  activity: ActivityType;
  variant?: "button" | "icon";
  size?: "sm" | "md" | "lg";
}

interface CalendarOption {
  id: CalendarServiceType;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const calendarOptions: CalendarOption[] = [
  {
    id: "google",
    name: "Google Calendar",
    icon: <SiGooglecalendar className="h-6 w-6 text-[#4285F4]" />,
    description: "Add this event to your Google Calendar"
  },
  {
    id: "apple",
    name: "Apple Calendar",
    icon: <Apple className="h-6 w-6 text-[#FF3B30]" />,
    description: "Download an .ics file for Apple Calendar"
  },
  {
    id: "outlook",
    name: "Outlook Calendar",
    icon: <Mail className="h-6 w-6 text-[#0078D4]" />,
    description: "Add this event to your Outlook Calendar"
  },
  {
    id: "yahoo",
    name: "Yahoo Calendar",
    icon: <Mail className="h-6 w-6 text-[#5F01D1]" />,
    description: "Add this event to your Yahoo Calendar"
  },
  {
    id: "ical",
    name: "iCalendar File",
    icon: <Calendar className="h-6 w-6 text-primary" />,
    description: "Download an .ics file compatible with most calendar apps"
  }
];

export default function CalendarIntegration({ 
  activity, 
  variant = "button",
  size = "md"
}: CalendarIntegrationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  const handleAddToCalendar = (calendarType: CalendarServiceType) => {
    try {
      addToCalendar(activity, calendarType);
      toast({
        title: "Added to Calendar",
        description: `"${activity.title}" has been added to your ${
          calendarOptions.find(option => option.id === calendarType)?.name
        }`,
      });
      setIsOpen(false);
      setQuickMenuOpen(false);
    } catch (error) {
      console.error("Error adding to calendar:", error);
      toast({
        title: "Error Adding to Calendar",
        description: "There was a problem adding this event to your calendar. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Style classes based on size prop
  const buttonSizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-2",
    lg: "text-base px-4 py-2"
  };
  
  const iconSizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };

  return (
    <>
      {variant === "button" ? (
        <Popover open={quickMenuOpen} onOpenChange={setQuickMenuOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className={`${buttonSizeClasses[size]} border-gray-700 hover:bg-accent hover:text-white flex items-center gap-1`}
            >
              <CalendarIcon className={iconSizeClasses[size]} />
              <span>Add to Calendar</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 bg-dark-surface border-gray-700">
            <div className="grid gap-1">
              {calendarOptions.slice(0, 3).map((option) => (
                <Button
                  key={option.id}
                  variant="ghost"
                  className="justify-start p-2 hover:bg-gray-800"
                  onClick={() => handleAddToCalendar(option.id)}
                >
                  <div className="flex items-center gap-2">
                    {option.icon}
                    <span>{option.name}</span>
                  </div>
                </Button>
              ))}
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="justify-start p-2 hover:bg-gray-800 text-accent"
                    onClick={() => setQuickMenuOpen(false)}
                  >
                    <div className="flex items-center gap-2">
                      <span>More options</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-dark text-light border-gray-700 max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add to Calendar</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Choose where you want to add this activity.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    {calendarOptions.map((option) => (
                      <Button
                        key={option.id}
                        variant="outline"
                        className="justify-start p-4 border-gray-700 hover:bg-gray-800 hover:border-accent"
                        onClick={() => handleAddToCalendar(option.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div>
                            {option.icon}
                          </div>
                          <div className="text-left">
                            <div className="font-medium">{option.name}</div>
                            <div className="text-xs text-gray-400">{option.description}</div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button 
              className={`text-gray-400 hover:text-accent transition-colors duration-200 focus:outline-none`}
              aria-label="Add to calendar"
            >
              <CalendarIcon className={iconSizeClasses[size]} />
            </button>
          </DialogTrigger>
          <DialogContent className="bg-dark text-light border-gray-700 max-w-md">
            <DialogHeader>
              <DialogTitle>Add to Calendar</DialogTitle>
              <DialogDescription className="text-gray-400">
                Choose where you want to add "{activity.title}".
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {calendarOptions.map((option) => (
                <Button
                  key={option.id}
                  variant="outline"
                  className="justify-start p-4 border-gray-700 hover:bg-gray-800 hover:border-accent"
                  onClick={() => handleAddToCalendar(option.id)}
                >
                  <div className="flex items-start gap-3">
                    <div>
                      {option.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{option.name}</div>
                      <div className="text-xs text-gray-400">{option.description}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}