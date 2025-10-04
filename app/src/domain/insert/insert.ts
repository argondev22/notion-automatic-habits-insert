import { Todo } from '../model';
// import { convertToTodosDatabase } from './convertToTodosDatabase';
import { getTodosDatabaseId } from './getTodosDatabaseId';
// import { insertTodosToDatabase } from "./insertTodosToDatabase";

export async function insertTodos(_todos: Todo[]): Promise<void> {
  try {
    // TodoモデルをDB_TODOSのデータに変換
    // const _results = convertToTodosDatabase(todos);

    // DB_TODOSのIDを取得
    const todosDatabaseId = getTodosDatabaseId();
    if (!todosDatabaseId) {
      console.log('データベースIDが指定されていません');
      return;
    }

    // DB_TODOSにデータを追加
    // await insertTodosToDatabase(todosDatabaseId, results);
  } catch (error) {
    console.error(error);
  }
}
