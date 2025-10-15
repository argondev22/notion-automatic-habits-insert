/**
 * アプリケーションエラークラス - より詳細なエラー情報を提供
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
    this.originalError = originalError;

    // スタックトレースを保持
    if (originalError && originalError.stack) {
      this.stack = originalError.stack;
    }
  }

  /**
   * エラーをJSON形式でシリアライズ
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      originalError: this.originalError?.message,
    };
  }
}

/**
 * エラーコード定数
 */
export const ERROR_CODES = {
  DATABASE_NOT_FOUND: 'DATABASE_NOT_FOUND',
  INVALID_DATABASE_ID: 'INVALID_DATABASE_ID',
  PAGE_NOT_FOUND: 'PAGE_NOT_FOUND',
  INVALID_PAGE_ID: 'INVALID_PAGE_ID',
  PROPERTY_MAPPING_FAILED: 'PROPERTY_MAPPING_FAILED',
  CONTENT_FETCH_FAILED: 'CONTENT_FETCH_FAILED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOTION_API_ERROR: 'NOTION_API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  FETCH_ERROR: 'FETCH_ERROR',
  CONVERSION_ERROR: 'CONVERSION_ERROR',
  INSERT_ERROR: 'INSERT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
