/**
 * Tests for time calculation utilities
 * Requirements: 4.1, 4.3
 */

import {
  calculateTimeRange,
  calculateTimeRangeFromParams,
  isValidTimeFormat,
  isValidTimezone,
  getCurrentTimeInTimezone,
  formatTimeRangeForDisplay,
} from '../time';
import { HabitConfig } from '../../types';

describe('Time Calculation Utilities', () => {
  const mockHabit: HabitConfig = {
    name: 'Morning Exercise',
    templateId: 'template-123',
    frequency: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    startTime: '07:00',
    endTime: '08:00',
    enabled: true,
  };

  describe('calculateTimeRange', () => {
    it('should calculate correct time range for a habit (for tomorrow)', () => {
      const testDate = new Date('2024-01-15T12:00:00Z'); // Monday
      const result = calculateTimeRange(mockHabit, 'UTC', testDate);

      // Should calculate for tomorrow (Tuesday, 2024-01-16)
      expect(result.start).toBe('2024-01-16T07:00:00.000Z');
      expect(result.end).toBe('2024-01-16T08:00:00.000Z');
    });

    it('should handle timezone conversion correctly', () => {
      const testDate = new Date('2024-01-15T12:00:00Z'); // Monday
      const result = calculateTimeRange(mockHabit, 'Asia/Tokyo', testDate);

      // Should be in ISO format but calculated for Tokyo timezone
      expect(result.start).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
      expect(result.end).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );

      // Start should be before end
      expect(new Date(result.start).getTime()).toBeLessThan(
        new Date(result.end).getTime()
      );
    });

    it('should handle midnight crossing (for tomorrow)', () => {
      const nightHabit: HabitConfig = {
        ...mockHabit,
        startTime: '23:30',
        endTime: '01:00',
      };

      const testDate = new Date('2024-01-15T12:00:00Z'); // Monday
      const result = calculateTimeRange(nightHabit, 'UTC', testDate);

      // Should calculate for tomorrow (Tuesday, 2024-01-16)
      expect(result.start).toBe('2024-01-16T23:30:00.000Z');
      expect(result.end).toBe('2024-01-17T01:00:00.000Z'); // Crosses to Wednesday
    });

    it('should resolve "tomorrow" correctly for negative UTC offset timezones', () => {
      // Regression test: the pre-fix offset calculation rendered UTC
      // midnight in the target timezone and used the resulting time-of-day
      // as the offset, ignoring that for negative offsets that render lands
      // on the PREVIOUS calendar day. With base date 2026-09-16, that bug
      // produced 2026-09-16 07:00 local in America/New_York instead of the
      // correct 2026-09-17 07:00 local.
      const testDate = new Date('2026-09-16T12:00:00Z');

      const nyResult = calculateTimeRange(
        mockHabit,
        'America/New_York',
        testDate
      );
      const nyStart = new Date(nyResult.start).toLocaleString('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      expect(nyStart).toBe('09/17/2026, 07:00');

      const laResult = calculateTimeRange(
        mockHabit,
        'America/Los_Angeles',
        testDate
      );
      const laStart = new Date(laResult.start).toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      expect(laStart).toBe('09/17/2026, 07:00');
    });

    it('should resolve correctly across a US DST spring-forward boundary', () => {
      // 2026-03-07T12:00:00Z targets 2026-03-08 (the US spring-forward day).
      const testDate = new Date('2026-03-07T12:00:00Z');
      const result = calculateTimeRange(
        mockHabit,
        'America/New_York',
        testDate
      );

      const start = new Date(result.start).toLocaleString('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      expect(start).toBe('03/08/2026, 07:00');
    });

    it('should produce a 7-hour cross-midnight range for a sleep-style habit', () => {
      const sleepHabit: HabitConfig = {
        ...mockHabit,
        startTime: '23:00',
        endTime: '06:00',
      };
      const testDate = new Date('2026-09-16T12:00:00Z');
      const result = calculateTimeRange(sleepHabit, 'Asia/Tokyo', testDate);

      const durationHours =
        (new Date(result.end).getTime() - new Date(result.start).getTime()) /
        (60 * 60 * 1000);
      expect(durationHours).toBe(7);

      const endLocal = new Date(result.end).toLocaleString('en-US', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      expect(endLocal).toBe('09/18/2026, 06:00');
    });

    it('should use current date when no date provided', () => {
      const result = calculateTimeRange(mockHabit, 'UTC');

      // Should return valid ISO strings
      expect(result.start).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
      expect(result.end).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });

  describe('calculateTimeRangeFromParams', () => {
    it('should calculate time range from explicit parameters (for tomorrow)', () => {
      const params = {
        startTime: '09:30',
        endTime: '10:45',
        timezone: 'UTC',
        date: new Date('2024-01-15T12:00:00Z'),
      };

      const result = calculateTimeRangeFromParams(params);

      // Should calculate for tomorrow (Tuesday, 2024-01-16)
      expect(result.start).toBe('2024-01-16T09:30:00.000Z');
      expect(result.end).toBe('2024-01-16T10:45:00.000Z');
    });
  });

  describe('isValidTimeFormat', () => {
    it('should validate correct time formats', () => {
      expect(isValidTimeFormat('07:00')).toBe(true);
      expect(isValidTimeFormat('23:59')).toBe(true);
      expect(isValidTimeFormat('00:00')).toBe(true);
      expect(isValidTimeFormat('12:30')).toBe(true);
      expect(isValidTimeFormat('7:00')).toBe(true); // Single digit hour is valid
    });

    it('should reject invalid time formats', () => {
      expect(isValidTimeFormat('25:00')).toBe(false);
      expect(isValidTimeFormat('12:60')).toBe(false);
      expect(isValidTimeFormat('12:5')).toBe(false); // Missing leading zero for minutes
      expect(isValidTimeFormat('invalid')).toBe(false);
      expect(isValidTimeFormat('')).toBe(false);
    });
  });

  describe('isValidTimezone', () => {
    it('should validate correct timezone strings', () => {
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('Asia/Tokyo')).toBe(true);
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('Europe/London')).toBe(true);
    });

    it('should reject invalid timezone strings', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone('NotATimezone')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
    });
  });

  describe('getCurrentTimeInTimezone', () => {
    it('should return time in HH:MM format', () => {
      const result = getCurrentTimeInTimezone('UTC');
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should work with different timezones', () => {
      const utcTime = getCurrentTimeInTimezone('UTC');
      const tokyoTime = getCurrentTimeInTimezone('Asia/Tokyo');

      // Both should be valid time formats
      expect(utcTime).toMatch(/^\d{2}:\d{2}$/);
      expect(tokyoTime).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('formatTimeRangeForDisplay', () => {
    it('should format time range for display', () => {
      const timeRange = {
        start: '2024-01-15T07:00:00.000Z',
        end: '2024-01-15T08:00:00.000Z',
      };

      const result = formatTimeRangeForDisplay(timeRange, 'UTC');
      expect(result).toBe('07:00 - 08:00');
    });

    it('should handle different timezones for display', () => {
      const timeRange = {
        start: '2024-01-15T07:00:00.000Z',
        end: '2024-01-15T08:00:00.000Z',
      };

      const result = formatTimeRangeForDisplay(timeRange, 'UTC');
      expect(result).toMatch(/^\d{2}:\d{2} - \d{2}:\d{2}$/);
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid time format in calculateTimeRange', () => {
      const invalidHabit: HabitConfig = {
        ...mockHabit,
        startTime: 'invalid-time',
      };

      expect(() => {
        calculateTimeRange(invalidHabit, 'UTC');
      }).toThrow('Invalid time format');
    });

    it('should throw error for invalid time format in calculateTimeRangeFromParams', () => {
      const invalidParams = {
        startTime: '25:00',
        endTime: '08:00',
        timezone: 'UTC',
      };

      expect(() => {
        calculateTimeRangeFromParams(invalidParams);
      }).toThrow('Invalid time format');
    });
  });
});
