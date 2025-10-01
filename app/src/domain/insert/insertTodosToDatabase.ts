import { Profile, Todo } from "../model";
import { notionClient } from "../../lib/notionhq/init";


export async function insertTodosToDatabase(todosDatabaseId: string, todos: Todo[]): Promise<void> {
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
