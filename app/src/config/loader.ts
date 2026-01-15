/**
 * Configuration loader for habit management system
 * Requirements: 7.1, 7.2
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { HabitConfig, HabitConfigValidation, ValidationResult } from '../types';

/**
 * Default configuration file path
 */
const DEFAULT_CONFIG_PATH = path.join(process.cwd(), 'config', 'habits.json');

/**
 * Valid weekday names for frequency validation
 */
const VALID_WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Time format regex (HH:MM)
 */
const TIME_FORMAT_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Loads and validates habit configuration from JSON file
 * @param configPath Optional path to configuration file
 * @returns Promise<HabitConfig[]> Array of valid habit configurations
 * @throws Error if configuration cannot be loaded or is completely invalid
 */
export async function loadHabitConfig(
  configPath?: string
): Promise<HabitConfig[]> {
  const filePath = configPath || DEFAULT_CONFIG_PATH;

  try {
    console.log(`Loading habit configuration from: ${filePath}`);

    // Read and parse JSON file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const rawConfig = JSON.parse(fileContent);

    // Validate configuration structure
    const validation = validateHabitConfiguration(rawConfig);

    // Log validation results
    if (validation.warnings.length > 0) {
      console.warn('Configuration warnings:', validation.warnings);
    }

    if (validation.errors.length > 0) {
      console.error('Configuration errors:', validation.errors);
    }

    // If we have some valid habits, return them (graceful degradation)
    if (validation.validHabits.length > 0) {
      console.log(
        `Successfully loaded ${validation.validHabits.length} valid habit(s)`
      );

      if (validation.invalidHabits.length > 0) {
        console.warn(
          `Skipped ${validation.invalidHabits.length} invalid habit(s)`
        );
      }

      return validation.validHabits;
    }

    // No valid habits found
    throw new Error('No valid habits found in configuration file');
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in configuration file: ${error.message}`);
    }

    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Configuration file not found: ${filePath}`);
    }

    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new Error(
        `Permission denied reading configuration file: ${filePath}`
      );
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Validates habit configuration array and individual habits
 * @param rawConfig Raw configuration data from JSON
 * @returns HabitConfigValidation Validation results with valid/invalid habits
 */
export function validateHabitConfiguration(
  rawConfig: unknown
): HabitConfigValidation {
  const result: HabitConfigValidation = {
    valid: false,
    errors: [],
    warnings: [],
    validHabits: [],
    invalidHabits: [],
  };

  // Check if config is an array
  if (!Array.isArray(rawConfig)) {
    result.errors.push('Configuration must be an array of habit objects');
    return result;
  }

  if (rawConfig.length === 0) {
    result.warnings.push('Configuration array is empty');
    return result;
  }

  // Validate each habit configuration
  for (let i = 0; i < rawConfig.length; i++) {
    const habitConfig = rawConfig[i];
    const habitValidation = validateSingleHabit(habitConfig);

    if (habitValidation.valid) {
      result.validHabits.push(habitConfig as HabitConfig);
    } else {
      result.invalidHabits.push({
        config: habitConfig,
        errors: habitValidation.errors,
      });
      result.errors.push(
        ...habitValidation.errors.map(err => `Habit ${i}: ${err}`)
      );
    }
  }

  // Overall validation is successful if we have at least one valid habit
  result.valid = result.validHabits.length > 0;

  return result;
}

/**
 * Validates a single habit configuration object
 * @param habit Raw habit configuration object
 * @returns ValidationResult Validation result for this habit
 */
