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
// Target Database Property Types (Minimal)
// ============================================================================

/**
 * Properties this scheduler writes on a habit page in the target Notion
 * database (minimal for habit scheduler)
 */
export interface HabitPageProperties {
  NAME: NotionPropertyValues['title'];
  DATE: NotionPropertyValues['date'];
  TYPE: NotionPropertyValues['multi_select'];
}
