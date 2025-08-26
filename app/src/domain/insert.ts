import { Habit } from "./model";

export async function insertHabitsToTodosDatabase(
  habits: Habit[]
): Promise<void> {
  const todosDatabaseId = process.env.TODOS_DATABASE_ID;
  if (!todosDatabaseId) {
    console.log("データベースIDが指定されていません");
    return;
  }
}
