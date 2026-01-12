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

  constructor(apiKey: string, timeboxDatabaseId: string) {
    if (!apiKey) {
      throw new Error('Notion API key is required');
    }
    if (!timeboxDatabaseId) {
      throw new Error('Timebox database ID is required');
    }

    this.client = new Client({
      auth: apiKey,
    });
    this.timeboxDatabaseId = timeboxDatabaseId;
  }

  /**
   * Creates a habit entry using a Notion template
   * Requirements: 3.1, 3.2, 3.3
   */
  async createHabitFromTemplate(habit: HabitConfig): Promise<CreateResult> {
    try {
      // Calculate time range for the habit
      const timeRange = calculateTimeRange(
        habit,
        process.env.TIMEZONE || 'UTC'
      );

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
            select: {
              name: 'HABIT',
            },
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
    let canRetry = false;

    if (isNotionApiError(error)) {
      errorMessage = `Notion API Error (${error.status}): ${error.message}`;

      // Determine if error is retryable
      switch (error.status) {
        case 429: // Rate limited
          canRetry = true;
          errorMessage = `Rate limited by Notion API: ${error.message}`;
          break;
        case 500:
        case 502:
        case 503:
        case 504: // Server errors
          canRetry = true;
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
      // Network errors might be retryable
      if (
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND')
      ) {
        canRetry = true;
      }
    }

    // Log the error with context
    console.error(`Failed to create habit "${habitName}":`, {
      error: errorMessage,
      canRetry,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      habitName,
      error: errorMessage,
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
      if (attempt === maxRetries || !this.isRetryableError(result.error)) {
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
   * Determines if an error is retryable based on the error message
   */
  private isRetryableError(errorMessage?: string): boolean {
    if (!errorMessage) return false;

    const retryablePatterns = [
      'Rate limited',
      'server error',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      '429',
      '500',
      '502',
      '503',
      '504',
    ];

    return retryablePatterns.some(pattern =>
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
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
 */
export function createNotionClient(): NotionClientWrapper {
  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.TIMEBOX_DATABASE_ID;

  if (!apiKey) {
    throw new Error('NOTION_API_KEY environment variable is required');
  }

  if (!databaseId) {
    throw new Error('TIMEBOX_DATABASE_ID environment variable is required');
  }

  return new NotionClientWrapper(apiKey, databaseId);
}
