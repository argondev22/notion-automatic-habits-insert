import { Habit } from "../model";
import { getTodosDatabaseId } from "./getTodosDatabaseId";
import { insertTodosToDatabase } from "./insertTodosToDatabase";
import { todos } from "../../test/data/todos";

export async function insertHabitsToTodosDatabase(
  habits: Habit[]
): Promise<void> {
  // DB_TODOSのIDを取得
  const todosDatabaseId = getTodosDatabaseId();
  if (!todosDatabaseId) {
    console.log("データベースIDが指定されていません");
    return;
  }

  // DB_HABITSのデータ形式をDB_TODOSのデータ形式に変換
  // const todos = convertHabitToTodos(habits);

  // DB_TODOSにデータを追加
  await insertTodosToDatabase(todosDatabaseId, todos);
}
