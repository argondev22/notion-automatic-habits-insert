import { notionClient } from "../../lib/notionhq/init";
import { DatabaseObjectResponse } from "../../lib/notionhq/type";

export async function fetchFromHabitsDatabase(habitsDatabaseId: string): Promise<DatabaseObjectResponse> {
  const habits = await notionClient.databases.query({
    database_id: habitsDatabaseId,
  });
  return habits.results;
}
