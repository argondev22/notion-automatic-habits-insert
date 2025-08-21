import { notionClient } from "./lib/notionhq/init"

async function main(): Promise<void> {
	try {
		const response = await notionClient.search({
			filter: { value: 'page', property: 'object' },
			page_size: 1
		})
		console.log('Notion connected. First result summary:')
		console.log({ results: response.results })
	} catch (error) {
		console.error('Notion API call error:', error)
		return
	}
}

main()
