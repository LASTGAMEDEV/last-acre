// engine/calendarUtils.ts
// The game uses 360-day years and 30-day months. Day 1 = January 1, 1970.
// Calendar year 1970 = game year 1 = days 1–360.

export const GAME_START_CALENDAR_YEAR = 1970;
const DAYS_PER_YEAR = 360;
const DAYS_PER_MONTH = 30;

/** Returns the real-world calendar year for a given game day. Day 1 → 1970. */
export function gameDayToCalendarYear(day: number): number {
  return GAME_START_CALENDAR_YEAR + Math.floor((day - 1) / DAYS_PER_YEAR);
}

/** Returns the calendar month (1–12) for a given game day. */
export function gameDayToCalendarMonth(day: number): number {
  const dayOfYear = ((day - 1) % DAYS_PER_YEAR) + 1;
  return Math.ceil(dayOfYear / DAYS_PER_MONTH);
}

/** Returns the day of month (1–30) for a given game day. */
export function gameDayToCalendarDayOfMonth(day: number): number {
  return ((day - 1) % DAYS_PER_MONTH) + 1;
}

/**
 * Converts a real-world ISO date string ("1973-10-17") to the game day number.
 * Uses approximate 30-day months matching the game calendar.
 */
export function isoDateToGameDay(isoDate: string): number {
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const dayOfMonth = parseInt(dayStr, 10);
  const gameYear = year - GAME_START_CALENDAR_YEAR + 1; // 1970 → 1
  const dayOfYear = (month - 1) * DAYS_PER_MONTH + dayOfMonth;
  return (gameYear - 1) * DAYS_PER_YEAR + dayOfYear;
}

/**
 * Returns a human-readable date string for display.
 * Example: gameDayToDisplayDate(287) → "October 1970"
 */
export function gameDayToDisplayDate(day: number): string {
  const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  const year = gameDayToCalendarYear(day);
  const month = gameDayToCalendarMonth(day);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}
