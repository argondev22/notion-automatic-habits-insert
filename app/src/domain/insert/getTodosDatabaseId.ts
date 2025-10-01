export function getTodosDatabaseId() {
  const todosDatabaseId = process.env.TODOS_DATABASE_ID;
  if (!todosDatabaseId) {
    return;
  }
  return todosDatabaseId;
}
