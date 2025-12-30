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
      const monday = new Date('2024-01-01'); // Monday
      expect(isDueToday(disabledHabit, monday)).toBe(false);
    });

    it('should return true for enabled habits on scheduled days', () => {
      const monday = new Date('2024-01-01'); // Monday
      expect(isDueToday(weekdayHabit, monday)).toBe(true);
      expect(isDueToday(dailyHabit, monday)).toBe(true);
    });

    it('should return false for enabled habits on non-scheduled days', () => {
      const saturday = new Date('2024-01-06'); // Saturday
      expect(isDueToday(weekdayHabit, saturday)).toBe(false);
      expect(isDueToday(weekendHabit, saturday)).toBe(true);
    });

    it('should use current date when no date provided', () => {
      // This test will depend on the current day, so we just verify it doesn't throw
      expect(() => isDueToday(dailyHabit)).not.toThrow();
    });
  });

  describe('getDayName', () => {
    it('should return correct lowercase weekday names', () => {
      expect(getDayName(new Date('2024-01-01'))).toBe('monday');
      expect(getDayName(new Date('2024-01-02'))).toBe('tuesday');
      expect(getDayName(new Date('2024-01-03'))).toBe('wednesday');
      expect(getDayName(new Date('2024-01-04'))).toBe('thursday');
      expect(getDayName(new Date('2024-01-05'))).toBe('friday');
      expect(getDayName(new Date('2024-01-06'))).toBe('saturday');
      expect(getDayName(new Date('2024-01-07'))).toBe('sunday');
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

    it('should return habits due on Monday', () => {
      const monday = new Date('2024-01-01'); // Monday
      const dueHabits = getHabitsDueToday(habits, monday);

      expect(dueHabits).toHaveLength(2);
      expect(dueHabits).toContain(dailyHabit);
      expect(dueHabits).toContain(weekdayHabit);
      expect(dueHabits).not.toContain(weekendHabit);
      expect(dueHabits).not.toContain(disabledHabit);
    });

    it('should return habits due on Saturday', () => {
      const saturday = new Date('2024-01-06'); // Saturday
      const dueHabits = getHabitsDueToday(habits, saturday);

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
      expect(getNextScheduledDate(disabledHabit, monday)).toBeNull();
    });

    it('should return next scheduled date for enabled habits', () => {
      const monday = new Date('2024-01-01'); // Monday
      const nextDate = getNextScheduledDate(weekendHabit, monday);

      expect(nextDate).not.toBeNull();
      if (nextDate) {
        expect(getDayName(nextDate)).toBe('saturday');
      }
    });

    it('should return next day for daily habits', () => {
      const monday = new Date('2024-01-01'); // Monday
      const nextDate = getNextScheduledDate(dailyHabit, monday);

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
