import { Todo } from '../../model';
import {
  TodoProperties,
  PageResponse,
  BlockObjectResponse,
} from '../../../lib/notionhq/type';
import { notionClient } from '../../../lib/notionhq/init';
import { AppError, ERROR_CODES } from '../../../shared/errors/AppError';
import { ILogger } from '../../../shared/logger/Logger';
import { ValidatorFactory } from '../../../shared/validation/Validator';
import type { CreatePageParameters } from '@notionhq/client/build/src/api-endpoints';

/**
 * InsertMapper - データ変換層
 * TodoモデルとNotionデータベース間の型安全な変換を管理
 */
export class InsertMapper {
  constructor(private logger: ILogger) {}

  /**
   * TodoモデルをNotionデータベース用のプロパティに変換する
   * @param todo - 変換対象のTodo
   * @returns Notionデータベース用のプロパティ
   */
  async mapToNotionProperties(todo: Todo): Promise<TodoProperties> {
    try {
      this.logger.debug(`Todo ${todo.name} をNotionプロパティに変換中`);

      // Todoのバリデーション
      ValidatorFactory.validateTodo(todo);

      const properties: TodoProperties = {
        NAME: {
          title: [
            {
              text: {
                content: todo.name,
              },
            },
          ],
        },
        EXPECTED: {
          date: {
            start: todo.startTime.toISOString(),
            end: todo.endTime.toISOString(),
          },
        },
        PROFILE: {
          relation: todo.profiles.map(id => ({ id })),
        },
        TOBE: {
          relation: todo.tobes.map(id => ({ id })),
        },
      };

      this.logger.debug(`Todo ${todo.name} の変換が完了しました`);
      return properties;
    } catch (error) {
      this.logger.error(`Todo ${todo.name} の変換エラー`, error as Error, {
        todoName: todo.name,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Todo ${todo.name} の変換に失敗しました: ${error}`,
        ERROR_CODES.PROPERTY_MAPPING_FAILED,
        { todoName: todo.name, originalError: error }
      );
    }
  }

  /**
   * NotionページレスポンスをTodoモデルに変換する
   * @param page - 変換対象のNotionページ
   * @returns 変換されたTodoモデル
   */
  async mapFromNotionPage(page: PageResponse): Promise<Todo> {
    try {
      this.logger.debug(`ページ ${page.id} をTodoモデルに変換中`);

      const todo = this.createTodoModel(page);

      // Todoのバリデーション
      ValidatorFactory.validateTodo(todo);

      this.logger.debug(`ページ ${page.id} の変換が完了しました`);
      return todo;
    } catch (error) {
      this.logger.error(`ページ ${page.id} の変換エラー`, error as Error, {
        pageId: page.id,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `ページ ${page.id} の変換に失敗しました: ${error}`,
        ERROR_CODES.PROPERTY_MAPPING_FAILED,
        { pageId: page.id, originalError: error }
      );
    }
  }

  /**
   * Notionデータベースにページを作成する
   * @param databaseId - データベースID
   * @param properties - ページのプロパティ
   * @param content - ページのコンテンツ（オプション）
   * @returns 作成されたページ
   */
  async createNotionPage(
    databaseId: string,
    properties: TodoProperties,
    content?: BlockObjectResponse
  ): Promise<PageResponse> {
    try {
      this.logger.debug(`データベース ${databaseId} にページを作成中`);

      // mention要素を含むコンテンツの場合はスキップ
      if (content && this.hasMentionElement(content)) {
        this.logger.warn(
          `コンテンツにmention要素が含まれているため、コンテンツなしでページを作成します`
        );
        content = undefined;
      }

      // column_list要素を含むコンテンツの場合はスキップ
      if (content && this.hasColumnListElement(content)) {
        this.logger.warn(
          `コンテンツにcolumn_list要素が含まれているため、コンテンツなしでページを作成します`
        );
        content = undefined;
      }

      const pageData = {
        parent: { database_id: databaseId },
        properties: properties,
        ...(content ? { children: content } : {}),
      } as unknown as CreatePageParameters;

      const response = await notionClient.pages.create(pageData);

      this.logger.debug(`データベース ${databaseId} にページを作成完了`, {
        pageId: response.id,
      });

      return response as PageResponse;
    } catch (error) {
      this.logger.error(
        `データベース ${databaseId} へのページ作成エラー`,
        error as Error,
        { databaseId }
      );

      // コンテンツ付きで失敗した場合、コンテンツなしで再試行
      if (content && this.isContentValidationError(error)) {
        this.logger.warn(
          `コンテンツのバリデーションエラーが発生したため、コンテンツなしで再試行します`,
          { databaseId }
        );

        try {
          const pageDataWithoutContent = {
            parent: { database_id: databaseId },
            properties: properties,
          } as unknown as CreatePageParameters;

          const response = await notionClient.pages.create(
            pageDataWithoutContent
          );

          this.logger.info(
            `データベース ${databaseId} にコンテンツなしでページを作成完了`,
            { pageId: response.id }
          );

          return response as PageResponse;
        } catch (retryError) {
          this.logger.error(
            `データベース ${databaseId} へのコンテンツなし再試行も失敗`,
            retryError as Error,
            { databaseId }
          );

          throw new AppError(
            `データベース ${databaseId} へのページ作成に失敗しました（再試行含む）: ${retryError}`,
            ERROR_CODES.DATABASE_NOT_FOUND,
            { databaseId, originalError: retryError }
          );
        }
      }

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `データベース ${databaseId} へのページ作成に失敗しました: ${error}`,
        ERROR_CODES.DATABASE_NOT_FOUND,
        { databaseId, originalError: error }
      );
    }
  }

  /**
   * ページレスポンスからTodoモデルを作成
   * @param page - 変換対象のページレスポンス
   * @returns 作成されたTodoモデル
   */
  private createTodoModel(page: PageResponse): Todo {
    if (page.object !== 'page') {
      throw new AppError(
        `ページ ${page.id} は有効なページオブジェクトではありません`,
        ERROR_CODES.PROPERTY_MAPPING_FAILED,
        { pageId: page.id, pageObject: page.object }
      );
    }

    // プロパティの存在確認
    if (!('properties' in page) || !page.properties) {
      throw new AppError(
        `ページ ${page.id} のプロパティが存在しません`,
        ERROR_CODES.PROPERTY_MAPPING_FAILED,
        { pageId: page.id }
      );
    }

    const properties = page.properties as Record<string, unknown>;

    // 必須プロパティの存在確認
    if (!properties.NAME || !properties.EXPECTED) {
      throw new AppError(
        `ページ ${page.id} に必須プロパティが存在しません`,
        ERROR_CODES.PROPERTY_MAPPING_FAILED,
        { pageId: page.id }
      );
    }

    // タイトルの抽出
    const name = this.extractTitle(
      (properties.NAME as { title?: Array<{ text: { content: string } }> })
        ?.title
    );

    // 日付の抽出
    const expectedDate = (
      properties.EXPECTED as { date?: { start?: string; end?: string } }
    )?.date;
    if (!expectedDate || !expectedDate.start || !expectedDate.end) {
      throw new AppError(
        `ページ ${page.id} の日付プロパティが無効です`,
        ERROR_CODES.PROPERTY_MAPPING_FAILED,
        { pageId: page.id }
      );
    }

    const startTime = new Date(expectedDate.start);
    const endTime = new Date(expectedDate.end);

    // リレーションの抽出
    const profiles = this.extractRelations(
      (properties.PROFILE as { relation?: Array<{ id: string }> })?.relation
    );
    const tobes = this.extractRelations(
      (properties.TOBE as { relation?: Array<{ id: string }> })?.relation
    );

    const todo: Todo = {
      id: page.id, // NotionページIDを追加
      name,
      startTime,
      endTime,
      profiles,
      tobes,
      content: [], // 新規作成時は空のコンテンツ
    };

    return todo;
  }

  /**
   * タイトル配列からテキストを抽出
   * @param titleArray - タイトル配列
   * @returns 抽出されたテキスト
   */
  private extractTitle(
    titleArray: Array<{ text: { content: string } }> | undefined
  ): string {
    if (!titleArray || titleArray.length === 0) {
      return '';
    }
    return titleArray[0]?.text?.content || '';
  }

  /**
   * リレーション配列からIDを抽出
   * @param relationArray - リレーション配列
   * @returns 抽出されたID配列
   */
  private extractRelations(
    relationArray: Array<{ id: string }> | undefined
  ): string[] {
    if (!relationArray || relationArray.length === 0) {
      return [];
    }
    return relationArray.map(rel => rel.id);
  }

  /**
   * mention要素が含まれているかチェック
   * @param content - チェック対象のコンテンツ
   * @returns mention要素が含まれているかどうか
   */
  private hasMentionElement(content: unknown): boolean {
    if (!content || typeof content !== 'object') {
      return false;
    }

    // 直接mention要素があるかチェック
    if ('mention' in content && content.mention) {
      return true;
    }

    // リッチテキスト配列をチェック
    if (Array.isArray(content)) {
      return content.some(item => this.hasMentionElement(item));
    }

    // 各プロパティを再帰的にチェック
    for (const key in content) {
      if (
        Object.prototype.hasOwnProperty.call(content, key) &&
        this.hasMentionElement((content as Record<string, unknown>)[key])
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * column_list要素が含まれているかチェック
   * @param content - チェック対象のコンテンツ
   * @returns column_list要素が含まれているかどうか
   */
  private hasColumnListElement(content: unknown): boolean {
    if (!content || typeof content !== 'object') {
      return false;
    }

    // 直接column_list要素があるかチェック
    if ('type' in content && content.type === 'column_list') {
      return true;
    }

    // リッチテキスト配列をチェック
    if (Array.isArray(content)) {
      return content.some(item => this.hasColumnListElement(item));
    }

    // 各プロパティを再帰的にチェック
    for (const key in content) {
      if (
        Object.prototype.hasOwnProperty.call(content, key) &&
        this.hasColumnListElement((content as Record<string, unknown>)[key])
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * コンテンツのバリデーションエラーかどうかをチェック
   * @param error - チェック対象のエラー
   * @returns コンテンツのバリデーションエラーかどうか
   */
  private isContentValidationError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const errorMessage =
      'message' in error && typeof error.message === 'string'
        ? error.message
        : '';

    // Notion APIのコンテンツバリデーションエラーを検出
    return (
      errorMessage.includes('body failed validation') &&
      errorMessage.includes('body.children')
    );
  }

  /**
   * HabitページのTODOリレーションにTodoを追加する
   * @param habitPageId - HabitページのID
   * @param todoPageId - 追加するTodoページのID
   * @returns 更新されたページレスポンス
   */
  async addTodoRelationToHabit(
    habitPageId: string,
    todoPageId: string
  ): Promise<PageResponse> {
    try {
      this.logger.debug(
        `HabitページID ${habitPageId} にTodoページID ${todoPageId} を追加中`
      );

      // 現在のHabitページを取得
      const currentPage = await notionClient.pages.retrieve({
        page_id: habitPageId,
      });

      // 型チェック
      if (currentPage.object !== 'page') {
        throw new AppError(
          `ページID ${habitPageId} は有効なページオブジェクトではありません`,
          ERROR_CODES.PROPERTY_MAPPING_FAILED,
          { habitPageId }
        );
      }

      // プロパティの存在確認
      if (!('properties' in currentPage) || !currentPage.properties) {
        throw new AppError(
          `ページID ${habitPageId} のプロパティが存在しません`,
          ERROR_CODES.PROPERTY_MAPPING_FAILED,
          { habitPageId }
        );
      }

      const properties = currentPage.properties as Record<string, unknown>;

      // 既存のTODOリレーションを取得
      const existingTodoRelations =
        (properties.TODO as { relation?: Array<{ id: string }> })?.relation ||
        [];
      const existingTodoIds = existingTodoRelations.map(
        (rel: { id: string }) => rel.id
      );

      // 重複チェック
      if (existingTodoIds.includes(todoPageId)) {
        this.logger.warn(
          `TodoページID ${todoPageId} は既にHabitページID ${habitPageId} に関連付けられています`
        );
        return currentPage as PageResponse;
      }

      // 新しいTODOリレーションを作成
      const updatedTodoRelations = [
        ...existingTodoRelations,
        { id: todoPageId },
      ];

      // ページを更新
      const updateProperties: Record<
        string,
        { relation: Array<{ id: string }> }
      > = {
        TODO: {
          relation: updatedTodoRelations,
        },
      };

      const updatedPage = await notionClient.pages.update({
        page_id: habitPageId,
        properties: updateProperties,
      });

      this.logger.debug(
        `HabitページID ${habitPageId} のTODOリレーションを更新しました`,
        { addedTodoId: todoPageId, totalTodos: updatedTodoRelations.length }
      );

      return updatedPage as PageResponse;
    } catch (error) {
      this.logger.error(
        `HabitページID ${habitPageId} のTODOリレーション更新エラー`,
        error as Error,
        { habitPageId, todoPageId }
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `HabitページID ${habitPageId} のTODOリレーション更新に失敗しました: ${error}`,
        ERROR_CODES.PROPERTY_MAPPING_FAILED,
        { habitPageId, todoPageId, originalError: error }
      );
    }
  }
}
