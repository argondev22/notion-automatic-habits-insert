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
    this.validateTodo(todo);
    ValidatorFactory.validateDatabaseId(databaseId);

    try {
      // TodoをNotionデータベース用のプロパティに変換
      const properties = await this.mapper.mapToNotionProperties(todo);

      // リトライ機能付きでNotion APIに挿入
      const insertedPage = await this.retryManager.executeWithRetry(async () => {
        return await this.mapper.createNotionPage(databaseId, properties);
      }, `Todo ${todo.name} の挿入`);

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
      this.validateTodo(todo);
    }
  }

  /**
   * 単一Todoのバリデーション
   * @param todo - バリデーション対象のTodo
   */
  private validateTodo(todo: Todo): void {
    if (!todo) {
      throw new AppError(
        'Todoオブジェクトが必要です',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    if (!todo.name || typeof todo.name !== 'string' || todo.name.trim() === '') {
      throw new AppError(
        'Todoの名前が必要です',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    if (!todo.startTime || !(todo.startTime instanceof Date)) {
      throw new AppError(
        'Todoの開始時間が必要です',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    if (!todo.endTime || !(todo.endTime instanceof Date)) {
      throw new AppError(
        'Todoの終了時間が必要です',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    if (todo.startTime >= todo.endTime) {
      throw new AppError(
        'Todoの開始時間は終了時間より前である必要があります',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    if (!Array.isArray(todo.profiles)) {
      throw new AppError(
        'Todoのプロファイルは配列である必要があります',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    if (!Array.isArray(todo.tobes)) {
      throw new AppError(
        'Todoのtobesは配列である必要があります',
        ERROR_CODES.VALIDATION_FAILED
      );
    }
  }
}
