/**
 * Notion API specific type definitions
 * Extended types for better type safety with Notion API responses
 */

// ============================================================================
// Notion Database Property Types
// ============================================================================

/**
 * Notion select property
 */
export interface NotionSelectProperty {
  id: string;
  name: string;
  color: string;
}

/**
 * Notion date property
 */
export interface NotionDateProperty {
  start: string;
  end?: string;
  time_zone?: string;
}

/**
 * Notion title property
 */
export interface NotionTitleProperty {
  type: 'text';
  text: {
    content: string;
    link?: {
      url: string;
    };
  };
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
  plain_text: string;
  href?: string;
}

// ============================================================================
// Notion Property Value Types
// ============================================================================

/**
 * Property values for different Notion property types
 */
export interface NotionPropertyValues {
  title: {
    title: NotionTitleProperty[];
  };
  select: {
    select: NotionSelectProperty | null;
  };
  date: {
    date: NotionDateProperty | null;
  };
  rich_text: {
    rich_text: NotionTitleProperty[];
  };
  number: {
    number: number | null;
  };
  checkbox: {
    checkbox: boolean;
  };
}

// ============================================================================
// Timebox Database Specific Types
// ============================================================================

/**
 * Properties specific to the Timebox database
 */
export interface TimeboxProperties {
  Name: NotionPropertyValues['title'];
  TAG: NotionPropertyValues['select'];
  EXPECTED: NotionPropertyValues['date'];
  STATUS: NotionPropertyValues['select'];
  PRIORITY: NotionPropertyValues['select'];
  NOTES: NotionPropertyValues['rich_text'];
}

/**
 * Timebox database entry (page) structure
 */
export interface TimeboxEntry {
  id: string;
  object: 'page';
  created_time: string;
  last_edited_time: string;
  created_by: {
    object: 'user';
    id: string;
  };
  last_edited_by: {
    object: 'user';
    id: string;
  };
  cover: any;
  icon: any;
  parent: {
    type: 'database_id';
    database_id: string;
  };
  archived: boolean;
  properties: TimeboxProperties;
  url: string;
}

// ============================================================================
// Template Types
// ============================================================================

/**
 * Notion template information
 */
export interface NotionTemplateInfo {
  id: string;
  name: string;
  description?: string;
  properties: Partial<TimeboxProperties>;
}

/**
 * Template creation parameters
 */
export interface TemplateCreateParams {
  templateId: string;
  properties: Partial<TimeboxProperties>;
  parent: {
    database_id: string;
  };
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Notion database query parameters
 */
export interface NotionDatabaseQuery {
  database_id: string;
  filter?: any;
  sorts?: Array<{
    property: string;
    direction: 'ascending' | 'descending';
  }>;
  start_cursor?: string;
  page_size?: number;
}

/**
 * Notion page creation parameters
 */
export interface NotionPageCreate {
  parent: {
    database_id: string;
  };
  properties: Partial<TimeboxProperties>;
  children?: any[];
  icon?: any;
  cover?: any;
}

/**
 * Notion API response wrapper
 */
export interface NotionApiResponse<T> {
  object: 'list';
  results: T[];
  next_cursor: string | null;
  has_more: boolean;
  type?: string;
  page?: any;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Notion API specific error codes
 */
export type NotionErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'object_not_found'
  | 'rate_limited'
  | 'invalid_request'
  | 'conflict_error'
  | 'internal_server_error'
  | 'service_unavailable';

/**
 * Extended Notion error with additional context
 */
export interface NotionApiErrorExtended {
  object: 'error';
  status: number;
  code: NotionErrorCode;
  message: string;
  developer_survey?: string;
  request_id?: string;
}

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Extract property value type from Notion property
 */
export type ExtractPropertyValue<T extends keyof NotionPropertyValues> =
  NotionPropertyValues[T];

/**
 * Helper type for creating property updates
 */
export type PropertyUpdate<T extends keyof TimeboxProperties> = {
  [K in T]: TimeboxProperties[K];
};

/**
 * Type guard for Notion page responses
 */
export function isNotionPage(obj: any): obj is TimeboxEntry {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    obj.object === 'page' &&
    typeof obj.id === 'string' &&
    typeof obj.properties === 'object'
  );
}

/**
 * Type guard for Notion API list responses
 */
export function isNotionApiResponse<T>(obj: any): obj is NotionApiResponse<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    obj.object === 'list' &&
    Array.isArray(obj.results) &&
    typeof obj.has_more === 'boolean'
  );
}
