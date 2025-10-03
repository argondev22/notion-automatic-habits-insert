import { notionClient } from "../../../lib/notionhq/init";
import { DatabaseResponse, BlockObjectResponse } from "../../../lib/notionhq/type";
import { FetchError, ERROR_CODES } from "../core/errors/FetchError";
import { ILogger } from "../core/logger/Logger";
import { ICache } from "../core/cache/Cache";
import { RetryManager } from "../core/retry/RetryManager";
import { ValidatorFactory } from "../core/validation/Validator";

/**
 * Notionデータベース操作のためのサービスクラス
 */
export class NotionDatabaseService {
  private logger: ILogger;
  private cache: ICache<DatabaseResponse>;
  private contentCache: ICache<BlockObjectResponse>;
  private retryManager: RetryManager;

  constructor(
    logger: ILogger,
    cache: ICache<DatabaseResponse>,
    contentCache: ICache<BlockObjectResponse>,
    retryManager: RetryManager
  ) {
    this.logger = logger;
    this.cache = cache;
    this.contentCache = contentCache;
    this.retryManager = retryManager;
  }

  /**
   * データベースからページを取得（キャッシュ付き）
   */
  async queryDatabase(databaseId: string): Promise<DatabaseResponse> {
    // バリデーション
    ValidatorFactory.validateDatabaseId(databaseId);

    // キャッシュキーを生成
    const cacheKey = `database:${databaseId}`;

    // キャッシュから取得を試行
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug(`データベース ${databaseId} をキャッシュから取得`);
      return cached;
    }

    this.logger.info(`データベース ${databaseId} をNotion APIから取得`);

    // リトライ付きでAPI呼び出し
    const results = await this.retryManager.executeWithRetry(
      async () => {
        const response = await notionClient.databases.query({
          database_id: databaseId,
        });

        if (!response.results) {
          throw new FetchError(
            "データベースから結果を取得できませんでした",
            ERROR_CODES.DATABASE_NOT_FOUND,
            { databaseId }
          );
        }

        return response.results;
      },
      `データベース ${databaseId} の取得`
    );

    // キャッシュに保存
    this.cache.set(cacheKey, results);
    this.logger.debug(`データベース ${databaseId} をキャッシュに保存`);

    return results;
  }

  /**
   * ページのコンテンツ（ブロック）を取得（キャッシュ付き）
   */
  async getPageContent(pageId: string): Promise<BlockObjectResponse> {
    if (!pageId || pageId.trim() === "") {
      throw new FetchError(
        "ページIDが指定されていません",
        ERROR_CODES.INVALID_PAGE_ID,
        { pageId }
      );
    }

    // キャッシュキーを生成
    const cacheKey = `content:${pageId}`;

    // キャッシュから取得を試行
    const cached = this.contentCache.get(cacheKey);
    if (cached) {
      this.logger.debug(`ページ ${pageId} のコンテンツをキャッシュから取得`);
      return cached;
    }

    this.logger.info(`ページ ${pageId} のコンテンツをNotion APIから取得`);

    // リトライ付きでAPI呼び出し
    const results = await this.retryManager.executeWithRetry(
      async () => {
        const response = await notionClient.blocks.children.list({
          block_id: pageId,
        });

        return response.results;
      },
      `ページ ${pageId} のコンテンツ取得`
    );

    // キャッシュに保存
    this.contentCache.set(cacheKey, results);
    this.logger.debug(`ページ ${pageId} のコンテンツをキャッシュに保存`);

    return results;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
    this.contentCache.clear();
    this.logger.info("キャッシュをクリアしました");
  }

  /**
   * キャッシュ統計を取得
   */
  getCacheStats() {
    return {
      database: this.cache.getStats(),
      content: this.contentCache.getStats(),
    };
  }
}
