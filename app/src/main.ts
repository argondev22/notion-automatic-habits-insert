import { fetchHabits } from "./domain/fetch/fetch";
import { insertHabitsToTodosDatabase } from "./domain/insert/insert";
import { habits } from "./test/data/habits";

async function main() {
  try {
    // const habits = await fetchHabits();
    // console.log(habits);

    console.log(habits);
    await insertHabitsToTodosDatabase(habits);
  } catch (error) {
    console.error(error);
  }
}

main();
