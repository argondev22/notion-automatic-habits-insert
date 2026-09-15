/**
 * Notion API client wrapper for Template-Based Habit Scheduler
 * Requirements: 3.1, 3.2, 3.3
 */

import { Client } from '@notionhq/client';
import {
  HabitConfig,
  HabitEntry,
  CreateResult,
  isNotionApiError,
} from './types';
import { calculateTimeRange } from './utils/time';

/**
 * Wrapper around Notion API client with habit-specific functionality
 */
export class NotionClientWrapper {
  private client: Client;
  private timeboxDatabaseId: string;
  private timezone: string;

  constructor(
    token: string,
    timeboxDatabaseId: string,
    timezone: string = 'UTC'
  ) {
    if (!token) {
      throw new Error('Notion token is required');
    }
    if (!timeboxDatabaseId) {
      throw new Error('Timebox database ID is required');
    }

    this.client = new Client({
      auth: token,
    });
    this.timeboxDatabaseId = timeboxDatabaseId;
    this.timezone = timezone;
  }

  /**
   * Creates a habit entry using a Notion template
   * Requirements: 3.1, 3.2, 3.3
   */
  async createHabitFromTemplate(habit: HabitConfig): Promise<CreateResult> {
    try {
      // Calculate time range for the habit
      const timeRange = calculateTimeRange(habit, this.timezone);

      console.log(`Creating habit "${habit.name}" with time range:`, {
        start: timeRange.start,
        end: timeRange.end,
        timezone: this.timezone,
      });

      // Create the page using Notion template
      const response = await this.client.pages.create({
        parent: {
          database_id: this.timeboxDatabaseId,
        },
        template: {
          type: 'template_id',
          template_id: habit.templateId,
        },
        properties: {
          TAG: {
            multi_select: [
              {
                name: 'HABIT',
              },
            ],
          },
          EXPECTED: {
            date: {
              start: timeRange.start,
              end: timeRange.end,
            },
          },
        },
      });

      // Extract habit entry information
      const habitEntry: HabitEntry = {
        id: response.id,
        title: habit.name,
        templateUsed: habit.templateId,
        timeRange: `${timeRange.start} - ${timeRange.end}`,
      };

      return {
        success: true,
        habitName: habit.name,
        entry: habitEntry,
      };
    } catch (error) {
      return this.handleNotionError(error, habit.name);
    }
  }

  /**
   * Handles Notion API errors with proper error classification and retry logic
   * Requirements: 6.1, 6.2, 6.3
   */
  private handleNotionError(error: unknown, habitName: string): CreateResult {
    let errorMessage = 'Unknown error occurred';
    let status: number | undefined;
    let code: string | undefined;

    if (isNotionApiError(error)) {
      status = error.status;

      // Human-readable message per status (not used for retry decisions;
      // see isRetryableError, which decides on `status`/`code` directly)
      switch (error.status) {
        case 429: // Rate limited
          errorMessage = `Rate limited by Notion API: ${error.message}`;
          break;
        case 500:
        case 502:
        case 503:
        case 504: // Server errors
          errorMessage = `Notion server error (${error.status}): ${error.message}`;
          break;
        case 400: // Bad request
          errorMessage = `Invalid request to Notion API: ${error.message}`;
          break;
        case 401: // Unauthorized
          errorMessage = `Notion API authentication failed: ${error.message}`;
          break;
        case 403: // Forbidden
          errorMessage = `Notion API access denied: ${error.message}`;
          break;
        case 404: // Not found
          errorMessage = `Notion resource not found: ${error.message}`;
          break;
        default:
          errorMessage = `Notion API error (${error.status}): ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;

      // Node network errors carry a string `code` (e.g. ECONNRESET)
      const maybeCode = (error as NodeJS.ErrnoException).code;
      if (typeof maybeCode === 'string') {
        code = maybeCode;
      }
    }

    // Log the error with context
    console.error(`Failed to create habit "${habitName}":`, {
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      habitName,
      error: errorMessage,
      status,
      code,
    };
  }

  /**
   * Creates a habit with retry logic for transient failures
   * Requirements: 6.2 (retry logic with exponential backoff)
   */
  async createHabitWithRetry(
    habit: HabitConfig,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<CreateResult> {
    let lastError: CreateResult | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await this.createHabitFromTemplate(habit);

      if (result.success) {
        if (attempt > 0) {
          console.log(
            `Successfully created habit "${habit.name}" after ${attempt} retries`
          );
        }
        return result;
      }

      lastError = result;

      // Don't retry on the last attempt or for non-retryable errors
      if (attempt === maxRetries || !this.isRetryableError(result)) {
        break;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(
        `Retrying habit creation for "${habit.name}" in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`
      );

      await this.sleep(delay);
    }

    return lastError!;
  }

  /**
   * Notion API status codes worth retrying (rate limiting and transient
   * server errors)
   */
  private static readonly RETRYABLE_STATUS_CODES = new Set([
    429, 500, 502, 503, 504,
  ]);

  /**
   * Node.js network error codes worth retrying
   */
  private static readonly RETRYABLE_ERROR_CODES = new Set([
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
  ]);

  /**
   * Determines if an error is retryable based on the Notion API status code
   * or the network error code, rather than substring-matching the message
   * (which could false-positive on unrelated messages).
   */
  private isRetryableError(result: CreateResult): boolean {
    if (
      result.status !== undefined &&
      NotionClientWrapper.RETRYABLE_STATUS_CODES.has(result.status)
    ) {
      return true;
    }

    if (
      result.code !== undefined &&
      NotionClientWrapper.RETRYABLE_ERROR_CODES.has(result.code)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validates that the Notion client can connect to the API
   * Useful for startup validation
   */
  async validateConnection(): Promise<{ valid: boolean; error?: string }> {
    try {
      // Try to retrieve the database to validate connection and permissions
      await this.client.databases.retrieve({
        database_id: this.timeboxDatabaseId,
      });

      return { valid: true };
    } catch (error) {
      let errorMessage = 'Failed to validate Notion connection';

      if (isNotionApiError(error)) {
        errorMessage = `Notion API validation failed (${error.status}): ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = `Connection validation failed: ${error.message}`;
      }

      return { valid: false, error: errorMessage };
    }
  }

  /**
   * Gets database information for debugging and validation
   */
  async getDatabaseInfo(): Promise<{
    title: string;
    properties: string[];
  } | null> {
    try {
      const database = await this.client.databases.retrieve({
        database_id: this.timeboxDatabaseId,
      });

      const title =
        'title' in database && Array.isArray(database.title)
          ? database.title.map((t: any) => t.plain_text).join('')
          : 'Unknown Database';

      // Handle properties safely - they might not exist in partial responses
      const properties =
        'properties' in database && database.properties
          ? Object.keys(database.properties)
          : [];

      return { title, properties };
    } catch (error) {
      console.error('Failed to retrieve database info:', error);
      return null;
    }
  }
}

/**
 * Factory function to create NotionClientWrapper with environment configuration
 *
 * @param timezone - IANA timezone used for time-range calculation (defaults to "UTC")
 */
export function createNotionClient(
  timezone: string = 'UTC'
): NotionClientWrapper {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.TIMEBOX_DATABASE_ID;

  if (!token) {
    throw new Error('NOTION_TOKEN environment variable is required');
  }

  if (!databaseId) {
    throw new Error('TIMEBOX_DATABASE_ID environment variable is required');
  }

  return new NotionClientWrapper(token, databaseId, timezone);
}
