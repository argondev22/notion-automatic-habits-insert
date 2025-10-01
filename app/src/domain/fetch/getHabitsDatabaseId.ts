export function getHabitsDatabaseId() {
  const habitsDatabaseId = process.env.HABITS_DATABASE_ID;
  if (!habitsDatabaseId) {
    return;
  }
  return habitsDatabaseId;
}
