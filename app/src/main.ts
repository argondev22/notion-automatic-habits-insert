import { ServiceFactory } from './shared/factories/ServiceFactory';
import { ILogger } from './shared/logger/Logger';
import { fetchHabits } from './domain/fetch/fetch';
import { convertHabitsToTodos } from './domain/convert/convert';
import { insertTodosWithHabitMatching } from './domain/insert/insert';

const logger = ServiceFactory.getService<ILogger>('logger');

async function main() {
  try {
    // DB_HABITSのデータを取得
    const habitsResult = await fetchHabits();
    if (!habitsResult.success || !habitsResult.data) {
      logger.error('習慣データの取得に失敗しました', undefined, {
        error: habitsResult.error,
      });
      return;
    }

    // HabitモデルをTodoモデルに変換
    logger.info('変換開始', { habitCount: habitsResult.data.length });
    const todosResult = await convertHabitsToTodos(habitsResult.data);
    logger.info('変換結果', {
      success: todosResult.success,
      todoCount: todosResult.data?.length || 0,
      error: todosResult.error,
    });
    if (!todosResult.success || !todosResult.data) {
      logger.error('変換に失敗しました', undefined, {
        error: todosResult.error,
      });
      return;
    }

    if (todosResult.data.length === 0) {
      logger.warn(
        '変換されたTodoが0個です。今日実行すべきHabitがない可能性があります'
      );
      return;
    }

    // TodoをHabitにマッチングして挿入
    const insertResult = await insertTodosWithHabitMatching(
      todosResult.data,
      habitsResult.data
    );

    if (!insertResult.success || !insertResult.data) {
      logger.error('Todoの挿入に失敗しました', undefined, {
        error: insertResult.error,
      });
      return;
    }

    logger.info('すべての処理が完了しました', {
      habitCount: habitsResult.data.length,
      todoCount: insertResult.data.insertedTodos.length,
      linkedCount: insertResult.data.linkedCount,
    });
  } catch (error) {
    logger.error('エラーが発生しました', undefined, { error });
  }
}

main();
