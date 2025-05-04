import { useState, useMemo } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, isSameDay, parse } from "date-fns";
import { ChevronLeft, ChevronRight, PlusCircle, CalendarIcon } from "lucide-react";
import { ActivityType } from "@/pages/Dashboard";
import { Button } from "@/components/ui/button";
import CalendarIntegration from "@/components/CalendarIntegration";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const icons: Record<string, JSX.Element> = {
  music: <div className="h-3 w-3 rounded-full bg-primary"></div>,
  cocktail: <div className="h-3 w-3 rounded-full bg-secondary"></div>,
  art: <div className="h-3 w-3 rounded-full bg-accent"></div>,
};

const Calendar = () => {
  // Replace this with actual data fetching logic
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
        { name: "Trendy", color: "accent" },
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
        { name: "Sophisticated", color: "accent" },
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
        { name: "Avant-garde", color: "accent" },
        { name: "Alternative", color: "default" },
      ],
      attendees: 7,
      icon: "art",
      iconBgClass: "bg-accent bg-opacity-30",
    },
  ]);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<ActivityType | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

  // Get days in current month
  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  // Get activities for a specific day
  const getActivitiesForDay = (day: Date) => {
    return activities.filter(activity => {
      try {
        // Parse the activity date string
        // Expected format: "Day, Month DD • H:MM AM/PM"
        // Example: "Sat, Aug 28 • 8:00 PM"
        const dateMatch = activity.date.match(/([A-Za-z]+), ([A-Za-z]+) (\d+)/);
        if (!dateMatch) return false;
        
        const [, , month, dayOfMonth] = dateMatch;
        
        // Current year as fallback
        const year = currentMonth.getFullYear();
        
        // Parse the date without time
        const activityDate = parse(`${dayOfMonth} ${month} ${year}`, 'd MMM yyyy', new Date());
        
        return isSameDay(activityDate, day);
      } catch (error) {
        console.error("Error parsing date:", error);
        return false;
      }
    });
  };

  // Navigate to previous month
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Handle day selection
  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
  };

  // Handle event click
  const handleEventClick = (event: ActivityType) => {
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };

  // Render the day cell with events
  const renderDay = (day: Date) => {
    const dayActivities = getActivitiesForDay(day);
    const isCurrentMonth = isSameMonth(day, currentMonth);
    const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;

    return (
      <div
        key={day.toString()}
        className={`min-h-[100px] p-1 border border-gray-800 ${
          !isCurrentMonth ? 'bg-dark-surface bg-opacity-30 text-gray-500' : ''
        } ${isToday(day) ? 'border-accent' : ''} ${
          isSelected ? 'bg-dark-surface border-primary' : ''
        }`}
        onClick={() => handleDayClick(day)}
      >
        <div className="text-right mb-1">
          <span
            className={`text-sm inline-block w-6 h-6 rounded-full ${
              isToday(day)
                ? 'bg-accent text-white font-medium flex items-center justify-center'
                : ''
            }`}
          >
            {day.getDate()}
          </span>
        </div>
        <div className="space-y-1">
          {dayActivities.map((activity) => (
            <div
              key={activity.id}
              className="text-xs p-1 rounded bg-opacity-20 cursor-pointer truncate hover:bg-opacity-30 transition-colors"
              style={{ backgroundColor: `var(--${activity.icon === 'music' ? 'primary' : activity.icon === 'cocktail' ? 'secondary' : 'accent'}-light)` }}
              onClick={(e) => {
                e.stopPropagation();
                handleEventClick(activity);
              }}
            >
              <div className="flex items-center gap-1">
                {icons[activity.icon]}
                <span className="truncate">{activity.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render selected day events
  const renderSelectedDayEvents = () => {
    if (!selectedDay) return null;

    const dayActivities = getActivitiesForDay(selectedDay);

    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">
            {format(selectedDay, "MMMM d, yyyy")}
          </h3>
          <Button variant="link" className="text-accent">
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Activity
          </Button>
        </div>

        {dayActivities.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No activities scheduled for this day</p>
        ) : (
          <div className="space-y-3">
            {dayActivities.map((activity) => (
              <Card 
                key={activity.id} 
                className="bg-dark-surface border-gray-800 overflow-hidden hover:border-gray-700 transition-colors cursor-pointer"
                onClick={() => handleEventClick(activity)}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{activity.title}</CardTitle>
                      <CardDescription className="text-xs text-gray-400">
                        {activity.date} • {activity.location}
                      </CardDescription>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex -space-x-2">
                            {[...Array(Math.min(activity.attendees, 3))].map((_, i) => (
                              <div 
                                key={i} 
                                className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs border border-dark-surface"
                              >
                                {String.fromCharCode(65 + i)}
                              </div>
                            ))}
                            {activity.attendees > 3 && (
                              <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs border border-dark-surface">
                                +{activity.attendees - 3}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{activity.attendees} attendees</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="flex gap-1 mt-2">
                    {activity.tags.map((tag, i) => (
                      <span 
                        key={i} 
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          tag.color === 'secondary' 
                            ? 'bg-secondary bg-opacity-20 text-secondary' 
                            : tag.color === 'accent'
                            ? 'bg-accent bg-opacity-20 text-accent'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="p-2 px-4 border-t border-gray-800 bg-black bg-opacity-20 flex justify-between">
                  <CalendarIntegration activity={activity} variant="icon" size="sm" />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-gray-400 hover:text-accent"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(activity);
                    }}
                  >
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render the event details dialog
  const renderEventDetailsDialog = () => {
    if (!selectedEvent) return null;

    return (
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="bg-dark text-light border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedEvent.title}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedEvent.date} • {selectedEvent.location}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {selectedEvent.tags.map((tag, i) => (
                  <span 
                    key={i} 
                    className={`text-sm px-2 py-0.5 rounded-full ${
                      tag.color === 'secondary' 
                        ? 'bg-secondary bg-opacity-20 text-secondary' 
                        : tag.color === 'accent'
                        ? 'bg-accent bg-opacity-20 text-accent'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1 text-gray-400 text-sm">
                <span>{selectedEvent.attendees} attending</span>
              </div>
            </div>
            
            <div className="border border-gray-800 rounded-lg p-4 bg-black bg-opacity-20">
              <h4 className="text-sm font-medium mb-2">About this activity</h4>
              <p className="text-gray-400 text-sm">
                {selectedEvent.title} at {selectedEvent.location}. 
                This is a{selectedEvent.isPrivate ? ' private' : ' public'} event
                {selectedEvent.isFeatured ? ' and is featured on our platform' : ''}.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-2 justify-end">
              <Button variant="outline" className="border-gray-700">
                View on Map
              </Button>
              <CalendarIntegration activity={selectedEvent} variant="button" size="md" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Calendar</h1>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="border-gray-700"
            onClick={prevMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-700"
            onClick={nextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-7 gap-px text-center">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="bg-dark-surface py-2 text-sm font-semibold"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px">
        {daysInMonth.map((day) => renderDay(day))}
      </div>

      {renderSelectedDayEvents()}
      {renderEventDetailsDialog()}
    </section>
  );
};

export default Calendar;