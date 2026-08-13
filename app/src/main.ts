/**
 * Main application entry point for Template-Based Habit Scheduler
 *
 * This is a one-shot CLI script: it is invoked once per run (by a GitHub
 * Actions cron job), performs the scheduled habit creation, and exits.
 * There is no server, no HTTP listener, and no signal handling — the
 * process runs to completion and reports its result via the exit code.
 * Requirements: 1.1, 1.2, 1.3
 */

import { createNotionClient } from './notion-client';
import { createHabitManager } from './habit-manager';

/**
 * Application configuration loaded from environment variables
 */
interface AppConfig {
  timezone: string;
  configPath?: string;
}

/**
 * Load and validate environment configuration
 * Requirements: 1.1, 7.1, 7.3
 */
function loadConfiguration(): AppConfig {
  console.log('Loading application configuration...');

  // Required environment variables
  const requiredVars = ['NOTION_TOKEN', 'TIMEBOX_DATABASE_ID'];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`  - ${varName}`);
    });
    console.error(
      '\nPlease set all required environment variables and try again.'
    );
    process.exit(1);
  }

  const timezone = process.env.TIMEZONE || 'UTC';

  // Validate timezone if provided
  if (process.env.TIMEZONE) {
    try {
      new Date().toLocaleString('en-US', { timeZone: timezone });
    } catch {
      console.error(`❌ Invalid TIMEZONE environment variable: ${timezone}`);
      console.error(
        'Please provide a valid timezone (e.g., "America/New_York", "Asia/Tokyo")'
      );
      process.exit(1);
    }
  }

  const configPath = process.env.HABIT_CONFIG_PATH; // Optional custom config path

  console.log('✓ Configuration loaded successfully');
  console.log(`  - Timezone: ${timezone}`);
  if (configPath) {
    console.log(`  - Custom config path: ${configPath}`);
  }

  return {
    timezone,
    configPath,
  };
}

/**
 * Main application entry point
 *
 * Runs the full habit-creation job once and resolves. The caller
 * (the module-level bootstrap below) is responsible for translating the
 * outcome into a process exit code.
 * Requirements: 1.1, 1.2, 1.3
 */
async function main(): Promise<void> {
  console.log('🌟 Template-Based Habit Scheduler');
  console.log('=====================================');

  // 1. Load and validate configuration
  const config = loadConfiguration();

  // 2. Create Notion client and Habit Manager
  console.log('Creating Notion API client...');
  const notionClient = createNotionClient();

  console.log('Creating Habit Manager...');
  const habitManager = createHabitManager(
    notionClient,
    config.configPath,
    config.timezone
  );

  // 3. Validate system before running
  console.log('Validating system configuration...');
  const validation = await habitManager.validateSystem();

  if (!validation.valid) {
    console.error('❌ System validation failed:');
    validation.errors.forEach(error => {
      console.error(`  - ${error}`);
    });
    console.error('\nPlease fix the configuration issues and try again.');
    process.exit(1);
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️  System validation warnings:');
    validation.warnings.forEach(warning => {
      console.warn(`  - ${warning}`);
    });
  }

  console.log('✓ System validation passed');

  // 4. Run the habit creation job
  const result = await habitManager.createScheduledHabits();

  // 5. Log a concise summary and exit with a code GitHub Actions can key off
  console.log('\n📊 Run Summary');
  console.log(`  - Created: ${result.created.length}`);
  console.log(`  - Skipped: ${result.skipped.length}`);
  console.log(`  - Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.error('❌ Habit creation completed with errors:');
    result.errors.forEach(error => {
      console.error(`  - ${error}`);
    });
    process.exit(1);
  }

  console.log('✓ Habit creation completed successfully');
  process.exit(0);
}

// Start the application
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error during application run:', error);
    process.exit(1);
  });
}

// Export for testing purposes
export { main, loadConfiguration };
