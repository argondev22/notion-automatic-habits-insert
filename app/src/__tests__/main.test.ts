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
      process.env.NOTION_API_KEY = 'test-api-key';
      process.env.TIMEBOX_DATABASE_ID = 'test-database-id';
      process.env.WEBHOOK_SECRET = 'test-webhook-secret';
      process.env.PORT = '3000';
      process.env.TIMEZONE = 'America/New_York';

      const config = loadConfiguration();

      expect(config).toEqual({
        port: 3000,
        timezone: 'America/New_York',
        nodeEnv: 'test', // Jest sets NODE_ENV to 'test'
        configPath: undefined,
      });
    });

    it('should use default values for optional environment variables', () => {
      // Set only required environment variables
      process.env.NOTION_API_KEY = 'test-api-key';
      process.env.TIMEBOX_DATABASE_ID = 'test-database-id';
      process.env.WEBHOOK_SECRET = 'test-webhook-secret';

      const config = loadConfiguration();

      expect(config.port).toBe(8080); // default port
      expect(config.timezone).toBe('UTC'); // default timezone
      expect(config.nodeEnv).toBe('test'); // Jest sets NODE_ENV to 'test'
    });

    it('should include custom config path when provided', () => {
      // Set required environment variables
      process.env.NOTION_API_KEY = 'test-api-key';
      process.env.TIMEBOX_DATABASE_ID = 'test-database-id';
      process.env.WEBHOOK_SECRET = 'test-webhook-secret';
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
      delete process.env.NOTION_API_KEY;
      delete process.env.TIMEBOX_DATABASE_ID;
      delete process.env.WEBHOOK_SECRET;

      expect(() => loadConfiguration()).toThrow('process.exit called');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        '❌ Missing required environment variables:'
      );

      mockExit.mockRestore();
      mockConsoleError.mockRestore();
    });

    it('should exit process when PORT is invalid', () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      const mockConsoleError = jest
        .spyOn(console, 'error')
        .mockImplementation();

      // Set required environment variables but invalid port
      process.env.NOTION_API_KEY = 'test-api-key';
      process.env.TIMEBOX_DATABASE_ID = 'test-database-id';
      process.env.WEBHOOK_SECRET = 'test-webhook-secret';
      process.env.PORT = 'invalid-port';

      expect(() => loadConfiguration()).toThrow('process.exit called');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        '❌ Invalid PORT environment variable: invalid-port'
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
      process.env.NOTION_API_KEY = 'test-api-key';
      process.env.TIMEBOX_DATABASE_ID = 'test-database-id';
      process.env.WEBHOOK_SECRET = 'test-webhook-secret';
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
