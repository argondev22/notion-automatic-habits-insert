/**
 * Tests for main.ts application entry point
 * Requirements: 1.1, 1.2, 1.3
 */

import { loadConfiguration } from '../main';

describe('Main Application', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('loadConfiguration', () => {
    it('should load configuration with all required environment variables', () => {
      // Set required environment variables
      process.env.NOTION_TOKEN = 'test-api-key';
      process.env.TIMEBOX_DATABASE_ID = 'test-database-id';
      process.env.TIMEZONE = 'America/New_York';

      const config = loadConfiguration();

      expect(config).toEqual({
        timezone: 'America/New_York',
        configPath: undefined,
      });
    });

    it('should use default value for optional TIMEZONE environment variable', () => {
      // Set only required environment variables
      process.env.NOTION_TOKEN = 'test-api-key';
      process.env.TIMEBOX_DATABASE_ID = 'test-database-id';

      const config = loadConfiguration();

      expect(config.timezone).toBe('UTC'); // default timezone
    });

    it('should include custom config path when provided', () => {
      // Set required environment variables
      process.env.NOTION_TOKEN = 'test-api-key';
      process.env.TIMEBOX_DATABASE_ID = 'test-database-id';
      process.env.HABIT_CONFIG_PATH = '/custom/path/habits.json';

      const config = loadConfiguration();

      expect(config.configPath).toBe('/custom/path/habits.json');
    });

    it('should exit process when required environment variables are missing', () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      const mockConsoleError = jest
        .spyOn(console, 'error')
        .mockImplementation();

      // Don't set required environment variables
      delete process.env.NOTION_TOKEN;
      delete process.env.TIMEBOX_DATABASE_ID;

      expect(() => loadConfiguration()).toThrow('process.exit called');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        '❌ Missing required environment variables:'
      );

      mockExit.mockRestore();
      mockConsoleError.mockRestore();
    });

    it('should exit process when TIMEZONE is invalid', () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      const mockConsoleError = jest
        .spyOn(console, 'error')
        .mockImplementation();

      // Set required environment variables but invalid timezone
      process.env.NOTION_TOKEN = 'test-api-key';
      process.env.TIMEBOX_DATABASE_ID = 'test-database-id';
      process.env.TIMEZONE = 'Invalid/Timezone';

      expect(() => loadConfiguration()).toThrow('process.exit called');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        '❌ Invalid TIMEZONE environment variable: Invalid/Timezone'
      );

      mockExit.mockRestore();
      mockConsoleError.mockRestore();
    });
  });
});
