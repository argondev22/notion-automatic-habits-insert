/**
 * Scheduling utilities for Template-Based Habit Scheduler
 * Requirements: 2.2, 2.4
 */

import { HabitConfig } from '../types';

/**
 * Valid weekday names that can be used in frequency arrays
 */
export const VALID_WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type ValidWeekday = (typeof VALID_WEEKDAYS)[number];

/**
 * Check if a habit is due to be created today (for tomorrow)
 *
 * This function checks if a habit should be created today for tomorrow's schedule.
 * For example, if today is Monday, it checks if the habit is scheduled for Tuesday.
 *
 * @param habit - Habit configuration to check
 * @param date - Date to check against (defaults to today)
 * @returns True if the habit should be created on the given date (for the next day)
 */
export function isDueToday(habit: HabitConfig, date?: Date): boolean {
  // If habit is disabled, it's never due
  if (!habit.enabled) {
    return false;
  }

  const targetDate = date || new Date();

  // Calculate tomorrow's date
  const tomorrow = new Date(targetDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tomorrowDayName = getDayName(tomorrow);

  // Check if tomorrow is in the frequency array
  return habit.frequency.includes(tomorrowDayName);
}

/**
 * Get the lowercase weekday name for a given date
 *
 * @param date - Date to get weekday name for
 * @returns Lowercase weekday name (e.g., "monday", "tuesday")
 */
export function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
}

/**
 * Validate that all frequency values are valid weekday names
 *
 * @param frequency - Array of frequency strings to validate
 * @returns True if all frequency values are valid weekdays
 */
export function isValidFrequency(frequency: string[]): boolean {
  if (!Array.isArray(frequency) || frequency.length === 0) {
    return false;
  }

  return frequency.every(day => VALID_WEEKDAYS.includes(day as ValidWeekday));
}

/**
 * Get all habits that are due today from a list of habit configurations
 *
 * @param habits - Array of habit configurations
 * @param date - Date to check against (defaults to today)
 * @returns Array of habits that are due today
 */
export function getHabitsDueToday(
  habits: HabitConfig[],
  date?: Date
): HabitConfig[] {
  return habits.filter(habit => isDueToday(habit, date));
}

/**
 * Check if a habit is scheduled for a specific weekday
 *
 * @param habit - Habit configuration to check
 * @param weekday - Weekday name to check (e.g., "monday")
 * @returns True if the habit is scheduled for the given weekday
 */
export function isScheduledForWeekday(
  habit: HabitConfig,
  weekday: ValidWeekday
): boolean {
  return habit.frequency.includes(weekday);
}

/**
 * Get the next scheduled date for a habit after a given date
 *
 * @param habit - Habit configuration
 * @param fromDate - Date to start searching from (defaults to today)
 * @returns Next date when the habit is scheduled, or null if habit is disabled
 */
export function getNextScheduledDate(
  habit: HabitConfig,
  fromDate?: Date
): Date | null {
  if (!habit.enabled) {
    return null;
  }

  const startDate = fromDate || new Date();
  const maxDaysToCheck = 7; // Check up to one week ahead

  for (let i = 1; i <= maxDaysToCheck; i++) {
    const checkDate = new Date(startDate);
    checkDate.setDate(startDate.getDate() + i);

    if (isDueToday(habit, checkDate)) {
      return checkDate;
    }
  }

  return null; // Should not happen if frequency is valid
}

/**
 * Get all weekdays when a habit is scheduled
 *
 * @param habit - Habit configuration
 * @returns Array of weekday names when the habit is scheduled
 */
export function getScheduledWeekdays(habit: HabitConfig): ValidWeekday[] {
  return habit.frequency.filter((day): day is ValidWeekday =>
    VALID_WEEKDAYS.includes(day as ValidWeekday)
  );
}

/**
 * Check if a habit runs every day of the week
 *
 * @param habit - Habit configuration
 * @returns True if the habit is scheduled for all 7 days
 */
export function isDaily(habit: HabitConfig): boolean {
  const scheduledDays = getScheduledWeekdays(habit);
  return scheduledDays.length === 7;
}

/**
 * Check if a habit runs only on weekdays (Monday-Friday)
 *
 * @param habit - Habit configuration
 * @returns True if the habit is scheduled only for weekdays
 */
export function isWeekdaysOnly(habit: HabitConfig): boolean {
  const scheduledDays = getScheduledWeekdays(habit);
  const weekdays: ValidWeekday[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
  ];

  return (
    scheduledDays.length === 5 &&
    weekdays.every(day => scheduledDays.includes(day))
  );
}

/**
 * Check if a habit runs only on weekends (Saturday-Sunday)
 *
 * @param habit - Habit configuration
 * @returns True if the habit is scheduled only for weekends
 */
export function isWeekendsOnly(habit: HabitConfig): boolean {
  const scheduledDays = getScheduledWeekdays(habit);
  const weekends: ValidWeekday[] = ['saturday', 'sunday'];

  return (
    scheduledDays.length === 2 &&
    weekends.every(day => scheduledDays.includes(day))
  );
}
