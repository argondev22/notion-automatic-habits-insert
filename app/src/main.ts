import { fetchHabitsDatabase, insertHabitsToTodosDatabase } from "./domain"

async function main() {
  try {
    const habits = await fetchHabitsDatabase()
    console.log(habits)
    // await insertHabitsToTodosDatabase(habits)
  } catch (error) {
    console.error(error)
  }
}

main()
