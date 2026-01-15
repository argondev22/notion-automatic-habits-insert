/**
 * Notion API specific type definitions
 * Minimal types for Template-Based Habit Scheduler
 */

// ============================================================================
// Notion Database Property Types (Minimal)
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
// Notion Property Value Types (Minimal)
// ============================================================================

/**
 * Property values for habit scheduler (only what we need)
 */
export interface NotionPropertyValues {
  title: {
    title: NotionTitleProperty[];
  };
  select: {
    select: NotionSelectProperty | null;
  };
  multi_select: {
    multi_select: NotionSelectProperty[];
  };
  date: {
    date: NotionDateProperty | null;
  };
}

// ============================================================================
// Timebox Database Specific Types (Minimal)
// ============================================================================

/**
 * Properties specific to the Timebox database (minimal for habit scheduler)
 */
export interface TimeboxProperties {
  Name: NotionPropertyValues['title'];
  TAG: NotionPropertyValues['multi_select'];
  EXPECTED: NotionPropertyValues['date'];
}
