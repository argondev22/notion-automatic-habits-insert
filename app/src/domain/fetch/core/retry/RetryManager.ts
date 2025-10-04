import { ILogger, LoggerFactory } from "../../../../shared/logger/Logger";

/**
 * リトライ設定
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // ミリ秒
  maxDelay: number; // ミリ秒
  backoffMultiplier: number;
  jitter: boolean; // ランダムな遅延を追加するか
}

/**
 * デフォルトリトライ設定
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 10000, // 10秒
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * リトライ可能なエラーかどうかを判定する関数
 */
export type RetryableErrorPredicate = (error: Error) => boolean;

/**
 * デフォルトのリトライ可能エラー判定
 */
export const isRetryableError: RetryableErrorPredicate = (error: Error): boolean => {
  // ネットワークエラー
  if (error.message.includes('network') || error.message.includes('timeout')) {
    return true;
  }

  // Notion APIのレート制限エラー
  if (error.message.includes('rate limit') || error.message.includes('429')) {
    return true;
  }

  // 一時的なサーバーエラー
  if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
    return true;
  }

  return false;
};

/**
 * リトライマネージャー
 */
export class RetryManager {
  private logger: ILogger;
  private config: RetryConfig;

  constructor(
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
    logger: ILogger = LoggerFactory.getLogger()
  ) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * 関数をリトライ付きで実行
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    isRetryable: RetryableErrorPredicate = isRetryableError
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        this.logger.debug(`実行中: ${operationName} (試行 ${attempt}/${this.config.maxAttempts})`);
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // 最後の試行またはリトライ不可能なエラーの場合
        if (attempt === this.config.maxAttempts || !isRetryable(lastError)) {
          this.logger.error(
            `${operationName} が失敗しました (試行 ${attempt}/${this.config.maxAttempts})`,
            lastError,
            { attempt, maxAttempts: this.config.maxAttempts }
          );
          throw lastError;
        }

        // リトライ可能なエラーの場合
        const delay = this.calculateDelay(attempt);
        this.logger.warn(
          `${operationName} が失敗しました。${delay}ms後にリトライします (試行 ${attempt}/${this.config.maxAttempts})`,
          { error: lastError.message, delay, attempt }
        );

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * 遅延時間を計算
   */
  private calculateDelay(attempt: number): number {
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);

    // 最大遅延時間を適用
    delay = Math.min(delay, this.config.maxDelay);

    // ジッターを追加（ランダムな遅延）
    if (this.config.jitter) {
      const jitterRange = delay * 0.1; // 10%のジッター
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      delay += jitter;
    }

    return Math.max(0, Math.floor(delay));
  }

  /**
   * 指定時間待機
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * リトライマネージャーファクトリー
 */
export class RetryManagerFactory {
  private static instance: RetryManager;

  static getInstance(config?: RetryConfig): RetryManager {
    if (!this.instance || config) {
      this.instance = new RetryManager(config);
    }
    return this.instance;
  }
}
