import { Habit, Todo } from '../model';
import { ServiceFactory } from '../../shared/factories/ServiceFactory';
import { ConvertRepository } from './repositories/ConvertRepository';
import { ILogger } from '../../shared/logger/Logger';

/**
 * 変換結果の型定義
 */
export interface ConvertResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * HabitモデルをTodoモデルに変換する（メインAPI）
 * @param habits - 変換対象のHabit配列
 * @returns 変換結果
 */
export async function convertHabitsToTodos(
  habits: Habit[]
): Promise<ConvertResult<Todo[]>> {
  const logger = ServiceFactory.getService<ILogger>('logger');

  try {
    logger.info('convertHabitsToTodos: 変換処理開始', {
      habitCount: habits.length,
    });

    // 入力値のバリデーション
    if (!Array.isArray(habits)) {
      throw new Error('habitsは配列である必要があります');
    }

    if (habits.length === 0) {
      logger.warn('convertHabitsToTodos: 空のHabit配列が渡されました');
      return {
        success: true,
        data: [],
      };
    }

    // Repository層を使用して変換処理を実行
    const repository =
      ServiceFactory.getService<ConvertRepository>('convertRepository');
    const todos = await repository.convertHabitsToTodos(habits);

    logger.info('convertHabitsToTodos: 変換処理完了', {
      todoCount: todos.length,
    });

    return {
      success: true,
      data: todos,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      'convertHabitsToTodos: 変換処理に失敗',
      error instanceof Error ? error : new Error('Unknown error'),
      {
        habitCount: habits.length,
      }
    );

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 単一のHabitをTodo配列に変換する（メインAPI）
 * @param habit - 変換対象のHabit
 * @returns 変換結果
 */
export async function convertHabitToTodos(
  habit: Habit
): Promise<ConvertResult<Todo[]>> {
  const logger = ServiceFactory.getService<ILogger>('logger');

  try {
    logger.info('convertHabitToTodos: 単一Habit変換処理開始', {
      habitName: habit.name,
    });

    // 入力値のバリデーション
    if (!habit || typeof habit.name !== 'string') {
      throw new Error('有効なHabitオブジェクトが必要です');
    }

    // Repository層を使用して変換処理を実行
    const repository =
      ServiceFactory.getService<ConvertRepository>('convertRepository');
    const todos = await repository.convertHabitToTodos(habit);

    logger.info('convertHabitToTodos: 単一Habit変換処理完了', {
      habitName: habit.name,
      todoCount: todos.length,
    });

    return {
      success: true,
      data: todos,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      'convertHabitToTodos: 単一Habit変換処理に失敗',
      error instanceof Error ? error : new Error('Unknown error'),
      {
        habitName: habit?.name || 'Unknown',
      }
    );

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * キャッシュをクリアする
 */
export function clearConvertCache(): void {
  const logger = ServiceFactory.getService<ILogger>('logger');

  try {
    const repository =
      ServiceFactory.getService<ConvertRepository>('convertRepository');
    repository.clearCache();

    logger.info('clearConvertCache: キャッシュクリア完了');
  } catch (error) {
    logger.error(
      'clearConvertCache: キャッシュクリアに失敗',
      error instanceof Error ? error : new Error('Unknown error')
    );
  }
}

/**
 * キャッシュ統計を取得する
 */
export function getConvertCacheStats() {
  const logger = ServiceFactory.getService<ILogger>('logger');

  try {
    const repository =
      ServiceFactory.getService<ConvertRepository>('convertRepository');
    const stats = repository.getCacheStats();

    logger.debug('getConvertCacheStats: キャッシュ統計取得完了', { stats });
    return stats;
  } catch (error) {
    logger.error(
      'getConvertCacheStats: キャッシュ統計取得に失敗',
      error instanceof Error ? error : new Error('Unknown error')
    );
    return null;
  }
}
