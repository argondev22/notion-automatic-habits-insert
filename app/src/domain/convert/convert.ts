import { Habit, Todo, Day } from '../model';

/**
 * HabitモデルをTodoモデルに変換する
 * @param habits - 変換対象のHabit配列
 * @returns 変換されたTodo配列
 */
export function convertHabitsToTodos(habits: Habit[]): Todo[] {
  const todos: Todo[] = [];

  for (const habit of habits) {
    const habitTodos = convertHabitToTodos(habit);
    todos.push(...habitTodos);
  }

  return todos;
}

/**
 * 単一のHabitを複数のTodoに変換する
 * @param habit - 変換対象のHabit
 * @returns 変換されたTodo配列
 */
function convertHabitToTodos(habit: Habit): Todo[] {
  const todos: Todo[] = [];

  // 現在の週の日付を取得
  const weekDates = getCurrentWeekDates();

  for (const day of habit.days) {
    const targetDate = weekDates[day];
    if (!targetDate) continue;

    const startDateTime = createDateTime(targetDate, habit.startTime);
    const endDateTime = habit.endTime
      ? createDateTime(targetDate, habit.endTime)
      : new Date(startDateTime.getTime() + 60 * 60 * 1000); // デフォルト1時間

    const todo: Todo = {
      name: habit.name,
      startTime: startDateTime,
      endTime: endDateTime,
      profiles: [...habit.profiles],
      tobes: [...habit.tobes],
      content: habit.content
    };

    todos.push(todo);
  }

  return todos;
}

/**
 * 現在の週の日付を取得する
 * @returns Day enumをキーとした日付マップ
 */
function getCurrentWeekDates(): Record<Day, Date> {
  const today = new Date();
  const dayOfWeek = today.getDay();

  // 月曜日を週の開始とする
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + 1);

  return {
    [Day.MONDAY]: new Date(monday),
    [Day.TUESDAY]: new Date(monday.getTime() + 24 * 60 * 60 * 1000),
    [Day.WEDNESDAY]: new Date(monday.getTime() + 2 * 24 * 60 * 60 * 1000),
    [Day.THURSDAY]: new Date(monday.getTime() + 3 * 24 * 60 * 60 * 1000),
    [Day.FRIDAY]: new Date(monday.getTime() + 4 * 24 * 60 * 60 * 1000),
    [Day.SATURDAY]: new Date(monday.getTime() + 5 * 24 * 60 * 60 * 1000),
    [Day.SUNDAY]: new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000),
  };
}

/**
 * 指定された日付と時間文字列からDateオブジェクトを作成する
 * @param date - 基準日付
 * @param timeString - HH:MM形式の時間文字列
 * @returns 作成されたDateオブジェクト
 */
function createDateTime(date: Date, timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const dateTime = new Date(date);
  dateTime.setHours(hours, minutes, 0, 0);
  return dateTime;
}
