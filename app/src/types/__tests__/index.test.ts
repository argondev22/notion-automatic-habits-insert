/**
 * Tests for core data model interfaces
 * Validates type guards and interface structure
 */

import {
  HabitConfig,
  WebhookRequest,
  WebhookResponse,
  HabitCreationResult,
  HabitEntry,
  SystemConfig,
  NotionTemplate,
  isHabitConfig,
  isWebhookRequest,
  isNotionApiError
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
        enabled: true
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
        enabled: true
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
        enabled: true
      };

      expect(isHabitConfig(sundayConfig)).toBe(true);
      expect(sundayConfig.frequency).toEqual(['sunday']);
    });
  });

  describe('NotionTemplate interface', () => {
    it('should support all template types', () => {
      const noneTemplate: NotionTemplate = {
        type: "none"
      };

      const defaultTemplate: NotionTemplate = {
        type: "default"
      };

      const specificTemplate: NotionTemplate = {
        type: "template_id",
        template_id: "a5da15f6-b853-455d-8827-f906fb52db2b"
      };

      expect(noneTemplate.type).toBe("none");
      expect(defaultTemplate.type).toBe("default");
      expect(specificTemplate.type).toBe("template_id");
      expect(specificTemplate.template_id).toBeDefined();
    });
  });

  describe('WebhookRequest interface', () => {
    it('should accept valid webhook request', () => {
      const validRequest: WebhookRequest = {
        secret: 'test-secret-123',
        timestamp: Date.now()
      };

      expect(isWebhookRequest(validRequest)).toBe(true);
    });

    it('should accept webhook request without timestamp', () => {
      const validRequest: WebhookRequest = {
        secret: 'test-secret-123'
      };

      expect(isWebhookRequest(validRequest)).toBe(true);
    });

    it('should reject webhook request without secret', () => {
      const invalidRequest = {
        timestamp: Date.now()
      };

      expect(isWebhookRequest(invalidRequest)).toBe(false);
    });
  });

  describe('WebhookResponse interface', () => {
    it('should structure response correctly', () => {
      const response: WebhookResponse = {
        success: true,
        created: 3,
        skipped: 1,
        errors: [],
        executionTime: 1500
      };

      expect(response.success).toBe(true);
      expect(typeof response.created).toBe('number');
      expect(typeof response.skipped).toBe('number');
      expect(Array.isArray(response.errors)).toBe(true);
      expect(typeof response.executionTime).toBe('number');
    });

    it('should handle error responses', () => {
      const errorResponse: WebhookResponse = {
        success: false,
        created: 0,
        skipped: 0,
        errors: ['Failed to connect to Notion API', 'Invalid template ID'],
        executionTime: 500
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.errors.length).toBe(2);
    });
  });

  describe('HabitCreationResult interface', () => {
    it('should structure creation result correctly', () => {
      const habitEntry: HabitEntry = {
        id: 'page-123',
        title: 'Morning Exercise',
        templateUsed: 'template-123',
        timeRange: '07:00-08:00'
      };

      const result: HabitCreationResult = {
        success: true,
        created: [habitEntry],
        skipped: ['Disabled habit'],
        errors: [],
        executionTime: 2000
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
        WEBHOOK_SECRET: 'webhook_secret_123',
        PORT: 8080,
        TIMEZONE: 'Asia/Tokyo'
      };

      expect(typeof config.NOTION_API_KEY).toBe('string');
      expect(typeof config.TIMEBOX_DATABASE_ID).toBe('string');
      expect(typeof config.WEBHOOK_SECRET).toBe('string');
      expect(typeof config.PORT).toBe('number');
      expect(typeof config.TIMEZONE).toBe('string');
    });
  });

  describe('NotionTemplate interface', () => {
    it('should support all template types', () => {
      const noneTemplate: NotionTemplate = {
        type: "none"
      };

      const defaultTemplate: NotionTemplate = {
        type: "default"
      };

      const specificTemplate: NotionTemplate = {
        type: "template_id",
        template_id: "a5da15f6-b853-455d-8827-f906fb52db2b"
      };

      expect(noneTemplate.type).toBe("none");
      expect(defaultTemplate.type).toBe("default");
      expect(specificTemplate.type).toBe("template_id");
      expect(specificTemplate.template_id).toBeDefined();
    });
  });

  describe('Type guards', () => {
    it('should correctly identify Notion API errors', () => {
      const notionError = {
        object: 'error',
        status: 401,
        code: 'unauthorized',
        message: 'API token is invalid'
      };

      expect(isNotionApiError(notionError)).toBe(true);
    });

    it('should reject non-error objects', () => {
      const notError = {
        object: 'page',
        id: 'page-123'
      };

      expect(isNotionApiError(notError)).toBe(false);
    });
  });
});
