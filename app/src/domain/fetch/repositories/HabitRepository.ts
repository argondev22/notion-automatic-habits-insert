import { Habit } from "../../model";
import { DatabaseResponse, PageResponse, BlockObjectResponse } from "../../../lib/notionhq/type";
import { NotionDatabaseService } from "../services/NotionDatabaseService";
import { HabitMapper } from "../mappers/HabitMapper";
import { FetchError, ERROR_CODES } from "../../../shared/errors/FetchError";
import { ILogger } from "../../../shared/logger/Logger";
import { ICache } from "../../../shared/cache/Cache";

/**
 * Habitデータの取得と変換を行うリポジトリクラス
 */
export class HabitRepository {
  private databaseService: NotionDatabaseService;
  private habitMapper: HabitMapper;
  private logger: ILogger;
  private cache: ICache<Habit[]>;

  constructor(
    databaseService: NotionDatabaseService,
    habitMapper: HabitMapper,
    logger: ILogger,
    cache: ICache<Habit[]>
  ) {
    this.databaseService = databaseService;
    this.habitMapper = habitMapper;
    this.logger = logger;
    this.cache = cache;
  }

  /**
   * データベースからHabitデータを取得（キャッシュ付き）
   */
  async fetchHabits(databaseId: string): Promise<Habit[]> {
    const cacheKey = `habits:${databaseId}`;

    // キャッシュから取得を試行
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug(`データベース ${databaseId} のHabitsをキャッシュから取得`);
      return cached;
    }

    this.logger.info(`データベース ${databaseId} からHabitsを取得中`);

    try {
      // データベースからページを取得
      const pages = await this.databaseService.queryDatabase(databaseId);

      // ページオブジェクトのみをフィルタリング
      const validPages = pages.filter((page): page is PageResponse =>
        page.object === "page"
      );

      if (validPages.length === 0) {
        this.logger.warn("有効なページが見つかりませんでした");
        return [];
      }

      this.logger.info(`${validPages.length}個の有効なページが見つかりました`);

      // 各ページのコンテンツを並列取得
      const contents = await Promise.all(
        validPages.map(page => this.databaseService.getPageContent(page.id))
      );

      // Habitモデルに変換
      const habits = await this.habitMapper.mapToHabits(validPages, contents);

      // キャッシュに保存
      this.cache.set(cacheKey, habits);
      this.logger.debug(`データベース ${databaseId} のHabitsをキャッシュに保存`);

      return habits;
    } catch (error) {
      this.logger.error("Habitデータの取得エラー", error as Error, { databaseId });

      if (error instanceof FetchError) {
        throw error;
      }

      throw new FetchError(
        `Habitデータの取得に失敗しました: ${error}`,
        ERROR_CODES.DATABASE_NOT_FOUND,
        { databaseId, originalError: error }
      );
    }
  }

  /**
   * 単一のHabitデータを取得
   */
  async fetchHabitById(databaseId: string, pageId: string): Promise<Habit | null> {
    this.logger.info(`ページID ${pageId} のHabitを取得中`);

    try {
      // データベースからページを取得
      const pages = await this.databaseService.queryDatabase(databaseId);

      // 指定されたページIDのページを検索
      const targetPage = pages.find(page =>
        page.object === "page" && page.id === pageId
      ) as PageResponse | undefined;

      if (!targetPage) {
        this.logger.warn(`ページID ${pageId} が見つかりませんでした`);
        return null;
      }

      // ページのコンテンツを取得
      const content = await this.databaseService.getPageContent(pageId);

      // Habitモデルに変換
      const habit = await this.habitMapper.mapToHabit(targetPage, content);

      this.logger.debug(`ページID ${pageId} のHabitが正常に取得されました`);
      return habit;
    } catch (error) {
      this.logger.error(`ページID ${pageId} の取得エラー`, error as Error, { pageId, databaseId });

      if (error instanceof FetchError) {
        throw error;
      }

      throw new FetchError(
        `ページID ${pageId} の取得に失敗しました: ${error}`,
        ERROR_CODES.PAGE_NOT_FOUND,
        { pageId, databaseId, originalError: error }
      );
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
    this.databaseService.clearCache();
    this.logger.info("HabitRepositoryのキャッシュをクリアしました");
  }

  /**
   * キャッシュ統計を取得
   */
  getCacheStats() {
    return {
      habits: this.cache.getStats(),
      database: this.databaseService.getCacheStats(),
    };
  }
}
