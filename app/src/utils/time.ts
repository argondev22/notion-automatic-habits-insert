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
 * This function creates a UTC Date object that represents the specified local time
 * in the given timezone.
 *
 * @param date - Base date (used to determine the day in the target timezone)
 * @param time - Time object with hours and minutes
 * @param timezone - Timezone string (e.g., "Asia/Tokyo", "America/New_York")
 * @returns Date object representing the datetime in UTC
 */
function createDateTimeInTimezone(
  date: Date,
  time: { hours: number; minutes: number },
  timezone: string
): Date {
  // Get the date components in the target timezone
  const year = parseInt(
    date.toLocaleDateString('en-CA', { timeZone: timezone, year: 'numeric' })
  );
  const month = parseInt(
    date.toLocaleDateString('en-CA', { timeZone: timezone, month: '2-digit' })
  );
  const day = parseInt(
    date.toLocaleDateString('en-CA', { timeZone: timezone, day: '2-digit' })
  );

  // Create a UTC date for the target date at midnight
  const midnightUTC = Date.UTC(year, month - 1, day, 0, 0, 0, 0);

  // Create a Date object from this UTC timestamp
  const midnightDate = new Date(midnightUTC);

  // Get what time midnight UTC appears as in the target timezone
  const midnightInTz = midnightDate.toLocaleString('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const [midnightTzDate, midnightTzTime] = midnightInTz.split(' ');
  const [tzHour, tzMin] = midnightTzTime.split(':').map(Number);

  // Calculate the offset in milliseconds
  // If midnight UTC shows as 09:00 in Tokyo, the offset is +9 hours
  const offsetHours = tzHour;
  const offsetMinutes = tzMin;
  const offsetMs = (offsetHours * 60 + offsetMinutes) * 60 * 1000;

  // Now create the target time in UTC
  // We want the time to be time.hours:time.minutes in the target timezone
  // So we need to subtract the offset
  const targetTimeMs = Date.UTC(
    year,
    month - 1,
    day,
    time.hours,
    time.minutes,
    0,
    0
  );
  const resultMs = targetTimeMs - offsetMs;

  return new Date(resultMs);
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
  } catch {
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
