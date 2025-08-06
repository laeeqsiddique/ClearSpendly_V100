/**
 * Date utility functions to handle date parsing without timezone conversion issues
 */

/**
 * Parse a date string (YYYY-MM-DD) to a Date object in local timezone
 * This prevents the common issue where Date constructor interprets 
 * YYYY-MM-DD as UTC midnight and converts to local timezone
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Format a Date object to YYYY-MM-DD string in local timezone
 */
export function formatLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current date as YYYY-MM-DD string in local timezone
 */
export function getCurrentDateString(): string {
  return formatLocalDateString(new Date());
}

/**
 * Add days to a date string and return new date string
 */
export function addDaysToDateString(dateString: string, days: number): string {
  const date = parseLocalDate(dateString);
  date.setDate(date.getDate() + days);
  return formatLocalDateString(date);
}

/**
 * Check if a date string is before today (in local timezone)
 */
export function isDateBefore(dateString: string, compareDate: string = getCurrentDateString()): boolean {
  return dateString < compareDate;
}

/**
 * Check if a date string is after today (in local timezone)
 */
export function isDateAfter(dateString: string, compareDate: string = getCurrentDateString()): boolean {
  return dateString > compareDate;
}