export function validateSingleHabit(habit: unknown): ValidationResult {
  const result: ValidationResult = {
    valid: false,
    errors: [],
    warnings: [],
  };

  // Check basic structure and required fields
  if (typeof habit !== 'object' || habit === null) {
    result.errors.push('Must be an object');
    return result;
  }

  // Type guard to safely access properties
  const habitObj = habit as Record<string, any>;

  // Check required fields and their types
  if (typeof habitObj.name !== 'string') {
    result.errors.push('name must be a string');
  } else if (habitObj.name.trim().length === 0) {
    result.errors.push('name cannot be empty');
  }

  if (typeof habitObj.templateId !== 'string') {
    result.errors.push('templateId must be a string');
  } else if (habitObj.templateId.trim().length === 0) {
    result.errors.push('templateId cannot be empty');
  }

  if (!Array.isArray(habitObj.frequency)) {
    result.errors.push('frequency must be an array');
  } else {
    validateFrequency(habitObj.frequency, result);
  }

  if (typeof habitObj.startTime !== 'string') {
    result.errors.push('startTime must be a string');
  } else {
    validateTimeFormat(habitObj.startTime, 'startTime', result);
  }

  if (typeof habitObj.endTime !== 'string') {
    result.errors.push('endTime must be a string');
  } else {
    validateTimeFormat(habitObj.endTime, 'endTime', result);
  }

  if (typeof habitObj.enabled !== 'boolean') {
    result.errors.push('enabled must be a boolean');
  }

  // If we have basic validation errors, return early
  if (result.errors.length > 0) {
    return result;
  }

  // Additional business logic validation (only if basic validation passed)
  validateTimeRange(habitObj.startTime, habitObj.endTime, result);

  // Validation passes if no errors
  result.valid = result.errors.length === 0;

  return result;
}

/**
 * Validates frequency array contains valid weekdays
 * @param frequency Frequency array to validate
 * @param result ValidationResult to add errors/warnings to
 */
function validateFrequency(frequency: any[], result: ValidationResult): void {
  if (frequency.length === 0) {
    result.errors.push('frequency array cannot be empty');
    return;
  }

  const invalidDays: string[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();

  for (const day of frequency) {
    if (typeof day !== 'string') {
      result.errors.push(
        `frequency must contain only strings, found: ${typeof day}`
      );
      continue;
    }

    const normalizedDay = day.toLowerCase().trim();

    if (!VALID_WEEKDAYS.includes(normalizedDay)) {
      invalidDays.push(day);
    }

    if (seen.has(normalizedDay)) {
      duplicates.push(day);
    } else {
      seen.add(normalizedDay);
    }
  }

  if (invalidDays.length > 0) {
    result.errors.push(
      `Invalid weekdays in frequency: ${invalidDays.join(', ')}. Valid options: ${VALID_WEEKDAYS.join(', ')}`
    );
  }

  if (duplicates.length > 0) {
    result.warnings.push(
      `Duplicate weekdays in frequency: ${duplicates.join(', ')}`
    );
  }
}

/**
 * Validates time format (HH:MM)
 * @param time Time string to validate
 * @param fieldName Name of the field for error reporting
 * @param result ValidationResult to add errors to
 */
function validateTimeFormat(
  time: string,
  fieldName: string,
  result: ValidationResult
): void {
  if (!TIME_FORMAT_REGEX.test(time)) {
    result.errors.push(
      `${fieldName} must be in HH:MM format (e.g., "07:30", "14:00")`
    );
  }
}

/**
 * Validates that start time and end time are valid
 * Note: Allows cross-midnight times (e.g., 23:00-06:00)
 * @param startTime Start time string
 * @param endTime End time string
 * @param result ValidationResult to add errors to
 */
function validateTimeRange(
  startTime: string,
  endTime: string,
  result: ValidationResult
): void {
  // Only validate if both times are in correct format
  if (!TIME_FORMAT_REGEX.test(startTime) || !TIME_FORMAT_REGEX.test(endTime)) {
    return; // Format errors will be caught by validateTimeFormat
  }

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Allow cross-midnight times (e.g., 23:00-06:00)
  // If end time is before start time, it's interpreted as crossing midnight
  // This is valid and handled by the time calculation logic

  // Only check if start and end are exactly the same (which doesn't make sense)
  if (startMinutes === endMinutes) {
    result.errors.push(
      `startTime (${startTime}) and endTime (${endTime}) cannot be the same`
    );
  }
}

/**
 * Reloads configuration file (useful for testing or runtime config updates)
 * @param configPath Optional path to configuration file
 * @returns Promise<HabitConfig[]> Array of valid habit configurations
 */
export async function reloadHabitConfig(
  configPath?: string
): Promise<HabitConfig[]> {
  console.log('Reloading habit configuration...');
  return loadHabitConfig(configPath);
}

/**
 * Checks if configuration file exists
 * @param configPath Optional path to configuration file
 * @returns Promise<boolean> True if file exists and is readable
 */
export async function configFileExists(configPath?: string): Promise<boolean> {
  const filePath = configPath || DEFAULT_CONFIG_PATH;

  try {
    await fs.access(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}
