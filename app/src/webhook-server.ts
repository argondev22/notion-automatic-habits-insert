/**
 * WebhookServer - HTTP endpoint handling with security validation
 * Requirements: 5.1, 5.2, 5.3, 8.1, 8.2
 */

import express, { Request, Response, Application, NextFunction } from 'express';
import { Server } from 'http';
import { HabitManager } from './habit-manager';
import { WebhookResponse, isWebhookRequest } from './types';

/**
 * WebhookServer class that handles HTTP requests with security validation
 * Provides secure endpoint for triggering habit creation process
 */
export class WebhookServer {
  private app: Application;
  private habitManager: HabitManager;
  private webhookSecret: string;
  private port: number;
  private server?: Server;

  constructor(habitManager: HabitManager, port: number = 8080) {
    this.habitManager = habitManager;
    this.port = port;
    this.webhookSecret = this.getWebhookSecret();
    this.app = this.setupExpressApp();
  }

  /**
   * Get webhook secret from environment variables
   * Requirements: 8.1, 8.2
   */
  private getWebhookSecret(): string {
    const secret = process.env.WEBHOOK_SECRET;

    if (!secret) {
      throw new Error(
        'WEBHOOK_SECRET environment variable is required for security validation'
      );
    }

    if (secret.trim().length === 0) {
      throw new Error('WEBHOOK_SECRET cannot be empty');
    }

    return secret;
  }

  /**
   * Set up Express.js application with middleware and routes
   * Requirements: 5.1, 5.2
   */
  private setupExpressApp(): Application {
    const app = express();

    // Middleware for parsing JSON requests
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Health check endpoint (no authentication required)
    app.get('/health', this.handleHealthCheck.bind(this));

    // Main webhook endpoint with security validation
    app.post('/webhook', this.handleWebhook.bind(this));

    // Catch-all for unsupported routes
    app.all('*', this.handleNotFound.bind(this));

    // Global error handler
    app.use(this.handleError.bind(this));

    return app;
  }

  /**
   * Validate webhook secret from request
   * Requirements: 8.1, 8.2
   */
  private validateSecret(request: Request): boolean {
    // Check for secret in request body first, then query parameters
    const providedSecret = request.body?.secret || request.query?.secret;

    if (!providedSecret) {
      console.warn('Webhook request missing secret parameter');
      return false;
    }

    if (typeof providedSecret !== 'string') {
      console.warn('Webhook secret must be a string');
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    return this.constantTimeCompare(providedSecret, this.webhookSecret);
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * Requirements: 8.1, 8.2
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Main webhook handler with security validation and habit creation
   * Requirements: 5.1, 5.2, 5.3
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      console.log('Received webhook request');

      // 1. Security validation first
      if (!this.validateSecret(req)) {
        console.warn('Webhook request failed security validation');
        res.status(401).json({
          success: false,
          error: 'Unauthorized: Invalid or missing secret',
          created: 0,
          skipped: 0,
          errors: ['Authentication failed'],
          executionTime: Date.now() - startTime,
        } as WebhookResponse);
        return;
      }

      console.log('Webhook request authenticated successfully');

      // 2. Validate request format (optional, but good practice)
      if (!isWebhookRequest(req.body)) {
        console.warn('Invalid webhook request format');
        res.status(400).json({
          success: false,
          error: 'Bad Request: Invalid request format',
          created: 0,
          skipped: 0,
          errors: ['Invalid request format'],
          executionTime: Date.now() - startTime,
        } as WebhookResponse);
        return;
      }

      // 3. Process habit creation
      console.log('Starting habit creation process via webhook');
      const result = await this.habitManager.createScheduledHabits();

      // 4. Return success response with metrics
      const response: WebhookResponse = {
        success: result.success,
        created: result.created.length,
        skipped: result.skipped.length,
        errors: result.errors,
        executionTime: Date.now() - startTime,
      };

      console.log(
        `Webhook processing completed: ${response.created} created, ${response.skipped} skipped, ${response.errors.length} errors`
      );

      res.status(200).json(response);
    } catch (error) {
      // 5. Handle unexpected errors
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      console.error('Webhook processing failed with unexpected error:', error);

      const response: WebhookResponse = {
        success: false,
        created: 0,
        skipped: 0,
        errors: [errorMessage],
        executionTime: Date.now() - startTime,
      };

      res.status(500).json(response);
    }
  }

  /**
   * Health check endpoint for monitoring
   * Requirements: 8.1, 8.2
   */
  async handleHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      console.log('Health check requested');

      // Get system status from HabitManager
      const systemStatus = await this.habitManager.getSystemStatus();

      // Map system status to HTTP status codes
      let httpStatus: number;
      switch (systemStatus.status) {
        case 'healthy':
          httpStatus = 200;
          break;
        case 'degraded':
          httpStatus = 200; // Still operational
          break;
        case 'unhealthy':
          httpStatus = 503; // Service unavailable
          break;
        default:
          httpStatus = 500;
      }

      res.status(httpStatus).json({
        status: systemStatus.status,
        timestamp: systemStatus.timestamp,
        server: {
          port: this.port,
          uptime: process.uptime(),
        },
        system: systemStatus.metrics,
        errors: systemStatus.errors,
      });
    } catch (error) {
      console.error('Health check failed:', error);

      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        server: {
          port: this.port,
          uptime: process.uptime(),
        },
      });
    }
  }

  /**
   * Handle 404 Not Found for unsupported routes
   * Requirements: 5.3
   */
  private handleNotFound(req: Request, res: Response): void {
    console.warn(`404 Not Found: ${req.method} ${req.path}`);

    res.status(404).json({
      success: false,
      error: 'Not Found: Endpoint does not exist',
      message: 'Available endpoints: POST /webhook, GET /health',
    });
  }

  /**
   * Global error handler for Express
   * Requirements: 5.3, 6.1
   */
  private handleError(
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction
  ): void {
    console.error('Express error handler caught error:', error);

    // Don't send error details in production for security
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: isDevelopment ? error.message : 'An unexpected error occurred',
    });
  }

  /**
   * Start the webhook server
   * Requirements: 5.1
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`🚀 Webhook server started on port ${this.port}`);
          console.log(`📋 Health check: http://localhost:${this.port}/health`);
          console.log(
            `🔗 Webhook endpoint: http://localhost:${this.port}/webhook`
          );
          resolve();
        });

        this.server.on('error', (error: Error) => {
          console.error('Server startup error:', error);
          reject(error);
        });
      } catch (error) {
        console.error('Failed to start webhook server:', error);
        reject(error);
      }
    });
  }

  /**
   * Stop the webhook server gracefully
   * Requirements: 5.1
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        console.log('Server is not running');
        resolve();
        return;
      }

      console.log('Stopping webhook server...');

      this.server.close((error?: Error) => {
        if (error) {
          console.error('Error stopping server:', error);
          reject(error);
        } else {
          console.log('✓ Webhook server stopped gracefully');
          this.server = undefined;
          resolve();
        }
      });
    });
  }

  /**
   * Get server information for monitoring
   * Requirements: 8.1, 8.2
   */
  getServerInfo(): {
    port: number;
    isRunning: boolean;
    uptime: number;
  } {
    return {
      port: this.port,
      isRunning: !!this.server,
      uptime: process.uptime(),
    };
  }
}

/**
 * Factory function to create WebhookServer with default configuration
 * Requirements: 5.1, 8.1
 */
export function createWebhookServer(
  habitManager: HabitManager,
  port?: number
): WebhookServer {
  const serverPort = port || parseInt(process.env.PORT || '8080', 10);
  return new WebhookServer(habitManager, serverPort);
}
