/**
 * Time calculation utilities for Template-Based Habit Scheduler
 * Requirements: 4.1, 4.3
 */

import { TimeRange, TimeCalculationParams, HabitConfig } from '../types';

/**
 * Calculate time range for a habit based on its configuration
 *
 * @param habit - Habit configuration containing startTime and endTime
 * @param timezone - Timezone string (e.g., "Asia/Tokyo", "America/New_York")
 * @param date - Optional date to calculate for (defaults to today)
 * @returns TimeRange with ISO formatted start and end times
 */
export function calculateTimeRange(
  habit: HabitConfig,
  timezone: string = 'UTC',
  date?: Date
): TimeRange {
  const targetDate = date || new Date();

  // Parse start and end times
  const startTime = parseTimeString(habit.startTime);
  const endTime = parseTimeString(habit.endTime);

  // Create Date objects for start and end times
  const startDateTime = createDateTimeInTimezone(
    targetDate,
    startTime,
    timezone
  );
  const endDateTime = createDateTimeInTimezone(targetDate, endTime, timezone);

  // Handle case where end time is before start time (crosses midnight)
  if (endDateTime <= startDateTime) {
    // Add one day to end time
    endDateTime.setUTCDate(endDateTime.getUTCDate() + 1);
  }

  return {
    start: startDateTime.toISOString(),
    end: endDateTime.toISOString(),
  };
}

/**
 * Calculate time range using explicit parameters
 *
 * @param params - Time calculation parameters
 * @returns TimeRange with ISO formatted start and end times
 */
export function calculateTimeRangeFromParams(
  params: TimeCalculationParams
): TimeRange {
  const targetDate = params.date || new Date();

  // Parse start and end times
  const startTime = parseTimeString(params.startTime);
  const endTime = parseTimeString(params.endTime);

  // Create Date objects for start and end times
  const startDateTime = createDateTimeInTimezone(
    targetDate,
    startTime,
    params.timezone
  );
  const endDateTime = createDateTimeInTimezone(
    targetDate,
    endTime,
    params.timezone
  );

  // Handle case where end time is before start time (crosses midnight)
  if (endDateTime <= startDateTime) {
    // Add one day to end time
    endDateTime.setUTCDate(endDateTime.getUTCDate() + 1);
  }

  return {
    start: startDateTime.toISOString(),
    end: endDateTime.toISOString(),
  };
}

/**
 * Parse time string in HH:MM format
 *
 * @param timeString - Time in "HH:MM" format (e.g., "07:30", "14:15")
 * @returns Object with hours and minutes
 */
function parseTimeString(timeString: string): {
  hours: number;
  minutes: number;
} {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  const match = timeString.match(timeRegex);

  if (!match) {
    throw new Error(
      `Invalid time format: ${timeString}. Expected HH:MM format.`
    );
  }

  return {
    hours: parseInt(match[1], 10),
    minutes: parseInt(match[2], 10),
  };
}

/**
 * Create a Date object for a specific date and time in a given timezone
 *
 * @param date - Base date
 * @param time - Time object with hours and minutes
 * @param timezone - Timezone string
 * @returns Date object representing the datetime in UTC
 */
function createDateTimeInTimezone(
  date: Date,
  time: { hours: number; minutes: number },
  timezone: string
): Date {
  if (timezone === 'UTC') {
    // For UTC, create the date directly
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    return new Date(Date.UTC(year, month, day, time.hours, time.minutes, 0, 0));
  }

  // For other timezones, we need to create a date that when interpreted in that timezone
  // gives us the desired local time, but returns a UTC timestamp

  // Get the date in the target timezone
  const year = parseInt(
    date.toLocaleDateString('en-CA', { timeZone: timezone, year: 'numeric' })
  );
  const month =
    parseInt(
      date.toLocaleDateString('en-CA', { timeZone: timezone, month: '2-digit' })
    ) - 1; // Month is 0-indexed
  const day = parseInt(
    date.toLocaleDateString('en-CA', { timeZone: timezone, day: '2-digit' })
  );

  // Create a date object that represents the desired time in the target timezone
  // We'll use a trick: create the date as if it were local time, then adjust for timezone offset
  const localDate = new Date(year, month, day, time.hours, time.minutes, 0, 0);

  // Get the timezone offset for this specific date/time
  const utcTime = new Date(
    localDate.toLocaleString('sv-SE', { timeZone: 'UTC' })
  );
  const tzTime = new Date(
    localDate.toLocaleString('sv-SE', { timeZone: timezone })
  );
  const offset = utcTime.getTime() - tzTime.getTime();

  // Apply the offset to get the correct UTC time
  return new Date(localDate.getTime() + offset);
}

/**
 * Validate time string format
 *
 * @param timeString - Time string to validate
 * @returns True if valid HH:MM format
 */
export function isValidTimeFormat(timeString: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(timeString);
}

/**
 * Validate timezone string
 *
 * @param timezone - Timezone string to validate
 * @returns True if valid timezone
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    // Try to create a date with the timezone
    new Date().toLocaleString('en-US', { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get current time in specified timezone as HH:MM string
 *
 * @param timezone - Timezone string
 * @returns Current time in HH:MM format
 */
export function getCurrentTimeInTimezone(timezone: string): string {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-GB', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  return timeString;
}

/**
 * Format time range for display
 *
 * @param timeRange - TimeRange object with ISO strings
 * @param timezone - Timezone for display formatting
 * @returns Formatted time range string
 */
export function formatTimeRangeForDisplay(
  timeRange: TimeRange,
  timezone: string = 'UTC'
): string {
  const startDate = new Date(timeRange.start);
  const endDate = new Date(timeRange.end);

  const startTime = startDate.toLocaleTimeString('en-GB', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  const endTime = endDate.toLocaleTimeString('en-GB', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${startTime} - ${endTime}`;
}
