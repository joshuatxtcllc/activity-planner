/**
 * Date utility functions for event handling
 */

/**
 * Get the Friday of the current or upcoming weekend
 *
 * Logic:
 * - If today is Friday, Saturday, or Sunday: return the most recent Friday (this weekend)
 * - If today is Monday-Thursday: return the next Friday (upcoming weekend)
 *
 * This ensures that weekend events are always shown from Friday through Sunday
 * of the current weekend, not skipping ahead when it's already the weekend.
 *
 * @param from - The date to calculate from (defaults to now)
 * @returns The Friday at midnight (00:00:00)
 */
export function getNextFriday(from: Date = new Date()): Date {
  const result = new Date(from);
  const dayOfWeek = result.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  if (dayOfWeek === 5) {
    // It's Friday - use today
    result.setHours(0, 0, 0, 0);
    return result;
  } else if (dayOfWeek === 6) {
    // It's Saturday - go back 1 day to Friday
    result.setDate(result.getDate() - 1);
    result.setHours(0, 0, 0, 0);
    return result;
  } else if (dayOfWeek === 0) {
    // It's Sunday - go back 2 days to Friday
    result.setDate(result.getDate() - 2);
    result.setHours(0, 0, 0, 0);
    return result;
  } else {
    // It's Monday (1) through Thursday (4) - get next Friday
    const daysUntilFriday = 5 - dayOfWeek;
    result.setDate(result.getDate() + daysUntilFriday);
    result.setHours(0, 0, 0, 0);
    return result;
  }
}

/**
 * Get the Sunday of the current or upcoming weekend
 *
 * @param friday - The Friday of the weekend
 * @returns The Sunday at 23:59:59
 */
export function getWeekendSunday(friday: Date): Date {
  const sunday = new Date(friday);
  sunday.setDate(sunday.getDate() + 2); // Friday + 2 days = Sunday
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

/**
 * Get date range for upcoming weeks
 *
 * @param weeksAhead - Number of weeks to look ahead (default: 4)
 * @returns Object with startDate (today or this Friday) and endDate
 */
export function getUpcomingWeeksRange(weeksAhead: number = 4): { startDate: Date; endDate: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + (weeksAhead * 7));
  endDate.setHours(23, 59, 59, 999);

  return { startDate: today, endDate };
}

/**
 * Get array of Friday dates for the next N weeks
 *
 * @param weeksAhead - Number of weeks to look ahead (default: 4)
 * @returns Array of Friday dates
 */
export function getNextFridays(weeksAhead: number = 4): Date[] {
  const fridays: Date[] = [];
  const firstFriday = getNextFriday();

  for (let i = 0; i < weeksAhead; i++) {
    const friday = new Date(firstFriday);
    friday.setDate(friday.getDate() + (i * 7));
    fridays.push(friday);
  }

  return fridays;
}
