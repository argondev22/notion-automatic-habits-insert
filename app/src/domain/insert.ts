import { notionClient } from "../lib/notionhq/init";
import { Habit, Todo, Day, Profile } from "./model";

export async function insertHabitsToTodosDatabase(
  habits: Habit[]
): Promise<void> {
  const todosDatabaseId = process.env.TODOS_DATABASE_ID;
  if (!todosDatabaseId) {
    console.log("データベースIDが指定されていません");
    return;
  }

  console.log(
    `${habits.length}個のハビットをTodosデータベースにインサート中...`
  );

  for (const habit of habits) {
    try {
      const todos = convertHabitToTodos(habit);

      for (const todo of todos) {
        await insertTodoToDatabase(todosDatabaseId, todo);
        console.log(
          `Todoを作成しました: ${todo.name} (${todo.startTime}-${todo.endTime})`
        );
      }
    } catch (error) {
      console.error(`ハビット "${habit.name}" のインサートに失敗:`, error);
    }
  }

  console.log("すべてのハビットのインサートが完了しました");
}

function convertHabitToTodos(habit: Habit): Todo[] {
  const todos: Todo[] = [];

  // 時間の解析
  const timeRange = habit.time.split("-");
  const startTime = timeRange[0] || habit.time;
  const endTime = timeRange[1] || startTime;

  // 各曜日に対してTodoを作成
  for (const day of habit.days) {
    todos.push({
      name: `${habit.name} (${getDayName(day)})`,
      startTime,
      endTime,
      profile: habit.profile,
      content: JSON.stringify(habit.content),
    });
  }

  return todos;
}

function getDayName(day: Day): string {
  const dayNames = {
    [Day.MONDAY]: "月曜日",
    [Day.TUESDAY]: "火曜日",
    [Day.WEDNESDAY]: "水曜日",
    [Day.THURSDAY]: "木曜日",
    [Day.FRIDAY]: "金曜日",
    [Day.SATURDAY]: "土曜日",
    [Day.SUNDAY]: "日曜日",
  };
  return dayNames[day];
}

function getProfileName(profile: Profile): string {
  const profileNames = {
    [Profile.ENGINEER]: "エンジニア",
    [Profile.WORK]: "仕事",
    [Profile.PRIVATE]: "プライベート",
  };
  return profileNames[profile];
}

async function insertTodoToDatabase(
  databaseId: string,
  todo: Todo
): Promise<void> {
  const profileTags = todo.profile.map((p) => ({ name: getProfileName(p) }));

  await notionClient.pages.create({
    parent: { database_id: databaseId },
    properties: {
      Name: {
        title: [
          {
            text: {
              content: todo.name,
            },
          },
        ],
      },
      // 開始時間: {
      //   rich_text: [
      //     {
      //       text: {
      //         content: todo.startTime,
      //       },
      //     },
      //   ],
      // },
      // 終了時間: {
      //   rich_text: [
      //     {
      //       text: {
      //         content: todo.endTime,
      //       },
      //     },
      //   ],
      // },
      // プロフィール: {
      //   multi_select: profileTags,
      // },
      // 内容: {
      //   rich_text: [
      //     {
      //       text: {
      //         content: todo.content,
      //       },
      //     },
      //   ],
      // },
    },
  });
}
