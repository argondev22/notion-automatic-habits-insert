/**
 * HabitManager - Core component for Template-Based Habit Scheduler
 * Requirements: 2.1, 2.2, 6.1, 6.3
 */

import {
  HabitConfig,
  HabitCreationResult,
  HabitEntry,
  CreateResult,
} from './types';
import { loadHabitConfig } from './config/loader';
import { getHabitsDueToday } from './utils/scheduling';
import { NotionClientWrapper } from './notion-client';

/**
 * Core component that manages habit creation process
 * Integrates configuration loading, scheduling logic, and Notion API
 */
export class HabitManager {
  private notionClient: NotionClientWrapper;
  private configPath?: string;

  constructor(notionClient: NotionClientWrapper, configPath?: string) {
    this.notionClient = notionClient;
    this.configPath = configPath;
  }

  /**
   * Main function to create all scheduled habits for today
   * Requirements: 2.1, 2.2, 6.1, 6.3
   */
  async createScheduledHabits(): Promise<HabitCreationResult> {
    const startTime = Date.now();
    const results: CreateResult[] = [];
    const errors: string[] = [];

    try {
      console.log('Starting habit creation process...');

      // 1. Load habit configuration
      const habits = await this.loadHabitConfiguration();
      console.log(`Loaded ${habits.length} habit configuration(s)`);

      // 2. Filter habits due today
      const dueHabits = getHabitsDueToday(habits);
      console.log(`Found ${dueHabits.length} habit(s) due today`);

      if (dueHabits.length === 0) {
        console.log('No habits scheduled for today');
        return {
          success: true,
          created: [],
          skipped: [],
          errors: [],
          executionTime: Date.now() - startTime,
        };
      }

      // 3. Create each habit using Notion template with retry logic
      console.log('Creating habits...');
      for (const habit of dueHabits) {
        try {
          console.log(`Processing habit: ${habit.name}`);
          const result = await this.notionClient.createHabitWithRetry(habit);
          results.push(result);

          if (result.success) {
            console.log(`✓ Successfully created habit: ${habit.name}`);
          } else {
            console.error(
              `✗ Failed to create habit: ${habit.name} - ${result.error}`
            );
          }
        } catch (error) {
          // This should not happen as createHabitWithRetry handles all errors
          // But we include it for robustness
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          console.error(
            `✗ Unexpected error creating habit ${habit.name}:`,
            errorMessage
          );

          results.push({
            success: false,
            habitName: habit.name,
            error: errorMessage,
          });
        }
      }

      // 4. Aggregate results
      const aggregatedResult = this.aggregateResults(results, startTime);

      // 5. Log summary
      this.logExecutionSummary(aggregatedResult);

      return aggregatedResult;
    } catch (error) {
      // Configuration loading or other critical errors
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Critical error in habit creation process:', errorMessage);

      errors.push(errorMessage);

      return {
        success: false,
        created: [],
        skipped: [],
        errors,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Load habit configuration with comprehensive error handling
   * Requirements: 7.1, 7.2, 6.1
   */
  private async loadHabitConfiguration(): Promise<HabitConfig[]> {
    try {
      const habits = await loadHabitConfig(this.configPath);

      if (habits.length === 0) {
        console.warn('No habits found in configuration file');
      }

      return habits;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load configuration';
      console.error('Configuration loading failed:', errorMessage);

      // Re-throw with more context
      throw new Error(`Configuration loading failed: ${errorMessage}`);
    }
  }

  /**
   * Aggregate individual habit creation results into final result
   * Requirements: 6.1, 6.3
   */
  private aggregateResults(
    results: CreateResult[],
    startTime: number
  ): HabitCreationResult {
    const created: HabitEntry[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const result of results) {
      if (result.success && result.entry) {
        created.push(result.entry);
      } else {
        skipped.push(result.habitName);
        if (result.error) {
          errors.push(`${result.habitName}: ${result.error}`);
        }
      }
    }

    const success = errors.length === 0;
    const executionTime = Date.now() - startTime;

    return {
      success,
      created,
      skipped,
      errors,
      executionTime,
    };
  }

  /**
   * Log execution summary for monitoring and debugging
   * Requirements: 6.1, 8.1, 8.2
   */
  private logExecutionSummary(result: HabitCreationResult): void {
    const { success, created, skipped, errors, executionTime } = result;

    console.log('\n=== Habit Creation Summary ===');
    console.log(`Status: ${success ? 'SUCCESS' : 'PARTIAL_FAILURE'}`);
    console.log(`Execution time: ${executionTime}ms`);
    console.log(`Created: ${created.length} habit(s)`);
    console.log(`Skipped: ${skipped.length} habit(s)`);
    console.log(`Errors: ${errors.length}`);

    if (created.length > 0) {
      console.log('\nCreated habits:');
      created.forEach(habit => {
        console.log(`  - ${habit.title} (${habit.timeRange})`);
      });
    }

    if (skipped.length > 0) {
      console.log('\nSkipped habits:');
      skipped.forEach(habitName => {
        console.log(`  - ${habitName}`);
      });
    }

    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }

    console.log('==============================\n');
  }

  /**
   * Validate system configuration and connectivity
   * Useful for startup checks and health monitoring
   * Requirements: 7.1, 7.3, 6.1
   */
  async validateSystem(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Validate Notion connection
      console.log('Validating Notion API connection...');
      const notionValidation = await this.notionClient.validateConnection();

      if (!notionValidation.valid) {
        errors.push(`Notion API validation failed: ${notionValidation.error}`);
      } else {
        console.log('✓ Notion API connection validated');
      }

      // 2. Validate configuration loading
      console.log('Validating habit configuration...');
      try {
        const habits = await this.loadHabitConfiguration();

        if (habits.length === 0) {
          warnings.push('No habits found in configuration file');
        } else {
          console.log(
            `✓ Configuration validated: ${habits.length} habit(s) loaded`
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Configuration validation failed';
        errors.push(errorMessage);
      }

      // 3. Validate environment variables
      console.log('Validating environment configuration...');
      const envValidation = this.validateEnvironmentConfig();
      errors.push(...envValidation.errors);
      warnings.push(...envValidation.warnings);

      if (envValidation.errors.length === 0) {
        console.log('✓ Environment configuration validated');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'System validation failed';
      errors.push(`System validation error: ${errorMessage}`);
    }

    const valid = errors.length === 0;

    console.log(`\nSystem validation ${valid ? 'PASSED' : 'FAILED'}`);
    if (errors.length > 0) {
      console.log('Validation errors:', errors);
    }
    if (warnings.length > 0) {
      console.log('Validation warnings:', warnings);
    }

    return { valid, errors, warnings };
  }

  /**
   * Validate required environment variables
   * Requirements: 7.1, 7.3
   */
  private validateEnvironmentConfig(): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required environment variables
    const requiredVars = [
      'NOTION_API_KEY',
      'TIMEBOX_DATABASE_ID',
      'WEBHOOK_SECRET',
    ];

    for (const varName of requiredVars) {
      const value = process.env[varName];

      if (!value) {
        errors.push(`Missing required environment variable: ${varName}`);
      } else if (value.trim().length === 0) {
        errors.push(`Empty environment variable: ${varName}`);
      }
    }

    // Optional but recommended variables
    const optionalVars = ['TIMEZONE', 'PORT'];

    for (const varName of optionalVars) {
      const value = process.env[varName];

      if (!value) {
        warnings.push(
          `Optional environment variable not set: ${varName} (will use default)`
        );
      }
    }

    // Validate timezone if provided
    const timezone = process.env.TIMEZONE;
    if (timezone) {
      try {
        new Date().toLocaleString('en-US', { timeZone: timezone });
      } catch {
        errors.push(`Invalid TIMEZONE environment variable: ${timezone}`);
      }
    }

    // Validate port if provided
    const port = process.env.PORT;
    if (port) {
      const portNum = parseInt(port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        errors.push(
          `Invalid PORT environment variable: ${port} (must be 1-65535)`
        );
      }
    }

    return { errors, warnings };
  }

  /**
   * Get system status and metrics for monitoring
   * Requirements: 8.1, 8.2, 8.3
   */
  async getSystemStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    metrics: {
      configurationLoaded: boolean;
      notionConnected: boolean;
      habitsCount: number;
      dueTodayCount: number;
    };
    errors: string[];
  }> {
    const timestamp = new Date().toISOString();
    const errors: string[] = [];
    let configurationLoaded = false;
    let notionConnected = false;
    let habitsCount = 0;
    let dueTodayCount = 0;

    try {
      // Check Notion connection
      const notionValidation = await this.notionClient.validateConnection();
      notionConnected = notionValidation.valid;

      if (!notionConnected && notionValidation.error) {
        errors.push(`Notion: ${notionValidation.error}`);
      }

      // Check configuration
      try {
        const habits = await this.loadHabitConfiguration();
        configurationLoaded = true;
        habitsCount = habits.length;
        dueTodayCount = getHabitsDueToday(habits).length;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Configuration error';
        errors.push(`Configuration: ${errorMessage}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'System status check failed';
      errors.push(`System: ${errorMessage}`);
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (errors.length === 0) {
      status = 'healthy';
    } else if (configurationLoaded || notionConnected) {
      status = 'degraded'; // Some functionality works
    } else {
      status = 'unhealthy'; // Critical systems down
    }

    return {
      status,
      timestamp,
      metrics: {
        configurationLoaded,
        notionConnected,
        habitsCount,
        dueTodayCount,
      },
      errors,
    };
  }
}

/**
 * Factory function to create HabitManager with default configuration
 * Requirements: 7.1, 7.3
 */
export function createHabitManager(
  notionClient: NotionClientWrapper,
  configPath?: string
): HabitManager {
  return new HabitManager(notionClient, configPath);
}
