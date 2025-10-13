import { Todo } from '../../model';
import { TodoProperties, PageResponse } from '../../../lib/notionhq/type';
import { notionClient } from '../../../lib/notionhq/init';
import { AppError, ERROR_CODES } from '../../../shared/errors/AppError';
import { ILogger } from '../../../shared/logger/Logger';
import { ValidatorFactory } from '../../../shared/validation/Validator';

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
   * @returns 作成されたページ
   */
  async createNotionPage(
    databaseId: string,
    properties: TodoProperties
  ): Promise<PageResponse> {
    try {
      this.logger.debug(`データベース ${databaseId} にページを作成中`);

      const response = await notionClient.pages.create({
        parent: { database_id: databaseId },
        properties: properties as any,
      });

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

    const properties = page.properties as any;

    // 必須プロパティの存在確認
    if (!properties.NAME || !properties.EXPECTED) {
      throw new AppError(
        `ページ ${page.id} に必須プロパティが存在しません`,
        ERROR_CODES.PROPERTY_MAPPING_FAILED,
        { pageId: page.id }
      );
    }

    // タイトルの抽出
    const name = this.extractTitle(properties.NAME.title);

    // 日付の抽出
    const expectedDate = properties.EXPECTED.date;
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
    const profiles = this.extractRelations(properties.PROFILE?.relation);
    const tobes = this.extractRelations(properties.TOBE?.relation);

    const todo: Todo = {
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
}
