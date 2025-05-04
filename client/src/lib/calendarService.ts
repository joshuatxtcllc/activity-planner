import { ActivityType } from "@/pages/Dashboard";

export type CalendarServiceType = 'google' | 'apple' | 'outlook' | 'yahoo' | 'ical';

interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime?: Date;
  url?: string;
}

/**
 * Convert ActivityType to a standard CalendarEvent format
 */
export function activityToCalendarEvent(activity: ActivityType): CalendarEvent {
  // Parse the date string and create Date objects
  // Expected format: "Day, Month DD • H:MM AM/PM"
  // Example: "Sat, Aug 28 • 8:00 PM"
  const dateStr = activity.date;
  const currentYear = new Date().getFullYear();
  
  // Extract the date and time parts
  const dateMatch = dateStr.match(/([A-Za-z]+), ([A-Za-z]+) (\d+) • (\d+):(\d+) ([AP]M)/);
  
  if (!dateMatch) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  
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
  
  // Create start date and end date (default to 2 hours later)
  const startDate = new Date(currentYear, monthNum, parseInt(day, 10), hourNum, parseInt(minute, 10));
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
  
  // Create a description including tags
  const tags = activity.tags.map(tag => tag.name).join(', ');
  const description = `${activity.title}\nTags: ${tags}\n${activity.eventUrl ? `Event URL: ${activity.eventUrl}` : ''}`;
  
  return {
    title: activity.title,
    description,
    location: activity.location,
    startTime: startDate,
    endTime: endDate,
    url: activity.eventUrl
  };
}

/**
 * Generate calendar URL for Google Calendar
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const baseUrl = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDate(event.startTime)}/${formatDate(event.endTime || new Date(event.startTime.getTime() + 2 * 60 * 60 * 1000))}`,
    details: event.description || '',
    location: event.location || '',
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate calendar URL for Apple Calendar (iCal)
 */
export function generateAppleCalendarUrl(event: CalendarEvent): string {
  return generateICalUrl(event);
}

/**
 * Generate calendar URL for Outlook.com
 */
export function generateOutlookCalendarUrl(event: CalendarEvent): string {
  const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
  const params = new URLSearchParams({
    subject: event.title,
    startdt: event.startTime.toISOString(),
    enddt: (event.endTime || new Date(event.startTime.getTime() + 2 * 60 * 60 * 1000)).toISOString(),
    body: event.description || '',
    location: event.location || '',
    path: '/calendar/action/compose',
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate calendar URL for Yahoo Calendar
 */
export function generateYahooCalendarUrl(event: CalendarEvent): string {
  const baseUrl = 'https://calendar.yahoo.com/';
  const params = new URLSearchParams({
    title: event.title,
    st: Math.floor(event.startTime.getTime() / 1000).toString(),
    et: Math.floor((event.endTime || new Date(event.startTime.getTime() + 2 * 60 * 60 * 1000)).getTime() / 1000).toString(),
    desc: event.description || '',
    in_loc: event.location || '',
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate iCalendar file URL for download
 */
export function generateICalUrl(event: CalendarEvent): string {
  // Create iCalendar content
  const icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `SUMMARY:${event.title}`,
    `DTSTART:${formatDateICS(event.startTime)}`,
    `DTEND:${formatDateICS(event.endTime || new Date(event.startTime.getTime() + 2 * 60 * 60 * 1000))}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location || ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  
  // Create blob and data URL
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  return URL.createObjectURL(blob);
}

/**
 * Format date for Google Calendar URL (YYYYMMDDTHHMMSSZ)
 */
function formatDate(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d+/g, '');
}

/**
 * Format date for iCalendar (YYYYMMDDTHHMMSSZ)
 */
function formatDateICS(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d+/g, '');
}

/**
 * Add activity to the specified calendar service
 */
export function addToCalendar(activity: ActivityType, service: CalendarServiceType): void {
  try {
    const event = activityToCalendarEvent(activity);
    let url = '';
    
    switch (service) {
      case 'google':
        url = generateGoogleCalendarUrl(event);
        break;
      case 'apple':
        url = generateAppleCalendarUrl(event);
        break;
      case 'outlook':
        url = generateOutlookCalendarUrl(event);
        break;
      case 'yahoo':
        url = generateYahooCalendarUrl(event);
        break;
      case 'ical':
        url = generateICalUrl(event);
        // For iCal, we need to trigger a download
        const link = document.createElement('a');
        link.href = url;
        link.download = `${activity.title.replace(/\s+/g, '_')}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Revoke the object URL to free memory
        setTimeout(() => URL.revokeObjectURL(url), 100);
        return;
      default:
        throw new Error(`Unsupported calendar service: ${service}`);
    }
    
    // Open the calendar URL in a new window/tab
    window.open(url, '_blank');
  } catch (error) {
    console.error('Error adding to calendar:', error);
    throw error;
  }
}