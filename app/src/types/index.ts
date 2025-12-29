/**
 * Core data models and interfaces for Template-Based Habit Scheduler
 * Requirements: 7.1, 7.3
 */

// Re-export Notion-specific types
export * from './notion';

// ============================================================================
// Configuration Interfaces
// ============================================================================

/**
 * Configuration for individual habits loaded from habits.json
 */
export interface HabitConfig {
  name: string;
  templateId: string;
  frequency: string[]; // ["monday", "tuesday", "friday"] - specific weekdays only
  startTime: string;   // "07:00"
  endTime: string;     // "08:00"
  enabled: boolean;
}

/**
 * System configuration from environment variables
 */
export interface SystemConfig {
  NOTION_API_KEY: string;
  TIMEBOX_DATABASE_ID: string;
  WEBHOOK_SECRET: string;      // Required for security validation
  PORT: number;
  TIMEZONE: string;
}

// ============================================================================
// Webhook Interfaces
// ============================================================================

/**
 * Incoming webhook request structure
 */
export interface WebhookRequest {
  secret: string;        // Required security parameter
  timestamp?: number;
}

/**
 * Webhook response structure with execution metrics
 */
export interface WebhookResponse {
  success: boolean;
  created: number;
  skipped: number;
  errors: string[];
  executionTime: number;
}

// ============================================================================
// Habit Creation Interfaces
// ============================================================================

/**
 * Result of habit creation process
 */
export interface HabitCreationResult {
  success: boolean;
  created: HabitEntry[];
  skipped: string[];
  errors: string[];
  executionTime: number;
}

/**
 * Individual habit entry that was created
 */
export interface HabitEntry {
  id: string;
  title: string;
  templateUsed: string;
  timeRange: string;
}

/**
 * Result of individual habit creation attempt
 */
export interface CreateResult {
  success: boolean;
  habitName: string;
  entry?: HabitEntry;
  error?: string;
}

// ============================================================================
// Time Calculation Interfaces
// ============================================================================

/**
 * Time range for habit scheduling
 */
export interface TimeRange {
  start: string;  // ISO string format
  end: string;    // ISO string format
}

/**
 * Time calculation parameters
 */
export interface TimeCalculationParams {
  startTime: string;  // "HH:MM" format
  endTime: string;    // "HH:MM" format
  timezone: string;
  date?: Date;        // Defaults to today
}

// ============================================================================
// Notion API Response Types
// ============================================================================

/**
 * Notion page creation response (simplified)
 */
export interface NotionPageResponse {
  id: string;
  object: 'page';
  created_time: string;
  last_edited_time: string;
  properties: Record<string, any>;
  url: string;
}

/**
 * Notion database query response (simplified)
 */
export interface NotionDatabaseResponse {
  object: 'list';
  results: NotionPageResponse[];
  next_cursor: string | null;
  has_more: boolean;
}

/**
 * Notion template reference
 */
export interface NotionTemplate {
  type: 'template_id';
  template_id: string;
}

/**
 * Notion property types for habit entries
 */
export interface NotionHabitProperties {
  TAG: {
    select: {
      name: string;
    };
  };
  EXPECTED: {
    date: {
      start: string;
      end: string;
    };
  };
}

/**
 * Notion page creation request for habits
 */
export interface NotionHabitCreateRequest {
  parent: {
    database_id: string;
  };
  template?: NotionTemplate;
  properties: NotionHabitProperties;
}

// ============================================================================
// Error Handling Interfaces
// ============================================================================

/**
 * Structured error information
 */
export interface ErrorResult {
  success: boolean;
  error?: string;
  canContinue: boolean;
  context?: Record<string, any>;
}

/**
 * Notion API error response
 */
export interface NotionApiError {
  object: 'error';
  status: number;
  code: string;
  message: string;
}

// ============================================================================
// Validation Interfaces
// ============================================================================

/**
 * Configuration validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Habit configuration validation
 */
export interface HabitConfigValidation extends ValidationResult {
  validHabits: HabitConfig[];
  invalidHabits: Array<{
    config: Partial<HabitConfig>;
    errors: string[];
  }>;
}

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Type guard for checking if an object is a valid HabitConfig
 */
export function isHabitConfig(obj: any): obj is HabitConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.name === 'string' &&
    typeof obj.templateId === 'string' &&
    Array.isArray(obj.frequency) &&
    typeof obj.startTime === 'string' &&
    typeof obj.endTime === 'string' &&
    typeof obj.enabled === 'boolean'
  );
}

/**
 * Type guard for checking if an object is a valid WebhookRequest
 */
export function isWebhookRequest(obj: any): obj is WebhookRequest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.secret === 'string' &&
    (obj.timestamp === undefined || typeof obj.timestamp === 'number')
  );
}

/**
 * Type guard for Notion API errors
 */
export function isNotionApiError(obj: any): obj is NotionApiError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    obj.object === 'error' &&
    typeof obj.status === 'number' &&
    typeof obj.code === 'string' &&
    typeof obj.message === 'string'
  );
}
