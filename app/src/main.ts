import { ServiceFactory } from './shared/factories/ServiceFactory';
import { ILogger } from './shared/logger/Logger';
import { fetchHabits } from './domain/fetch/fetch';
import { convertHabitsToTodos } from './domain/convert/convert';
import { insertTodo } from './domain/insert/insert';

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

    // HabitとTodoの名前でマッピングを作成
    const habitNameToIdMap = new Map<string, string>();
    for (const habit of habitsResult.data) {
      if (habit.id) {
        habitNameToIdMap.set(habit.name, habit.id);
      }
    }

    logger.info('Habit名前マッピングを作成', {
      habitCount: habitsResult.data.length,
      mappedCount: habitNameToIdMap.size,
    });

    // 各Todoを個別に挿入し、同じ名前のHabitにリンク
    const insertedTodos: typeof todosResult.data = [];
    let linkedCount = 0;

    for (const todo of todosResult.data) {
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

    logger.info('すべての処理が完了しました', {
      habitCount: habitsResult.data.length,
      todoCount: insertedTodos.length,
      linkedCount: linkedCount,
    });
  } catch (error) {
    logger.error('エラーが発生しました', undefined, { error });
  }
}

main();
