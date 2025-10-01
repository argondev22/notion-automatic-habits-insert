import { Habit } from "../model";
import { convertHabitToTodos } from "./convertHabitToTodos";
import { getTodosDatabaseId } from "./getTodosDatabaseId";
import { insertTodosToDatabase } from "./insertTodosToDatabase";

export async function insertHabitsToTodosDatabase(
  habits: Habit[]
): Promise<void> {
  try {
    // DB_HABITSのデータ形式をDB_TODOSのデータ形式に変換
    const todos = convertHabitToTodos(habits);

    // DB_TODOSのIDを取得
    const todosDatabaseId = getTodosDatabaseId();
    if (!todosDatabaseId) {
      console.log("データベースIDが指定されていません");
      return;
    }

    // DB_TODOSにデータを追加
    await insertTodosToDatabase(todosDatabaseId, todos);
  } catch (error) {
    console.error(error);
  }
}
