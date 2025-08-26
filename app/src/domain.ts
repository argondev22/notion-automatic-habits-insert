import { notionClient } from "./lib/notionhq/init"
import { Habit, Todo } from "./model"

export async function fetchHabitsDatabase(): Promise<Habit[]> {
	try {
		// 特定のデータベースの詳細情報を取得
		// 環境変数からデータベースIDを取得（セキュリティのため）
		const habitsDatabaseId = process.env.HABITS_DATABASE_ID
		if (!habitsDatabaseId) {
      console.log('データベースIDが指定されていません')
      return []
    }

    // データベース内のページを取得
    const habitPages = await notionClient.databases.query({
      database_id: habitsDatabaseId,
    })

    // 取得したページから必要なデータを抽出
    return habitPages.results.map((page, index) => {
      return {
        // @ts-ignore
        name: page.properties.NAME?.title?.[0]?.plain_text || 'タイトルが取得できませんでした',
        // @ts-ignore
        time: page.properties.TIME?.rich_text?.[0]?.plain_text || '開始時間が取得できませんでした',
        // @ts-ignore
        days: page.properties.DAY.multi_select.map((day: any) => day.name) || '曜日が取得できませんでした',
        // @ts-ignore
        profile: page.properties.PROFILE.relation?.[0].id || 'プロフィールが取得できませんでした',
      }
    })
	} catch (error) {
		console.error('Notion API call error:', error)
		return []
	}
}

export async function insertHabitsToTodosDatabase(habits: Habit[]): Promise<void> {
  const todosDatabaseId = process.env.TODOS_DATABASE_ID
  if (!todosDatabaseId) {
    console.log('データベースIDが指定されていません')
    return
  }
}
