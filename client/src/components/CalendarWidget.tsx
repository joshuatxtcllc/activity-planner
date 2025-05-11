import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { ActivityType } from "@/pages/Dashboard";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth,
  startOfWeek,
  endOfWeek, 
  eachDayOfInterval, 
  isToday, 
  isSameMonth,
  parse
} from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CalendarWidgetProps {
  activities: ActivityType[];
  maxDisplay?: number;
}

export default function CalendarWidget({ activities, maxDisplay = 3 }: CalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<ActivityType[]>([]);

  // Generate calendar days for current month view
  useEffect(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    setCalendarDays(days);
  }, [currentMonth]);

  // Filter activities to show upcoming ones
  useEffect(() => {
    // Parse activity dates and sort by date
    const sortedActivities = [...activities]
      .map(activity => {
        // Expected format: "Day, Month DD • H:MM AM/PM"
        // Example: "Sat, Aug 28 • 8:00 PM"
        try {
          const dateMatch = activity.date.match(/([A-Za-z]+), ([A-Za-z]+) (\d+) • (\d+):(\d+) ([AP]M)/);
          if (!dateMatch) return { ...activity, parsedDate: new Date() };

          const [, , month, day, hour, minute, ampm] = dateMatch;

          // Convert month name to month number (0-11)
          const months: Record<string, number> = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
          };

          const monthNum = months[month];

          // Parse hour (12-hour format to 24-hour format)
          let hourNum = parseInt(hour, 10);
          if (ampm === 'PM' && hourNum < 12) {
            hourNum += 12;
          } else if (ampm === 'AM' && hourNum === 12) {
            hourNum = 0;
          }

          // Current year as fallback
          const year = new Date().getFullYear();

          // Create the date
          const parsedDate = new Date(year, monthNum, parseInt(day, 10), hourNum, parseInt(minute, 10));

          return { ...activity, parsedDate };
        } catch (error) {
          console.error("Error parsing date:", error);
          return { ...activity, parsedDate: new Date() };
        }
      })
      .sort((a, b) => {
        return a.parsedDate.getTime() - b.parsedDate.getTime();
      })
      .filter(activity => activity.parsedDate >= new Date()) // Only future activities
      .slice(0, maxDisplay);

    setUpcomingActivities(sortedActivities);
  }, [activities, maxDisplay]);

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Check if a day has any activities
  const hasActivities = (day: Date) => {
    return activities.some(activity => {
      try {
        // If activity.date is null or undefined, return false
        if (!activity.date) return false;
        
        // Parse the activity date string
        const dateMatch = activity.date.match(/([A-Za-z]+), ([A-Za-z]+) (\d+)/);
        if (!dateMatch) return false;

        const [, , month, dayOfMonth] = dateMatch;

        // Current year as fallback
        const year = currentMonth.getFullYear();

        // Parse the date without time
        const activityDate = parse(`${dayOfMonth} ${month} ${year}`, 'd MMM yyyy', new Date());

        return (
          activityDate.getDate() === day.getDate() &&
          activityDate.getMonth() === day.getMonth() &&
          activityDate.getFullYear() === day.getFullYear()
        );
      } catch (error) {
        return false;
      }
    });
  };

  return (
    <Card className="bg-dark-surface border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-accent" />
            <span>Calendar</span>
          </CardTitle>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400"
              onClick={prevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{format(currentMonth, 'MMM yyyy')}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400"
              onClick={nextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-2">
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-xs text-gray-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarDays.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const hasDayActivities = hasActivities(day);

            return (
              <div
                key={i}
                className={`
                  text-xs h-7 w-7 rounded-full flex items-center justify-center mx-auto
                  ${!isCurrentMonth ? 'text-gray-600' : ''}
                  ${isToday(day) ? 'bg-accent text-white' : ''}
                  ${hasDayActivities && !isToday(day) ? 'border border-accent text-accent' : ''}
                  ${isCurrentMonth && !isToday(day) && !hasDayActivities ? 'hover:bg-dark hover:text-gray-300 cursor-pointer' : ''}
                `}
              >
                {day.getDate()}
              </div>
            );
          })}
        </div>
      </CardContent>

      <div className="border-t border-gray-800"></div>

      <div className="p-3">
        <h4 className="text-sm font-medium mb-2">Upcoming Activities</h4>
        {upcomingActivities.length === 0 ? (
          <p className="text-xs text-gray-400">No upcoming activities</p>
        ) : (
          <div className="space-y-2">
            {upcomingActivities.map((activity) => (
              <div 
                key={activity.id}
                className="flex items-center gap-2 p-2 rounded hover:bg-black hover:bg-opacity-30 cursor-pointer"
              >
                <div 
                  className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    activity.icon === 'music' 
                      ? 'bg-primary bg-opacity-20' 
                      : activity.icon === 'cocktail'
                      ? 'bg-secondary bg-opacity-20'
                      : 'bg-accent bg-opacity-20'
                  }`}
                >
                  <span className="text-xs">
                    {activity.date ? activity.date.split(', ')[1]?.split(' ')[1] || "" : ""}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{activity.title}</p>
                  <p className="text-xs text-gray-400 truncate">{activity.date || ""}</p> {/* Added null check */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CardFooter className="pt-2 flex justify-center border-t border-gray-800">
        <Link href="/calendar">
          <Button variant="link" className="text-accent text-sm">
            View Full Calendar
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}