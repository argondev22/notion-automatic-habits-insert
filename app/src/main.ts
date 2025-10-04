import { fetchHabits } from './domain/fetch/fetch';
// import { convertHabitsToTodos } from './domain/convert/convert';
// import { insertTodos } from './domain/insert/insert';

async function main() {
  try {
    // DB_HABITSのデータを取得
    const habits = await fetchHabits();
    console.log(habits);

    // // HabitモデルをTodoモデルに変換
    // const todos = convertHabitsToTodos(habits);

    // // DB_TODOSにデータを追加
    // await insertTodos(todos);
  } catch (error) {
    console.error(error);
  }
}

main();
