import { Todo } from '../../model';
import { ILogger } from '../../../shared/logger/Logger';
import { ICache } from '../../../shared/cache/Cache';
import { RetryManager } from '../../../shared/retry/RetryManager';
import { InsertMapper } from '../mappers/InsertMapper';
import { AppError, ERROR_CODES } from '../../../shared/errors/AppError';
import { ValidatorFactory } from '../../../shared/validation/Validator';

/**
 * InsertService - サービス層
 * TodoデータのNotionデータベースへの挿入ビジネスロジックを管理
 */
export class InsertService {
  constructor(
    private mapper: InsertMapper,
    private logger: ILogger,
    private cache: ICache<Todo[]>,
    private retryManager: RetryManager
  ) {}

  /**
   * Todo配列をNotionデータベースに挿入する
   * @param todos - 挿入対象のTodo配列
   * @param databaseId - 挿入先のデータベースID
   * @returns 挿入されたTodo配列
   */
  async insertTodos(todos: Todo[], databaseId: string): Promise<Todo[]> {
    this.logger.info('InsertService: Todo配列の挿入処理開始', {
      todoCount: todos.length,
      databaseId,
    });

    // バリデーション
    ValidatorFactory.validateDatabaseId(databaseId);
    this.validateTodos(todos);

    const insertedTodos: Todo[] = [];

    for (const todo of todos) {
      try {
        const insertedTodo = await this.insertTodo(todo, databaseId);
        insertedTodos.push(insertedTodo);
      } catch (error) {
        this.logger.error(
          'InsertService: 単一Todoの挿入に失敗',
          error instanceof Error ? error : new Error('Unknown error'),
          {
            todoName: todo.name,
            databaseId,
          }
        );
        // 個別のTodo挿入失敗は全体の処理を止めない
        continue;
      }
    }

    this.logger.info('InsertService: Todo配列の挿入処理完了', {
      insertedCount: insertedTodos.length,
      totalCount: todos.length,
      databaseId,
    });

    return insertedTodos;
  }

  /**
   * 単一のTodoをNotionデータベースに挿入する
   * @param todo - 挿入対象のTodo
   * @param databaseId - 挿入先のデータベースID
   * @returns 挿入されたTodo
   */
  async insertTodo(todo: Todo, databaseId: string): Promise<Todo> {
    this.logger.info('InsertService: 単一Todoの挿入処理開始', {
      todoName: todo.name,
      databaseId,
    });

    // バリデーション
    ValidatorFactory.validateTodo(todo);
    ValidatorFactory.validateDatabaseId(databaseId);

    try {
      // TodoをNotionデータベース用のプロパティに変換
      const properties = await this.mapper.mapToNotionProperties(todo);

      // Notion APIに挿入
      const insertedPage = await this.retryManager.executeWithRetry(
        async () => {
          return await this.mapper.createNotionPage(
            databaseId,
            properties,
            todo.content
          );
        },
        `Todo ${todo.name} の挿入`
      );

      // 挿入されたTodoを返す
      const insertedTodo = await this.mapper.mapFromNotionPage(insertedPage);

      this.logger.info('InsertService: 単一Todoの挿入処理完了', {
        todoName: todo.name,
        pageId: insertedPage.id,
        databaseId,
      });

      return insertedTodo;
    } catch (error) {
      this.logger.error(
        'InsertService: 単一Todoの挿入に失敗',
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
   * Todo配列のバリデーション
   * @param todos - バリデーション対象のTodo配列
   */
  private validateTodos(todos: Todo[]): void {
    if (!Array.isArray(todos)) {
      throw new AppError(
        'todosは配列である必要があります',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    if (todos.length === 0) {
      throw new AppError(
        '挿入対象のTodo配列が空です',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    for (const todo of todos) {
      ValidatorFactory.validateTodo(todo);
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
    this.logger.info('InsertService: TodoをHabitページにリンク開始', {
      todoPageId,
      habitCount: habitPageIds.length,
    });

    // バリデーション
    ValidatorFactory.validateId(todoPageId);

    if (!Array.isArray(habitPageIds)) {
      throw new AppError(
        'habitPageIdsは配列である必要があります',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    if (habitPageIds.length === 0) {
      this.logger.warn('リンク対象のHabitページが指定されていません');
      return;
    }

    // 各HabitページIDをバリデーション
    for (const habitPageId of habitPageIds) {
      ValidatorFactory.validateId(habitPageId);
    }

    try {
      // 各HabitページにTodoをリンク
      const linkPromises = habitPageIds.map(habitPageId =>
        this.retryManager.executeWithRetry(async () => {
          return await this.mapper.addTodoRelationToHabit(
            habitPageId,
            todoPageId
          );
        }, `HabitページID ${habitPageId} へのリンク`)
      );

      await Promise.all(linkPromises);

      this.logger.info('InsertService: TodoをHabitページにリンク完了', {
        todoPageId,
        linkedHabitCount: habitPageIds.length,
      });
    } catch (error) {
      this.logger.error(
        'InsertService: TodoをHabitページにリンク失敗',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          todoPageId,
          habitPageIds,
        }
      );
      throw error;
    }
  }
}
