import { fetchHabits, insertHabitsToTodosDatabase } from "./domain";

async function main() {
  try {
    const habits = await fetchHabits();
    console.log(habits);
    // await insertHabitsToTodosDatabase(habits)
  } catch (error) {
    console.error(error);
  }
}

main();
