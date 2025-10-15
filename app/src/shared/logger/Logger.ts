/**
 * ログレベル定義
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * ログエントリの型定義
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: Date;
  error?: Error;
}

/**
 * ロガーインターフェース
 */
export interface ILogger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
}

/**
 * コンソールロガー実装
 */
export class ConsoleLogger implements ILogger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, {
      ...context,
      error: error?.message,
      stack: error?.stack,
    });
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>
  ): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
    };

    const logMessage = this.formatLogEntry(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    // 日本時間でタイムスタンプを出力
    const timestamp = entry.timestamp.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const level = LogLevel[entry.level];
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';

    return `[${timestamp}] ${level}: ${entry.message}${contextStr}`;
  }
}

/**
 * ロガーファクトリー
 */
export class LoggerFactory {
  private static instance: ILogger;

  static getLogger(): ILogger {
    if (!this.instance) {
      // 環境に応じたログレベルを設定
      const logLevel = this.getLogLevelForEnvironment();
      this.instance = new ConsoleLogger(logLevel);
    }
    return this.instance;
  }

  static setLogger(logger: ILogger): void {
    this.instance = logger;
  }

  /**
   * 環境に応じたログレベルを取得
   */
  private static getLogLevelForEnvironment(): LogLevel {
    // 環境変数でログレベルが指定されている場合はそれを使用
    const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLogLevel && envLogLevel in LogLevel) {
      return LogLevel[envLogLevel as keyof typeof LogLevel];
    }

    // 環境に応じたデフォルトログレベル
    const nodeEnv = process.env.NODE_ENV || 'development';

    switch (nodeEnv) {
      case 'production':
        return LogLevel.WARN; // 本番環境ではWARN以上のみ
      case 'test':
        return LogLevel.ERROR; // テスト環境ではERRORのみ
      case 'development':
      default:
        return LogLevel.DEBUG; // 開発環境ではすべてのログ
    }
  }
}
