/**
 * Time calculation utilities for Template-Based Habit Scheduler
 * Requirements: 4.1, 4.3
 */

import { TimeRange, TimeCalculationParams, HabitConfig } from '../types';

/**
 * A calendar date (no time, no timezone attached).
 */
export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;
}

/**
 * Canonical time-format regex (HH:MM). Permissive of single-digit hours
 * (e.g. "9:00") since existing config data relies on that.
 */
export const TIME_FORMAT_REGEX = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;

/**
 * Calculate time range for a habit based on its configuration
 *
 * This function calculates the time range for tomorrow's date.
 * For example, if called on Monday, it will create times for Tuesday.
 *
 * @param habit - Habit configuration containing startTime and endTime
 * @param timezone - Timezone string (e.g., "Asia/Tokyo", "America/New_York")
 * @param date - Optional date to calculate for (defaults to today, but calculates for next day)
 * @returns TimeRange with ISO formatted start and end times for tomorrow
 */
export function calculateTimeRange(
  habit: HabitConfig,
  timezone: string = 'UTC',
  date?: Date
): TimeRange {
  return buildTimeRange(habit.startTime, habit.endTime, timezone, date);
}

/**
 * Calculate time range using explicit parameters
 *
 * This function calculates the time range for tomorrow's date.
 *
 * @param params - Time calculation parameters
 * @returns TimeRange with ISO formatted start and end times for tomorrow
 */
export function calculateTimeRangeFromParams(
  params: TimeCalculationParams
): TimeRange {
  return buildTimeRange(
    params.startTime,
    params.endTime,
    params.timezone,
    params.date
  );
}

/**
 * Shared implementation behind `calculateTimeRange` and
 * `calculateTimeRangeFromParams`: resolves the scheduling target date in
 * `timezone`, then builds the start/end instants, rolling the end time into
 * the following calendar day when it crosses midnight.
 */
function buildTimeRange(
  startTimeString: string,
  endTimeString: string,
  timezone: string,
  date?: Date
): TimeRange {
  const targetDate = getSchedulingTargetDate(timezone, date);

  const startTime = parseTimeString(startTimeString);
  const endTime = parseTimeString(endTimeString);

  const startDateTime = zonedTimeToUtc(targetDate, startTime, timezone);

  // Handle case where end time is before (or equal to) start time (crosses midnight)
  const startMinutes = startTime.hours * 60 + startTime.minutes;
  const endMinutes = endTime.hours * 60 + endTime.minutes;
  const endCalendarDate =
    endMinutes <= startMinutes ? addCalendarDays(targetDate, 1) : targetDate;

  const endDateTime = zonedTimeToUtc(endCalendarDate, endTime, timezone);

  return {
    start: startDateTime.toISOString(),
    end: endDateTime.toISOString(),
  };
}

/**
 * The calendar date that `instant` falls on in `timezone`.
 *
 * @param instant - The instant to resolve
 * @param timezone - IANA timezone to resolve the date in
 * @returns The year/month/day that `instant` falls on in `timezone`
 */
export function getCalendarDateInTimezone(
  instant: Date,
  timezone: string
): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);

  const read = (type: string): number =>
    Number(parts.find(p => p.type === type)!.value);

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
  };
}

/**
 * Calendar-arithmetic day addition (DST-safe; no instant involved).
 *
 * @param date - Starting calendar date
 * @param days - Number of days to add (may be negative)
 * @returns The resulting calendar date
 */
export function addCalendarDays(
  date: CalendarDate,
  days: number
): CalendarDate {
  const base = new Date(Date.UTC(date.year, date.month - 1, date.day));
  base.setUTCDate(base.getUTCDate() + days);

  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  };
}

/**
 * The date this run schedules habits for: tomorrow, as seen in `timezone`.
 * Single source of truth for both weekday matching and time-range building.
 *
 * @param timezone - IANA timezone used to resolve "today"/"tomorrow"
 * @param now - Optional instant to treat as "now" (defaults to the current time)
 * @returns Tomorrow's calendar date in `timezone`
 */
export function getSchedulingTargetDate(
  timezone: string,
  now?: Date
): CalendarDate {
  const currentInstant = now || new Date();
  const todayInTimezone = getCalendarDateInTimezone(currentInstant, timezone);
  return addCalendarDays(todayInTimezone, 1);
}

/**
 * Lowercase English weekday name for a calendar date (e.g. "tuesday").
 *
 * @param date - Calendar date to resolve the weekday for
 * @returns Lowercase weekday name
 */
export function getWeekdayNameForCalendarDate(date: CalendarDate): string {
  return new Date(Date.UTC(date.year, date.month - 1, date.day))
    .toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long' })
    .toLowerCase();
}

/**
 * Get the UTC offset (in milliseconds) that `timezone` is at a given instant.
 * Renders the instant in the target timezone, re-reads those wall-clock
 * components as if they were UTC, and diffs against the real instant.
 */
function getTimezoneOffsetMs(utcMs: number, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));

  const read = (type: string): number =>
    Number(parts.find(p => p.type === type)!.value);

  // en-US with hour12:false can render midnight as hour 24
  const hour = read('hour') % 24;

  const asIfUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    hour,
    read('minute'),
    read('second')
  );

  return asIfUtc - utcMs;
}

/**
 * Build the UTC instant corresponding to a wall-clock date/time in `timezone`.
 * Guesses the instant assuming today's offset, then corrects once against
 * the offset at the guessed instant (this second pass handles DST boundaries).
 */
function zonedTimeToUtc(
  date: CalendarDate,
  time: { hours: number; minutes: number },
  timezone: string
): Date {
  const guess = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    time.hours,
    time.minutes,
    0,
    0
  );
  const firstOffset = getTimezoneOffsetMs(guess, timezone);
  let resultMs = guess - firstOffset;
  const secondOffset = getTimezoneOffsetMs(resultMs, timezone);
  if (secondOffset !== firstOffset) {
    resultMs = guess - secondOffset;
  }
  return new Date(resultMs);
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
  const match = timeString.match(TIME_FORMAT_REGEX);

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
 * Validate time string format
 *
 * @param timeString - Time string to validate
 * @returns True if valid HH:MM format
 */
export function isValidTimeFormat(timeString: string): boolean {
  return TIME_FORMAT_REGEX.test(timeString);
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
