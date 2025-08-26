import { fetchHabits } from "./domain/fetch";
import { insertHabitsToTodosDatabase } from "./domain/insert";

async function main() {
  try {
    const habits = await fetchHabits();
    console.log(habits);
    // await insertHabitsToTodosDatabase(habits);
  } catch (error) {
    console.error(error);
  }
}

main();
