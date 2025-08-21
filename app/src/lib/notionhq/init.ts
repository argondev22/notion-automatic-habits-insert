import { Client } from "@notionhq/client"

const secret = process.env.INTEGRATION_SECRET
	if (!secret) {
		console.error('No integration secret found')
	}

export const notionClient = new Client({ auth: secret })
