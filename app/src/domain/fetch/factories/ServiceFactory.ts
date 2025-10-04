import { DIContainer, SERVICE_TOKENS } from '../../../shared/di/Container';
import { ILogger, LoggerFactory } from '../../../shared/logger/Logger';
import { ICache, CacheFactory } from '../../../shared/cache/Cache';
import {
  RetryManager,
  RetryManagerFactory,
} from '../../../shared/retry/RetryManager';
import { ConfigManager } from '../../../shared/config/Config';
import { ValidatorFactory } from '../../../shared/validation/Validator';
import { NotionDatabaseService } from '../services/NotionDatabaseService';
import { HabitMapper } from '../mappers/HabitMapper';
import { HabitRepository } from '../repositories/HabitRepository';
import {
  DatabaseResponse,
  BlockObjectResponse,
} from '../../../lib/notionhq/type';
import { Habit } from '../../model';
import { notionClient } from '../../../lib/notionhq/init';

/**
 * サービスファクトリー - 依存性注入コンテナを管理
 */
export class ServiceFactory {
  private static container: DIContainer;

  static initialize(): void {
    this.container = DIContainer.getInstance();
    this.registerServices();
  }

  /**
   * すべてのサービスを登録
   */
  private static registerServices(): void {
    // ロガー
    this.container.register(SERVICE_TOKENS.LOGGER, LoggerFactory.getLogger());

    // キャッシュ
    this.container.register(
      SERVICE_TOKENS.CACHE,
      CacheFactory.getCache<DatabaseResponse>('database')
    );
    this.container.register(
      'contentCache',
      CacheFactory.getCache<BlockObjectResponse>('content')
    );
    this.container.register(
      'habitsCache',
      CacheFactory.getCache<Habit[]>('habits')
    );

    // リトライマネージャー
    this.container.register(
      SERVICE_TOKENS.RETRY_MANAGER,
      RetryManagerFactory.getInstance()
    );

    // 設定マネージャー
    this.container.register(
      SERVICE_TOKENS.CONFIG_MANAGER,
      ConfigManager.getInstance()
    );

    // バリデーター
    this.container.register(
      SERVICE_TOKENS.HABIT_VALIDATOR,
      ValidatorFactory.getHabitValidator()
    );
    this.container.register(
      SERVICE_TOKENS.DATABASE_ID_VALIDATOR,
      ValidatorFactory.getDatabaseIdValidator()
    );

    // Notionクライアント（既存のものを使用）
    this.container.register(SERVICE_TOKENS.NOTION_CLIENT, notionClient);

    // サービスクラス
    this.container.registerFactory('notionDatabaseService', () => {
      const logger = this.container.get<ILogger>(SERVICE_TOKENS.LOGGER);
      const cache = this.container.get<ICache<DatabaseResponse>>(
        SERVICE_TOKENS.CACHE
      );
      const contentCache =
        this.container.get<ICache<BlockObjectResponse>>('contentCache');
      const retryManager = this.container.get<RetryManager>(
        SERVICE_TOKENS.RETRY_MANAGER
      );

      return new NotionDatabaseService(
        logger,
        cache,
        contentCache,
        retryManager
      );
    });

    this.container.registerFactory('habitMapper', () => {
      const logger = this.container.get<ILogger>(SERVICE_TOKENS.LOGGER);
      return new HabitMapper(logger);
    });

    this.container.registerFactory('habitRepository', () => {
      const databaseService = this.container.get<NotionDatabaseService>(
        'notionDatabaseService'
      );
      const habitMapper = this.container.get<HabitMapper>('habitMapper');
      const logger = this.container.get<ILogger>(SERVICE_TOKENS.LOGGER);
      const cache = this.container.get<ICache<Habit[]>>('habitsCache');

      return new HabitRepository(databaseService, habitMapper, logger, cache);
    });
  }

  /**
   * サービスを取得
   */
  static getService<T>(token: string): T {
    if (!this.container) {
      this.initialize();
    }
    return this.container.get<T>(token);
  }

  /**
   * 設定を更新
   */
  static updateConfig(updates: any): void {
    const configManager = this.getService<ConfigManager>(
      SERVICE_TOKENS.CONFIG_MANAGER
    );
    configManager.updateConfig(updates);
  }

  /**
   * データベースIDを設定
   */
  static setDatabaseId(databaseId: string): void {
    const configManager = this.getService<ConfigManager>(
      SERVICE_TOKENS.CONFIG_MANAGER
    );
    configManager.setDatabaseId(databaseId);
  }

  /**
   * キャッシュをクリア
   */
  static clearAllCaches(): void {
    const repository = this.getService<HabitRepository>('habitRepository');
    repository.clearCache();
  }

  /**
   * キャッシュ統計を取得
   */
  static getCacheStats() {
    const repository = this.getService<HabitRepository>('habitRepository');
    return repository.getCacheStats();
  }

  /**
   * コンテナをリセット（テスト用）
   */
  static reset(): void {
    if (this.container) {
      this.container.clear();
    }
    this.container = DIContainer.getInstance();
    this.registerServices();
  }
}
