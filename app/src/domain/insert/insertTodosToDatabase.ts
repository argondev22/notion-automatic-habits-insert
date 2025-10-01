
import { notionClient } from "../../lib/notionhq/init";
import { DatabaseObjectResponse } from "../../lib/notionhq/type";


export async function insertTodosToDatabase(todosDatabaseId: string, todos: DatabaseObjectResponse): Promise<void> {
  for (const todo of todos) {
    await insertTodoToDatabase(todosDatabaseId, todo);
  }
}

async function insertTodoToDatabase(
  databaseId: string,
  todo: DatabaseObjectResponse
): Promise<void> {

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
      relation: todo.profiles.map(id => ({ id })),
    },
  };

  await notionClient.pages.create({
    parent: { database_id: databaseId },
    properties,
  });
}
