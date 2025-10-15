import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import { ILogger } from '../shared/logger/Logger';
import { ServiceFactory } from '../shared/factories/ServiceFactory';
import { OrchestrationService } from '../domain/orchestration/OrchestrationService';
import { EnvironmentConfig } from '../shared/config/EnvironmentConfig';

/**
 * Webhookサーバー
 * Expressベースのサーバー実装
 */
export class WebhookServer {
  private app: express.Application;
  private logger: ILogger;
  private orchestrationService: OrchestrationService;
  private port: number;
  private webhookPath: string;
  private webhookSecret?: string;

  constructor() {
    this.app = express();
    this.logger = ServiceFactory.getService<ILogger>('logger');
    this.orchestrationService = ServiceFactory.getService<OrchestrationService>(
      'orchestrationService'
    );
    this.port = EnvironmentConfig.getServerPort();
    this.webhookPath = EnvironmentConfig.getWebhookPath();
    this.webhookSecret = EnvironmentConfig.getWebhookSecret();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * ミドルウェアの設定
   */
  private setupMiddleware(): void {
    // JSONパーサー
    this.app.use(bodyParser.json());

    // リクエストログ
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      this.logger.info('リクエスト受信', {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      next();
    });
  }

  /**
   * ルートの設定
   */
  private setupRoutes(): void {
    // ヘルスチェックエンドポイント
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    });

    // Webhookエンドポイント
    this.app.post(
      this.webhookPath,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          await this.handleWebhook(req, res);
        } catch (error) {
          next(error);
        }
      }
    );

    // ルートエンドポイント
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        message: 'Notion Automatic Habits Insert Webhook Server',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          webhook: this.webhookPath,
        },
      });
    });
  }

  /**
   * Webhookリクエストを処理
   */
  private async handleWebhook(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    // シークレット検証
    if (this.webhookSecret) {
      const providedSecret = req.headers['x-webhook-secret'];
      if (providedSecret !== this.webhookSecret) {
        this.logger.warn('無効なWebhookシークレット', {
          ip: req.ip,
        });
        res.status(401).json({
          success: false,
          error: '認証に失敗しました',
        });
        return;
      }
    }

    this.logger.info('Webhook処理開始');

    try {
      // オーケストレーションサービスを実行
      const result = await this.orchestrationService.executeHabitToTodoFlow();

      const responseTime = Date.now() - startTime;
      this.logger.info('Webhook処理完了', {
        success: result.success,
        responseTime: `${responseTime}ms`,
      });

      res.json({
        ...result,
        responseTime,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Webhook処理エラー', error as Error, {
        responseTime: `${responseTime}ms`,
      });

      res.status(500).json({
        success: false,
        error: `処理中にエラーが発生しました: ${error}`,
        responseTime,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * エラーハンドリング
   */
  private setupErrorHandling(): void {
    // 404エラー
    this.app.use((req: Request, res: Response) => {
      this.logger.warn('リクエストされたパスが見つかりません', {
        method: req.method,
        path: req.path,
      });
      res.status(404).json({
        success: false,
        error: 'エンドポイントが見つかりません',
        path: req.path,
      });
    });

    // 一般的なエラー
    this.app.use(
      (error: Error, req: Request, res: Response, _next: NextFunction) => {
        this.logger.error('サーバーエラー', error, {
          method: req.method,
          path: req.path,
        });

        res.status(500).json({
          success: false,
          error: '内部サーバーエラーが発生しました',
          message: EnvironmentConfig.isDevelopment()
            ? error.message
            : undefined,
        });
      }
    );
  }

  /**
   * サーバーを起動
   */
  start(): void {
    this.app.listen(this.port, () => {
      this.logger.info('Webhookサーバーが起動しました', {
        port: this.port,
        webhookPath: this.webhookPath,
        environment: EnvironmentConfig.getNodeEnv(),
        hasWebhookSecret: !!this.webhookSecret,
      });
    });
  }

  /**
   * Expressアプリケーションインスタンスを取得（テスト用）
   */
  getApp(): express.Application {
    return this.app;
  }
}
