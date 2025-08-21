import { Client } from '@notionhq/client'

async function main(): Promise<void> {
	const token = process.env.NOTION_TOKEN
	if (!token) {
		console.error('環境変数 NOTION_TOKEN が設定されていません (.env を確認)')
		return
	}

	const notion = new Client({ auth: token })

	try {
		const response = await notion.search({
			filter: { value: 'page', property: 'object' },
			page_size: 1
		})
		console.log('Notion connected. First result summary:')
		console.log({ results: response.results.length })
	} catch (error) {
		console.error('Notion API 呼び出しでエラーが発生しました:', error)
		return
	}
}

main()
