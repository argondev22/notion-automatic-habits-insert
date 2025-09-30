import { notionClient } from "../lib/notionhq/init";
import { Habit, Todo, Profile } from "./model";
import { todos } from "../test/data/todos";

export async function insertHabitsToTodosDatabase(
  habits: Habit[]
): Promise<void> {
  const todosDatabaseId = process.env.TODOS_DATABASE_ID;
  if (!todosDatabaseId) {
    console.log("データベースIDが指定されていません");
    return;
  }

  for (const todo of todos) {
    await insertTodoToDatabase(todosDatabaseId, todo);
    console.log(
      `Todoを作成しました: ${todo.name}`
    );
  }
}

// function convertHabitToTodos(habit: Habit): Todo[] {
//   const todos: Todo[] = [];

//   // 時間の解析
//   const timeRange = habit.time.split("-");
//   const startTime = timeRange[0] || habit.time;
//   const endTime = timeRange[1] || startTime;

//   // 各曜日に対してTodoを作成
//   for (const day of habit.days) {
//     todos.push({
//       name: `${habit.name} (${getDayName(day)})`,
//       startTime,
//       endTime,
//       profile: habit.profile,
//       content: JSON.stringify(habit.content),
//     });
//   }

//   return todos;
// }

async function insertTodoToDatabase(
  databaseId: string,
  todo: Todo
): Promise<void> {
  const profilePageId = {
    [Profile.PRIVATE]: process.env.PRIVATE_PROFILE_ID,
    [Profile.ENGINEER]: process.env.ENGINEER_PROFILE_ID,
    [Profile.WORK]: process.env.WORK_PROFILE_ID,
  };
  const profilePageIds = todo.profiles.map(p => profilePageId[p]);

  const properties: any = {
    NAME: {
      title: [
        {
          text: {
            content: todo.name,
          },
        },
      ],
    },
    EXPECTED: {
      date: {
        start: todo.startTime.toISOString(),
        end: todo.endTime.toISOString(),
      },
    },
    PROFILE: {
      relation: profilePageIds.map(id => ({ id })),
    },
  };

  await notionClient.pages.create({
    parent: { database_id: databaseId },
    properties,
  });
}
