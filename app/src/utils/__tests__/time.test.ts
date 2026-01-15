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
