import { ServiceFactory } from './shared/factories/ServiceFactory';
import { ILogger } from './shared/logger/Logger';
import { fetchHabits } from './domain/fetch/fetch';
import { convertHabitsToTodos } from './domain/convert/convert';
import { insertTodos } from './domain/insert/insert';

const logger = ServiceFactory.getService<ILogger>('logger');

async function main() {
  try {
    // DB_HABITSのデータを取得
  const habitsResult = await fetchHabits();
  if (!habitsResult.success || !habitsResult.data) {
    logger.error('習慣データの取得に失敗しました', undefined, { error: habitsResult.error });
    return;
  }

  // HabitモデルをTodoモデルに変換
  const todosResult = await convertHabitsToTodos(habitsResult.data);
  if (!todosResult.success || !todosResult.data) {
    logger.error('変換に失敗しました', undefined, { error: todosResult.error });
    return;
  }

  // // DB_TODOSにデータを追加
  const insertTodosResult = await insertTodos(todosResult.data);
  if (!insertTodosResult.success || !insertTodosResult.data) {
    logger.error('挿入に失敗しました', undefined, { error: insertTodosResult.error });
    return;
  }
  } catch (error) {
    logger.error('エラーが発生しました', undefined, { error });
  }
}

main();
