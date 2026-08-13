/**
 * Tests for scheduling utilities
 * Requirements: 2.2, 2.4
 */

import {
  isDueToday,
  getDayName,
  isValidFrequency,
  getHabitsDueToday,
  isScheduledForWeekday,
  getNextScheduledDate,
  getScheduledWeekdays,
  isDaily,
  isWeekdaysOnly,
  isWeekendsOnly,
  VALID_WEEKDAYS,
} from '../scheduling';
import { HabitConfig } from '../../types';

describe('Scheduling Utilities', () => {
  // Sample habit configurations for testing
  const dailyHabit: HabitConfig = {
    name: 'Daily Exercise',
    templateId: 'template-123',
    frequency: [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ],
    startTime: '07:00',
    endTime: '08:00',
    enabled: true,
  };

  const weekdayHabit: HabitConfig = {
    name: 'Weekday Standup',
    templateId: 'template-456',
    frequency: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    startTime: '09:00',
    endTime: '09:30',
    enabled: true,
  };

  const weekendHabit: HabitConfig = {
    name: 'Weekend Review',
    templateId: 'template-789',
    frequency: ['saturday', 'sunday'],
    startTime: '19:00',
    endTime: '20:00',
    enabled: true,
  };

  const disabledHabit: HabitConfig = {
    name: 'Disabled Habit',
    templateId: 'template-disabled',
    frequency: ['monday'],
    startTime: '10:00',
    endTime: '11:00',
    enabled: false,
  };

  describe('isDueToday', () => {
    it('should return false for disabled habits', () => {
      const sunday = new Date('2024-01-07'); // Sunday (tomorrow is Monday)
      expect(isDueToday(disabledHabit, 'UTC', sunday)).toBe(false);
    });

    it('should return true for enabled habits on scheduled days (checking tomorrow)', () => {
      const sunday = new Date('2024-01-07'); // Sunday (tomorrow is Monday)
      expect(isDueToday(weekdayHabit, 'UTC', sunday)).toBe(true); // Monday is a weekday
      expect(isDueToday(dailyHabit, 'UTC', sunday)).toBe(true); // Monday is daily
    });

    it('should return false for enabled habits on non-scheduled days (checking tomorrow)', () => {
      const friday = new Date('2024-01-05'); // Friday (tomorrow is Saturday)
      expect(isDueToday(weekdayHabit, 'UTC', friday)).toBe(false); // Saturday is not a weekday
      expect(isDueToday(weekendHabit, 'UTC', friday)).toBe(true); // Saturday is a weekend
    });

    it('should use current date and default to UTC when no date/timezone provided', () => {
      // This test will depend on the current day, so we just verify it doesn't throw
      expect(() => isDueToday(dailyHabit)).not.toThrow();
    });

    it('should resolve "tomorrow" differently across a UTC/JST day boundary', () => {
      // 2024-01-07T23:00:00Z is Sunday 23:00 in UTC, but already Monday 08:00 in Asia/Tokyo.
      // Adding one day therefore lands on a different weekday depending on the timezone:
      //   - UTC:         2024-01-08T23:00:00Z -> Monday
      //   - Asia/Tokyo:  2024-01-09T08:00:00+09:00 -> Tuesday
      // A habit scheduled via bare local-time logic (the pre-fix bug) would misjudge
      // this on a UTC-only CI runner when the operator actually wants JST semantics.
      const boundaryInstant = new Date('2024-01-07T23:00:00Z');

      const mondayHabit: HabitConfig = {
        ...weekdayHabit,
        frequency: ['monday'],
      };
      const tuesdayHabit: HabitConfig = {
        ...weekdayHabit,
        frequency: ['tuesday'],
      };

      expect(isDueToday(mondayHabit, 'UTC', boundaryInstant)).toBe(true);
      expect(isDueToday(mondayHabit, 'Asia/Tokyo', boundaryInstant)).toBe(
        false
      );

      expect(isDueToday(tuesdayHabit, 'UTC', boundaryInstant)).toBe(false);
      expect(isDueToday(tuesdayHabit, 'Asia/Tokyo', boundaryInstant)).toBe(
        true
      );
    });
  });

  describe('getDayName', () => {
    it('should return correct lowercase weekday names (defaulting to UTC)', () => {
      expect(getDayName(new Date('2024-01-01'))).toBe('monday');
      expect(getDayName(new Date('2024-01-02'))).toBe('tuesday');
      expect(getDayName(new Date('2024-01-03'))).toBe('wednesday');
      expect(getDayName(new Date('2024-01-04'))).toBe('thursday');
      expect(getDayName(new Date('2024-01-05'))).toBe('friday');
      expect(getDayName(new Date('2024-01-06'))).toBe('saturday');
      expect(getDayName(new Date('2024-01-07'))).toBe('sunday');
    });

    it('should resolve the weekday in the given timezone, not the runtime local timezone', () => {
      // 2024-01-07T23:00:00Z is Sunday in UTC but already Monday in Asia/Tokyo (+9h)
      const boundaryInstant = new Date('2024-01-07T23:00:00Z');

      expect(getDayName(boundaryInstant, 'UTC')).toBe('sunday');
      expect(getDayName(boundaryInstant, 'Asia/Tokyo')).toBe('monday');
    });
  });

  describe('isValidFrequency', () => {
    it('should return true for valid weekday arrays', () => {
      expect(isValidFrequency(['monday', 'tuesday'])).toBe(true);
      expect(isValidFrequency(['saturday', 'sunday'])).toBe(true);
      expect(isValidFrequency(VALID_WEEKDAYS.slice())).toBe(true);
    });

    it('should return false for invalid frequency arrays', () => {
      expect(isValidFrequency([])).toBe(false);
      expect(isValidFrequency(['invalid'])).toBe(false);
      expect(isValidFrequency(['monday', 'invalid'])).toBe(false);
    });

    it('should return false for non-arrays', () => {
      expect(isValidFrequency(null as any)).toBe(false);
      expect(isValidFrequency('monday' as any)).toBe(false);
      expect(isValidFrequency({} as any)).toBe(false);
    });
  });

  describe('getHabitsDueToday', () => {
    const habits = [dailyHabit, weekdayHabit, weekendHabit, disabledHabit];

    it('should return habits due on Sunday (for Monday)', () => {
      const sunday = new Date('2024-01-07'); // Sunday (tomorrow is Monday)
      const dueHabits = getHabitsDueToday(habits, 'UTC', sunday);

      expect(dueHabits).toHaveLength(2);
      expect(dueHabits).toContain(dailyHabit);
      expect(dueHabits).toContain(weekdayHabit);
      expect(dueHabits).not.toContain(weekendHabit);
      expect(dueHabits).not.toContain(disabledHabit);
    });

    it('should return habits due on Friday (for Saturday)', () => {
      const friday = new Date('2024-01-05'); // Friday (tomorrow is Saturday)
      const dueHabits = getHabitsDueToday(habits, 'UTC', friday);

      expect(dueHabits).toHaveLength(2);
      expect(dueHabits).toContain(dailyHabit);
      expect(dueHabits).toContain(weekendHabit);
      expect(dueHabits).not.toContain(weekdayHabit);
      expect(dueHabits).not.toContain(disabledHabit);
    });
  });

  describe('isScheduledForWeekday', () => {
    it('should correctly identify scheduled weekdays', () => {
      expect(isScheduledForWeekday(weekdayHabit, 'monday')).toBe(true);
      expect(isScheduledForWeekday(weekdayHabit, 'saturday')).toBe(false);
      expect(isScheduledForWeekday(weekendHabit, 'saturday')).toBe(true);
      expect(isScheduledForWeekday(weekendHabit, 'monday')).toBe(false);
    });
  });

  describe('getNextScheduledDate', () => {
    it('should return null for disabled habits', () => {
      const monday = new Date('2024-01-01');
      expect(getNextScheduledDate(disabledHabit, 'UTC', monday)).toBeNull();
    });

    it('should return next scheduled date for enabled habits', () => {
      const monday = new Date('2024-01-01'); // Monday
      const nextDate = getNextScheduledDate(weekendHabit, 'UTC', monday);

      expect(nextDate).not.toBeNull();
      if (nextDate) {
        // Next weekend day after Monday is Saturday (5 days later)
        expect(getDayName(nextDate)).toBe('friday'); // Friday creates Saturday habit
      }
    });

    it('should return next day for daily habits', () => {
      const monday = new Date('2024-01-01'); // Monday
      const nextDate = getNextScheduledDate(dailyHabit, 'UTC', monday);

      expect(nextDate).not.toBeNull();
      if (nextDate) {
        expect(getDayName(nextDate)).toBe('tuesday');
      }
    });
  });

  describe('getScheduledWeekdays', () => {
    it('should return valid weekdays from frequency array', () => {
      expect(getScheduledWeekdays(weekdayHabit)).toEqual([
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
      ]);
      expect(getScheduledWeekdays(weekendHabit)).toEqual([
        'saturday',
        'sunday',
      ]);
    });
  });

  describe('isDaily', () => {
    it('should return true for habits scheduled all 7 days', () => {
      expect(isDaily(dailyHabit)).toBe(true);
    });

    it('should return false for habits not scheduled all 7 days', () => {
      expect(isDaily(weekdayHabit)).toBe(false);
      expect(isDaily(weekendHabit)).toBe(false);
    });
  });

  describe('isWeekdaysOnly', () => {
    it('should return true for Monday-Friday habits', () => {
      expect(isWeekdaysOnly(weekdayHabit)).toBe(true);
    });

    it('should return false for non-weekday habits', () => {
      expect(isWeekdaysOnly(dailyHabit)).toBe(false);
      expect(isWeekdaysOnly(weekendHabit)).toBe(false);
    });
  });

  describe('isWeekendsOnly', () => {
    it('should return true for Saturday-Sunday habits', () => {
      expect(isWeekendsOnly(weekendHabit)).toBe(true);
    });

    it('should return false for non-weekend habits', () => {
      expect(isWeekendsOnly(dailyHabit)).toBe(false);
      expect(isWeekendsOnly(weekdayHabit)).toBe(false);
    });
  });
});
