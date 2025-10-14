import { Todo } from '../../model';
import { ILogger } from '../../../shared/logger/Logger';
import { ICache } from '../../../shared/cache/Cache';
import { InsertService } from '../services/InsertService';
import { InsertMapper } from '../mappers/InsertMapper';
import { AppError, ERROR_CODES } from '../../../shared/errors/AppError';

/**
 * InsertRepository - データアクセス層
 * TodoデータのNotionデータベースへの挿入処理を管理
 */
export class InsertRepository {
  constructor(
    private service: InsertService,
    private mapper: InsertMapper,
    private logger: ILogger,
    private cache: ICache<Todo[]>
  ) {}

  /**
   * Todo配列をNotionデータベースに挿入する
   * @param todos - 挿入対象のTodo配列
   * @param databaseId - 挿入先のデータベースID
   * @returns 挿入されたTodo配列
   */
  async insertTodos(todos: Todo[], databaseId: string): Promise<Todo[]> {
    const cacheKey = `insert:${databaseId}:${this.generateCacheKey(todos)}`;

    try {
      this.logger.info('InsertRepository: Todo配列をデータベースに挿入開始', {
        todoCount: todos.length,
        databaseId,
      });

      // 入力値のバリデーション
      if (!Array.isArray(todos) || todos.length === 0) {
        throw new AppError(
          '挿入対象のTodo配列が空です',
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      if (!databaseId || databaseId.trim() === '') {
        throw new AppError(
          'データベースIDが指定されていません',
          ERROR_CODES.DATABASE_NOT_FOUND
        );
      }

      // サービス層で挿入処理を実行
      const insertedTodos = await this.service.insertTodos(todos, databaseId);

      // キャッシュに保存
      this.cache.set(cacheKey, insertedTodos);

      this.logger.info('InsertRepository: Todo配列の挿入完了', {
        todoCount: insertedTodos.length,
        databaseId,
      });

      return insertedTodos;
    } catch (error) {
      this.logger.error(
        'InsertRepository: Todo配列の挿入に失敗',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          todoCount: todos.length,
          databaseId,
        }
      );
      throw error;
    }
  }

  /**
   * 単一のTodoをNotionデータベースに挿入する
   * @param todo - 挿入対象のTodo
   * @param databaseId - 挿入先のデータベースID
   * @returns 挿入されたTodo
   */
  async insertTodo(todo: Todo, databaseId: string): Promise<Todo> {
    const cacheKey = `insert:single:${databaseId}:${this.generateTodoCacheKey(todo)}`;

    try {
      this.logger.info('InsertRepository: 単一Todoをデータベースに挿入開始', {
        todoName: todo.name,
        databaseId,
      });

      // 入力値のバリデーション
      if (!todo || typeof todo.name !== 'string') {
        throw new AppError(
          '有効なTodoオブジェクトが必要です',
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      if (!databaseId || databaseId.trim() === '') {
        throw new AppError(
          'データベースIDが指定されていません',
          ERROR_CODES.DATABASE_NOT_FOUND
        );
      }

      // サービス層で挿入処理を実行
      const insertedTodo = await this.service.insertTodo(todo, databaseId);

      // キャッシュに保存
      this.cache.set(cacheKey, [insertedTodo]);

      this.logger.info('InsertRepository: 単一Todoの挿入完了', {
        todoName: todo.name,
        databaseId,
      });

      return insertedTodo;
    } catch (error) {
      this.logger.error(
        'InsertRepository: 単一Todoの挿入に失敗',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          todoName: todo.name,
          databaseId,
        }
      );
      throw error;
    }
  }

  /**
   * TodoをHabitページにリンクする
   * @param todoPageId - リンクするTodoページのID
   * @param habitPageIds - リンク先のHabitページID配列
   */
  async linkTodoToHabits(
    todoPageId: string,
    habitPageIds: string[]
  ): Promise<void> {
    try {
      this.logger.info('InsertRepository: TodoをHabitページにリンク開始', {
        todoPageId,
        habitCount: habitPageIds.length,
      });

      // 入力値のバリデーション
      if (!todoPageId || todoPageId.trim() === '') {
        throw new AppError(
          'TodoページIDが指定されていません',
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      if (!Array.isArray(habitPageIds)) {
        throw new AppError(
          'habitPageIdsは配列である必要があります',
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      if (habitPageIds.length === 0) {
        this.logger.warn('リンク対象のHabitページが指定されていません');
        return;
      }

      // サービス層でリンク処理を実行
      await this.service.linkTodoToHabits(todoPageId, habitPageIds);

      this.logger.info('InsertRepository: TodoをHabitページにリンク完了', {
        todoPageId,
        linkedHabitCount: habitPageIds.length,
      });
    } catch (error) {
      this.logger.error(
        'InsertRepository: TodoをHabitページにリンク失敗',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          todoPageId,
          habitPageIds,
        }
      );
      throw error;
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('InsertRepository: キャッシュをクリアしました');
  }

  /**
   * キャッシュ統計を取得
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Todo配列のキャッシュキーを生成
   */
  private generateCacheKey(todos: Todo[]): string {
    const todoNames = todos
      .map(t => t.name)
      .sort()
      .join(',');
    const todoCount = todos.length;
    return `${todoCount}:${todoNames}`;
  }

  /**
   * 単一Todoのキャッシュキーを生成
   */
  private generateTodoCacheKey(todo: Todo): string {
    const startTime = todo.startTime.toISOString();
    const endTime = todo.endTime.toISOString();
    return `${todo.name}:${startTime}:${endTime}`;
  }
}
