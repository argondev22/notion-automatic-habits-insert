import { notionClient } from "../../lib/notionhq/init";
import { Habit, Todo, Profile } from "../model";
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

function getTodosDatabaseId() {
  const todosDatabaseId = process.env.TODOS_DATABASE_ID;
  if (!todosDatabaseId) {
    return;
  }
  return todosDatabaseId;
}

function convertHabitToTodos(habits: Habit[]): Todo[] {
  return [];
}

async function insertTodosToDatabase(todosDatabaseId: string, todos: Todo[]): Promise<void> {
  for (const todo of todos) {
    await insertTodoToDatabase(todosDatabaseId, todo);
    console.log(
      `Todoを作成しました: ${todo.name}`
    );
  }
}

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
