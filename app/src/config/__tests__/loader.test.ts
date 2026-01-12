/**
 * Unit tests for configuration loader
 * Requirements: 7.1, 7.2
 */

import * as fs from 'fs/promises';
import {
  loadHabitConfig,
  validateHabitConfiguration,
  validateSingleHabit,
  configFileExists,
} from '../loader';
import { HabitConfig } from '../../types';

// Mock fs for testing
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Configuration Loader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadHabitConfig', () => {
    const validConfig: HabitConfig[] = [
      {
        name: 'Test Habit',
        templateId: 'template-123',
        frequency: ['monday', 'wednesday', 'friday'],
        startTime: '09:00',
        endTime: '10:00',
        enabled: true,
      },
    ];

    it('should load valid configuration successfully', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(validConfig));

      const result = await loadHabitConfig();

      expect(result).toEqual(validConfig);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('habits.json'),
        'utf-8'
      );
    });

    it('should handle file not found error', async () => {
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      await expect(loadHabitConfig()).rejects.toThrow(
        'Configuration file not found:'
      );
    });

    it('should handle permission denied error', async () => {
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      mockFs.readFile.mockRejectedValue(error);

      await expect(loadHabitConfig()).rejects.toThrow(
        'Permission denied reading configuration file:'
      );
    });

    it('should handle invalid JSON error', async () => {
      mockFs.readFile.mockResolvedValue('invalid json {');

      await expect(loadHabitConfig()).rejects.toThrow(
        'Invalid JSON in configuration file:'
      );
    });

    it('should handle empty configuration gracefully', async () => {
      mockFs.readFile.mockResolvedValue('[]');

      await expect(loadHabitConfig()).rejects.toThrow(
        'No valid habits found in configuration file'
      );
    });

    it('should filter out invalid habits and return valid ones', async () => {
      const mixedConfig = [
        validConfig[0], // valid
        {
          name: 'Invalid',
          templateId: '',
          frequency: [],
          startTime: 'invalid',
          endTime: 'invalid',
          enabled: 'not-boolean',
        }, // invalid
        {
          name: 'Another Valid',
          templateId: 'template-456',
          frequency: ['tuesday'],
          startTime: '14:00',
          endTime: '15:00',
          enabled: false,
        }, // valid
      ];

      mockFs.readFile.mockResolvedValue(JSON.stringify(mixedConfig));

      const result = await loadHabitConfig();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Habit');
      expect(result[1].name).toBe('Another Valid');
    });

    it('should use custom config path when provided', async () => {
      const customPath = '/custom/path/config.json';
      mockFs.readFile.mockResolvedValue(JSON.stringify(validConfig));

      await loadHabitConfig(customPath);

      expect(mockFs.readFile).toHaveBeenCalledWith(customPath, 'utf-8');
    });
  });

  describe('validateHabitConfiguration', () => {
    it('should validate array of valid habits', () => {
      const validHabits = [
        {
          name: 'Habit 1',
          templateId: 'template-1',
          frequency: ['monday'],
          startTime: '09:00',
          endTime: '10:00',
          enabled: true,
        },
        {
          name: 'Habit 2',
          templateId: 'template-2',
          frequency: ['tuesday', 'thursday'],
          startTime: '14:00',
          endTime: '15:30',
          enabled: false,
        },
      ];

      const result = validateHabitConfiguration(validHabits);

      expect(result.valid).toBe(true);
      expect(result.validHabits).toHaveLength(2);
      expect(result.invalidHabits).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-array configuration', () => {
      const result = validateHabitConfiguration({ not: 'an array' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Configuration must be an array of habit objects'
      );
    });

    it('should warn about empty configuration', () => {
      const result = validateHabitConfiguration([]);

      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('Configuration array is empty');
    });

    it('should separate valid and invalid habits', () => {
      const mixedConfig = [
        {
          name: 'Valid Habit',
          templateId: 'template-1',
          frequency: ['monday'],
          startTime: '09:00',
          endTime: '10:00',
          enabled: true,
        },
        {
          name: '', // invalid - empty name
          templateId: 'template-2',
          frequency: ['invalid-day'], // invalid - bad weekday
          startTime: '25:00', // invalid - bad time format
          endTime: '10:00',
          enabled: true,
        },
      ];

      const result = validateHabitConfiguration(mixedConfig);

      expect(result.valid).toBe(true); // Still valid because we have one valid habit
      expect(result.validHabits).toHaveLength(1);
      expect(result.invalidHabits).toHaveLength(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateSingleHabit', () => {
    const validHabit = {
      name: 'Test Habit',
      templateId: 'template-123',
      frequency: ['monday', 'wednesday'],
      startTime: '09:00',
      endTime: '10:00',
      enabled: true,
    };

    it('should validate a correct habit', () => {
      const result = validateSingleHabit(validHabit, 0);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject habit with empty name', () => {
      const habit = { ...validHabit, name: '' };
      const result = validateSingleHabit(habit, 0);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name cannot be empty');
    });

    it('should reject habit with invalid frequency', () => {
      const habit = { ...validHabit, frequency: ['invalid-day'] };
      const result = validateSingleHabit(habit, 0);

      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('Invalid weekdays'))).toBe(
        true
      );
    });

    it('should reject habit with invalid time format', () => {
      const habit = { ...validHabit, startTime: '25:00' };
      const result = validateSingleHabit(habit, 0);

      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('HH:MM format'))).toBe(
        true
      );
    });

    it('should reject habit where start time is after end time', () => {
      const habit = { ...validHabit, startTime: '15:00', endTime: '14:00' };
      const result = validateSingleHabit(habit, 0);

      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('must be before'))).toBe(
        true
      );
    });

    it('should warn about duplicate weekdays', () => {
      const habit = {
        ...validHabit,
        frequency: ['monday', 'monday', 'tuesday'],
      };
      const result = validateSingleHabit(habit, 0);

      expect(result.valid).toBe(true); // Still valid, just a warning
      expect(
        result.warnings.some(warn => warn.includes('Duplicate weekdays'))
      ).toBe(true);
    });

    it('should reject non-object input', () => {
      const result = validateSingleHabit('not an object', 0);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must be an object');
    });

    it('should reject habit with missing required fields', () => {
      const incompleteHabit = { name: 'Test' }; // missing other required fields
      const result = validateSingleHabit(incompleteHabit, 0);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('configFileExists', () => {
    it('should return true when file exists and is readable', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await configFileExists();

      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith(
        expect.stringContaining('habits.json'),
        fs.constants.R_OK
      );
    });

    it('should return false when file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const result = await configFileExists();

      expect(result).toBe(false);
    });

    it('should use custom path when provided', async () => {
      const customPath = '/custom/config.json';
      mockFs.access.mockResolvedValue(undefined);

      await configFileExists(customPath);

      expect(mockFs.access).toHaveBeenCalledWith(customPath, fs.constants.R_OK);
    });
  });
});
