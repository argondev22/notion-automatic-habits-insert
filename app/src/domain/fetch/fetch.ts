import { Habit } from "../model";
import { getHabitsDatabaseId } from "./getHabitsDatabaseId";
import { fetchFromHabitsDatabase } from "./fetchFromHabitsDatabase";
import { convertToHabitModels } from "./convertToHabitModels";

export async function fetchHabits(): Promise<Habit[]> {
  try {
    // DB_HABITSのIDを取得
    const habitsDatabaseId = getHabitsDatabaseId();
    if (!habitsDatabaseId) {
      console.log("データベースIDが指定されていません");
      return [];
    }

    // DB_HABITSのデータを取得
    const results = await fetchFromHabitsDatabase(habitsDatabaseId);

    // Habitモデルに変換
    return await convertToHabitModels(results);
  } catch (error) {
    console.error(error);
    return [];
  }
}


