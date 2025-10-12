import { Habit } from '../model';
import { EnvironmentConfig } from '../../shared/config/EnvironmentConfig';
import { ServiceFactory } from './factories/ServiceFactory';
import { HabitRepository } from './repositories/HabitRepository';
import { FetchError } from '../../shared/errors/FetchError';
import { LoggerFactory } from '../../shared/logger/Logger';

/**
 * 結果の型定義
 */
export interface FetchResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    timestamp: Date;
    executionTime: number;
    cacheHit?: boolean;
  };
}

/**
 * Habitデータの取得結果
 */
export type FetchHabitsResult = FetchResult<Habit[]>;

/**
 * 単一Habitデータの取得結果
 */
export type FetchHabitResult = FetchResult<Habit>;

/**
 * メインのHabitデータ取得関数
 */
export async function fetchHabits(): Promise<FetchHabitsResult> {
  const logger = LoggerFactory.getLogger();
  const startTime = Date.now();

  try {
    // データベースIDを取得
    const habitsDatabaseId = EnvironmentConfig.getHabitsDatabaseId();
    if (!habitsDatabaseId) {
      const errorMessage = 'データベースIDが指定されていません';
      logger.warn(errorMessage);
      return {
        success: false,
        error: errorMessage,
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
        },
      };
    }

    // サービスファクトリーを初期化
    ServiceFactory.initialize();
    ServiceFactory.setDatabaseId(habitsDatabaseId);

    // リポジトリを取得
    const habitRepository =
      ServiceFactory.getService<HabitRepository>('habitRepository');

    logger.info(`データベース ${habitsDatabaseId} からHabitsを取得開始`);

    // データを取得
    const habits = await habitRepository.fetchHabits(habitsDatabaseId);

    logger.info(`${habits.length}個のHabitsが正常に取得されました`);

    return {
      success: true,
      data: habits,
      metadata: {
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Habits取得エラー', error as Error, { executionTime });

    if (error instanceof FetchError) {
      return {
        success: false,
        error: error.message,
        metadata: {
          timestamp: new Date(),
          executionTime,
        },
      };
    }

    return {
      success: false,
      error: `不明なエラーが発生しました: ${error}`,
      metadata: {
        timestamp: new Date(),
        executionTime,
      },
    };
  }
}

/**
 * 特定のHabitデータを取得
 */
export async function fetchHabitById(
  pageId: string
): Promise<FetchHabitResult> {
  const logger = LoggerFactory.getLogger();
  const startTime = Date.now();

  try {
    if (!pageId || pageId.trim() === '') {
      const errorMessage = 'ページIDが指定されていません';
      logger.warn(errorMessage);
      return {
        success: false,
        error: errorMessage,
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
        },
      };
    }

    // データベースIDを取得
    const habitsDatabaseId = EnvironmentConfig.getHabitsDatabaseId();
    if (!habitsDatabaseId) {
      const errorMessage = 'データベースIDが指定されていません';
      logger.warn(errorMessage);
      return {
        success: false,
        error: errorMessage,
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
        },
      };
    }

    // サービスファクトリーを初期化
    ServiceFactory.initialize();
    ServiceFactory.setDatabaseId(habitsDatabaseId);

    // リポジトリを取得
    const habitRepository =
      ServiceFactory.getService<HabitRepository>('habitRepository');

    logger.info(`ページID ${pageId} のHabitを取得開始`);

    // データを取得
    const habit = await habitRepository.fetchHabitById(
      habitsDatabaseId,
      pageId
    );

    if (!habit) {
      const errorMessage = `ページID ${pageId} のHabitが見つかりませんでした`;
      logger.warn(errorMessage);
      return {
        success: false,
        error: errorMessage,
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
        },
      };
    }

    logger.info(`ページID ${pageId} のHabitが正常に取得されました`);

    return {
      success: true,
      data: habit,
      metadata: {
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Habit取得エラー', error as Error, { pageId, executionTime });

    if (error instanceof FetchError) {
      return {
        success: false,
        error: error.message,
        metadata: {
          timestamp: new Date(),
          executionTime,
        },
      };
    }

    return {
      success: false,
      error: `不明なエラーが発生しました: ${error}`,
      metadata: {
        timestamp: new Date(),
        executionTime,
      },
    };
  }
}

/**
 * キャッシュをクリア
 */
export function clearCache(): void {
  ServiceFactory.clearAllCaches();
  LoggerFactory.getLogger().info('すべてのキャッシュをクリアしました');
}

/**
 * キャッシュ統計を取得
 */
export function getCacheStats() {
  return ServiceFactory.getCacheStats();
}

/**
 * 設定を更新
 */
export function updateConfig(config: any): void {
  ServiceFactory.updateConfig(config);
  LoggerFactory.getLogger().info('設定を更新しました', { config });
}

/**
 * ヘルスチェック
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: any;
}> {
  try {
    ServiceFactory.initialize();
    // const _logger = ServiceFactory.getService<ILogger>('logger');

    return {
      status: 'healthy',
      details: {
        timestamp: new Date().toISOString(),
        services: {
          logger: 'initialized',
          cache: 'initialized',
          retryManager: 'initialized',
        },
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
