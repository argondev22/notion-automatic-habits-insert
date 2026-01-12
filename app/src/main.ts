/**
 * Main application entry point for Template-Based Habit Scheduler
 * Requirements: 1.1, 1.2, 1.3
 */

import { createNotionClient } from './notion-client';
import { createHabitManager } from './habit-manager';
import { createWebhookServer } from './webhook-server';

/**
 * Application configuration loaded from environment variables
 */
interface AppConfig {
  port: number;
  timezone: string;
  nodeEnv: string;
  configPath?: string;
}

/**
 * Application state for managing lifecycle
 */
interface AppState {
  habitManager?: any;
  webhookServer?: any;
  isShuttingDown: boolean;
}

const appState: AppState = {
  isShuttingDown: false,
};

/**
 * Load and validate environment configuration
 * Requirements: 1.1, 7.1, 7.3
 */
function loadConfiguration(): AppConfig {
  console.log('Loading application configuration...');

  // Required environment variables
  const requiredVars = [
    'NOTION_API_KEY',
    'TIMEBOX_DATABASE_ID',
    'WEBHOOK_SECRET',
  ];

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

  // Validate and parse optional configuration
  const port = parseInt(process.env.PORT || '8080', 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(`❌ Invalid PORT environment variable: ${process.env.PORT}`);
    console.error('PORT must be a number between 1 and 65535');
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

  const nodeEnv = process.env.NODE_ENV || 'development';
  const configPath = process.env.HABIT_CONFIG_PATH; // Optional custom config path

  console.log('✓ Configuration loaded successfully');
  console.log(`  - Port: ${port}`);
  console.log(`  - Timezone: ${timezone}`);
  console.log(`  - Environment: ${nodeEnv}`);
  if (configPath) {
    console.log(`  - Custom config path: ${configPath}`);
  }

  return {
    port,
    timezone,
    nodeEnv,
    configPath,
  };
}

/**
 * Initialize application components
 * Requirements: 1.2, 2.1, 5.1
 */
async function initializeApplication(config: AppConfig): Promise<void> {
  console.log('\n🚀 Initializing Template-Based Habit Scheduler...');

  try {
    // 1. Create Notion client
    console.log('Creating Notion API client...');
    const notionClient = createNotionClient();

    // 2. Create HabitManager
    console.log('Creating Habit Manager...');
    const habitManager = createHabitManager(notionClient, config.configPath);
    appState.habitManager = habitManager;

    // 3. Validate system before starting server
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

    // 4. Create and start webhook server
    console.log('Creating webhook server...');
    const webhookServer = createWebhookServer(habitManager, config.port);
    appState.webhookServer = webhookServer;

    console.log('Starting webhook server...');
    await webhookServer.start();

    console.log('\n🎉 Application started successfully!');
    console.log(`📋 Health check: http://localhost:${config.port}/health`);
    console.log(`🔗 Webhook endpoint: http://localhost:${config.port}/webhook`);
    console.log('\n📊 System Status:');

    // Display system status
    const systemStatus = await habitManager.getSystemStatus();
    console.log(`  - Status: ${systemStatus.status.toUpperCase()}`);
    console.log(`  - Habits configured: ${systemStatus.metrics.habitsCount}`);
    console.log(`  - Habits due today: ${systemStatus.metrics.dueTodayCount}`);
    console.log(
      `  - Notion connected: ${systemStatus.metrics.notionConnected ? '✓' : '✗'}`
    );

    if (systemStatus.errors.length > 0) {
      console.log('\n⚠️  System Issues:');
      systemStatus.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }

    console.log('\n💡 Ready to receive webhook requests!');
    console.log('Press Ctrl+C to gracefully shutdown the application.');
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);

    if (error instanceof Error) {
      console.error(`Error details: ${error.message}`);

      // Provide helpful error messages for common issues
      if (error.message.includes('NOTION_API_KEY')) {
        console.error(
          '\n💡 Tip: Make sure your Notion API key is valid and has access to the database.'
        );
      } else if (error.message.includes('TIMEBOX_DATABASE_ID')) {
        console.error(
          '\n💡 Tip: Make sure the database ID is correct and the integration has access.'
        );
      } else if (error.message.includes('WEBHOOK_SECRET')) {
        console.error('\n💡 Tip: Set a strong webhook secret for security.');
      }
    }

    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 * Requirements: 1.3
 */
async function gracefulShutdown(signal: string): Promise<void> {
  if (appState.isShuttingDown) {
    console.log('Shutdown already in progress...');
    return;
  }

  appState.isShuttingDown = true;
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    // Stop webhook server first to prevent new requests
    if (appState.webhookServer) {
      console.log('Stopping webhook server...');
      await appState.webhookServer.stop();
    }

    // Give any ongoing operations time to complete
    console.log('Waiting for ongoing operations to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('✓ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
}

/**
 * Setup signal handlers for graceful shutdown
 * Requirements: 1.3
 */
function setupSignalHandlers(): void {
  // Handle SIGTERM (Docker, Kubernetes, etc.)
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', error => {
    console.error('❌ Uncaught Exception:', error);
    console.error('Stack trace:', error.stack);

    // Try to shutdown gracefully, but force exit if it takes too long
    setTimeout(() => {
      console.error('❌ Forced shutdown due to uncaught exception');
      process.exit(1);
    }, 5000);

    gracefulShutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('Reason:', reason);

    // Try to shutdown gracefully, but force exit if it takes too long
    setTimeout(() => {
      console.error('❌ Forced shutdown due to unhandled rejection');
      process.exit(1);
    }, 5000);

    gracefulShutdown('unhandledRejection');
  });
}

/**
 * Main application entry point
 * Requirements: 1.1, 1.2, 1.3
 */
async function main(): Promise<void> {
  console.log('🌟 Template-Based Habit Scheduler');
  console.log('=====================================');

  try {
    // 1. Setup signal handlers for graceful shutdown
    setupSignalHandlers();

    // 2. Load and validate configuration
    const config = loadConfiguration();

    // 3. Initialize and start application
    await initializeApplication(config);

    // Application is now running and will continue until shutdown signal
  } catch (error) {
    console.error('❌ Application startup failed:', error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error during application startup:', error);
    process.exit(1);
  });
}

// Export for testing purposes
export { main, loadConfiguration, initializeApplication, gracefulShutdown };
