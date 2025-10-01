import { notionClient } from "../../lib/notionhq/init";
import { DatabaseObjectResponse } from "../../lib/notionhq/type";

export async function fetchHabitsFromDatabase(habitsDatabaseId: string): Promise<DatabaseObjectResponse> {
  const habits = await notionClient.databases.query({
    database_id: habitsDatabaseId,
  });
  return habits.results;
}
