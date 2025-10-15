import { Todo, Habit } from '../model';
import { EnvironmentConfig } from '../../shared/config/EnvironmentConfig';
import { ServiceFactory } from '../../shared/factories/ServiceFactory';
import { InsertRepository } from './repositories/InsertRepository';
import { AppError } from '../../shared/errors/AppError';
import { LoggerFactory } from '../../shared/logger/Logger';

/**
 * 結果の型定義
 */
export interface InsertResult<T> {
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
 * Todoデータの挿入結果
 */
export type InsertTodosResult = InsertResult<Todo[]>;

/**
 * 単一Todoデータの挿入結果
 */
export type InsertTodoResult = InsertResult<Todo>;

/**
 * メインのTodoデータ挿入関数
 * @param todos - 挿入するTodo配列
 * @param habitIds - TodoをリンクするHabitページID配列（オプション）
 *                   指定された場合、すべての挿入されたTodoが同じHabitページにリンクされます
 */
export async function insertTodos(
  todos: Todo[],
  habitIds?: string[]
): Promise<InsertTodosResult> {
  const logger = LoggerFactory.getLogger();
  const startTime = Date.now();

  try {
    // データベースIDを取得
    const todosDatabaseId = EnvironmentConfig.getTodosDatabaseId();
    if (!todosDatabaseId) {
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
    ServiceFactory.setDatabaseId(todosDatabaseId);

    // リポジトリを取得
    const insertRepository =
      ServiceFactory.getService<InsertRepository>('insertRepository');

    logger.info(`データベース ${todosDatabaseId} にTodosを挿入開始`);

    // データを挿入
    const insertedTodos = await insertRepository.insertTodos(
      todos,
      todosDatabaseId
    );

    logger.info(`${insertedTodos.length}個のTodosが正常に挿入されました`);

    // Habitページへのリンクがある場合は実行
    if (habitIds && habitIds.length > 0) {
      logger.info(
        `${insertedTodos.length}個のTodoを${habitIds.length}個のHabitページにリンク開始`
      );

      let linkedCount = 0;
      let failedCount = 0;

      for (const insertedTodo of insertedTodos) {
        if (!insertedTodo.id) {
          logger.warn(`Todo ${insertedTodo.name} にページIDが含まれていません`);
          failedCount++;
          continue;
        }

        try {
          await insertRepository.linkTodoToHabits(insertedTodo.id, habitIds);
          linkedCount++;
        } catch (error) {
          logger.error(
            `Todo ${insertedTodo.name} のHabitページへのリンクエラー`,
            error as Error,
            {
              todoPageId: insertedTodo.id,
              habitIds,
            }
          );
          failedCount++;
        }
      }

      logger.info(
        `Habitページへのリンク完了: 成功=${linkedCount}, 失敗=${failedCount}`
      );
    }

    return {
      success: true,
      data: insertedTodos,
      metadata: {
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Todos挿入エラー', error as Error, { executionTime });

    if (error instanceof AppError) {
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
 * 特定のTodoデータを挿入
 * @param todo - 挿入するTodoデータ
 * @param habitIds - TodoをリンクするHabitページID配列（オプション）
 */
export async function insertTodo(
  todo: Todo,
  habitIds?: string[]
): Promise<InsertTodoResult> {
  const logger = LoggerFactory.getLogger();
  const startTime = Date.now();

  try {
    if (!todo || typeof todo.name !== 'string') {
      const errorMessage = '有効なTodoオブジェクトが必要です';
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
    const todosDatabaseId = EnvironmentConfig.getTodosDatabaseId();
    if (!todosDatabaseId) {
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
    ServiceFactory.setDatabaseId(todosDatabaseId);

    // リポジトリを取得
    const insertRepository =
      ServiceFactory.getService<InsertRepository>('insertRepository');

    logger.info(`Todo ${todo.name} をデータベースに挿入開始`);

    // データを挿入
    const insertedTodo = await insertRepository.insertTodo(
      todo,
      todosDatabaseId
    );

    logger.info(`Todo ${todo.name} が正常に挿入されました`);

    // Habitページへのリンクがある場合は実行
    if (habitIds && habitIds.length > 0) {
      if (!insertedTodo.id) {
        logger.error('挿入されたTodoにページIDが含まれていません');
        return {
          success: false,
          error: '挿入されたTodoにページIDが含まれていません',
          metadata: {
            timestamp: new Date(),
            executionTime: Date.now() - startTime,
          },
        };
      }

      logger.info(
        `Todo ${todo.name} を${habitIds.length}個のHabitページにリンク開始`
      );

      try {
        await insertRepository.linkTodoToHabits(insertedTodo.id, habitIds);
        logger.info(`Todo ${todo.name} のHabitページへのリンクが完了しました`);
      } catch (error) {
        logger.error('Habitページへのリンクエラー', error as Error, {
          todoPageId: insertedTodo.id,
          habitIds,
        });
        // リンクエラーは警告として扱い、Todo自体の挿入は成功として返す
        logger.warn(
          'Todo挿入は成功しましたが、Habitページへのリンクに失敗しました'
        );
      }
    }

    return {
      success: true,
      data: insertedTodo,
      metadata: {
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Todo挿入エラー', error as Error, {
      todoName: todo?.name,
      executionTime,
    });

    if (error instanceof AppError) {
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
export function clearInsertCache(): void {
  ServiceFactory.clearAllCaches();
  LoggerFactory.getLogger().info('すべてのキャッシュをクリアしました');
}

/**
 * キャッシュ統計を取得
 */
export function getInsertCacheStats() {
  return ServiceFactory.getCacheStats();
}

/**
 * 設定を更新
 */
export function updateInsertConfig(config: Record<string, unknown>): void {
  ServiceFactory.updateConfig(config);
  LoggerFactory.getLogger().info('設定を更新しました', { config });
}

/**
 * ヘルスチェック
 */
export async function insertHealthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: Record<string, unknown>;
}> {
  try {
    ServiceFactory.initialize();

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

/**
 * TodoをHabitの名前でマッチングして挿入し、リンクする
 *
 * @param todos - 挿入するTodo配列
 * @param habits - マッチング用のHabit配列
 * @returns 挿入されたTodoの配列とリンク統計
 */
export async function insertTodosWithHabitMatching(
  todos: Todo[],
  habits: Habit[]
): Promise<
  InsertResult<{
    insertedTodos: Todo[];
    linkedCount: number;
    totalCount: number;
  }>
> {
  const logger = LoggerFactory.getLogger();
  const startTime = Date.now();

  try {
    // Habitの名前→IDのマッピングを作成
    const habitNameToIdMap = new Map<string, string>();
    for (const habit of habits) {
      if (habit.id) {
        habitNameToIdMap.set(habit.name, habit.id);
      }
    }

    logger.info('Habit名前マッピングを作成', {
      habitCount: habits.length,
      mappedCount: habitNameToIdMap.size,
    });

    // 各Todoを個別に挿入し、同じ名前のHabitにリンク
    const insertedTodos: Todo[] = [];
    let linkedCount = 0;

    for (const todo of todos) {
      // Todoを挿入
      const habitId = habitNameToIdMap.get(todo.name);
      const habitIds = habitId ? [habitId] : [];

      logger.info(`Todo ${todo.name} を挿入`, {
        todoName: todo.name,
        matchedHabitId: habitId,
        willLink: habitIds.length > 0,
      });

      const insertResult = await insertTodo(todo, habitIds);

      if (insertResult.success && insertResult.data) {
        insertedTodos.push(insertResult.data);
        if (habitIds.length > 0) {
          linkedCount++;
        }
      } else {
        logger.error(`Todo ${todo.name} の挿入に失敗`, undefined, {
          error: insertResult.error,
        });
      }
    }

    logger.info('Todoの挿入とHabitリンクが完了', {
      totalCount: todos.length,
      insertedCount: insertedTodos.length,
      linkedCount: linkedCount,
    });

    return {
      success: true,
      data: {
        insertedTodos,
        linkedCount,
        totalCount: todos.length,
      },
      metadata: {
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    logger.error(
      'TodoのHabitマッチング挿入中にエラーが発生しました',
      error instanceof Error ? error : new Error('Unknown error')
    );
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unknown error occurred',
      metadata: {
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
      },
    };
  }
}
