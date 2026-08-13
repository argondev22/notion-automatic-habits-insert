/**
 * Tests for core data model interfaces
 * Validates type guards and interface structure
 */

import {
  HabitConfig,
  HabitCreationResult,
  HabitEntry,
  SystemConfig,
  NotionTemplate,
  isHabitConfig,
  isNotionApiError,
} from '../index';

describe('Core Data Model Interfaces', () => {
  describe('HabitConfig interface', () => {
    it('should accept valid habit configuration', () => {
      const validConfig: HabitConfig = {
        name: 'Morning Exercise',
        templateId: 'template-123',
        frequency: ['monday', 'wednesday', 'friday'],
        startTime: '07:00',
        endTime: '08:00',
        enabled: true,
      };

      expect(isHabitConfig(validConfig)).toBe(true);
    });

    it('should reject invalid habit configuration', () => {
      const invalidConfig = {
        name: 'Morning Exercise',
        templateId: 'template-123',
        // Missing required fields
      };

      expect(isHabitConfig(invalidConfig)).toBe(false);
    });

    it('should handle frequency arrays correctly', () => {
      const weekdayConfig: HabitConfig = {
        name: 'Weekday Standup',
        templateId: 'template-456',
        frequency: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        startTime: '09:00',
        endTime: '09:30',
        enabled: true,
      };

      expect(isHabitConfig(weekdayConfig)).toBe(true);
      expect(Array.isArray(weekdayConfig.frequency)).toBe(true);
    });

    it('should handle single day frequency', () => {
      const sundayConfig: HabitConfig = {
        name: 'Weekly Review',
        templateId: 'template-789',
        frequency: ['sunday'],
        startTime: '19:00',
        endTime: '20:00',
        enabled: true,
      };

      expect(isHabitConfig(sundayConfig)).toBe(true);
      expect(sundayConfig.frequency).toEqual(['sunday']);
    });
  });

  describe('NotionTemplate interface', () => {
    it('should support all template types', () => {
      const noneTemplate: NotionTemplate = {
        type: 'none',
      };

      const defaultTemplate: NotionTemplate = {
        type: 'default',
      };

      const specificTemplate: NotionTemplate = {
        type: 'template_id',
        template_id: 'a5da15f6-b853-455d-8827-f906fb52db2b',
      };

      expect(noneTemplate.type).toBe('none');
      expect(defaultTemplate.type).toBe('default');
      expect(specificTemplate.type).toBe('template_id');
      expect(specificTemplate.template_id).toBeDefined();
    });
  });

  describe('HabitCreationResult interface', () => {
    it('should structure creation result correctly', () => {
      const habitEntry: HabitEntry = {
        id: 'page-123',
        title: 'Morning Exercise',
        templateUsed: 'template-123',
        timeRange: '07:00-08:00',
      };

      const result: HabitCreationResult = {
        success: true,
        created: [habitEntry],
        skipped: ['Disabled habit'],
        errors: [],
        executionTime: 2000,
      };

      expect(result.success).toBe(true);
      expect(result.created.length).toBe(1);
      expect(result.created[0].id).toBe('page-123');
      expect(Array.isArray(result.skipped)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('SystemConfig interface', () => {
    it('should define all required environment variables', () => {
      const config: SystemConfig = {
        NOTION_API_KEY: 'secret_test_key',
        TIMEBOX_DATABASE_ID: 'database_test_id',
        TIMEZONE: 'Asia/Tokyo',
      };

      expect(typeof config.NOTION_API_KEY).toBe('string');
      expect(typeof config.TIMEBOX_DATABASE_ID).toBe('string');
      expect(typeof config.TIMEZONE).toBe('string');
    });
  });

  describe('NotionTemplate interface', () => {
    it('should support all template types', () => {
      const noneTemplate: NotionTemplate = {
        type: 'none',
      };

      const defaultTemplate: NotionTemplate = {
        type: 'default',
      };

      const specificTemplate: NotionTemplate = {
        type: 'template_id',
        template_id: 'a5da15f6-b853-455d-8827-f906fb52db2b',
      };

      expect(noneTemplate.type).toBe('none');
      expect(defaultTemplate.type).toBe('default');
      expect(specificTemplate.type).toBe('template_id');
      expect(specificTemplate.template_id).toBeDefined();
    });
  });

  describe('Type guards', () => {
    it('should correctly identify Notion API errors', () => {
      const notionError = {
        object: 'error',
        status: 401,
        code: 'unauthorized',
        message: 'API token is invalid',
      };

      expect(isNotionApiError(notionError)).toBe(true);
    });

    it('should reject non-error objects', () => {
      const notError = {
        object: 'page',
        id: 'page-123',
      };

      expect(isNotionApiError(notError)).toBe(false);
    });
  });
});
