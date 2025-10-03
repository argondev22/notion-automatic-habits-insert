import { Habit } from "../model";
import { DatabaseObjectResponse, BlockObjectResponse } from "../../lib/notionhq/type";
import { notionClient } from "../../lib/notionhq/init";
import { PageObjectResponse, PartialDatabaseObjectResponse, PartialPageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export async function convertToHabitModels(
  habitPages: DatabaseObjectResponse
): Promise<Habit[]> {
  return await Promise.all(
    habitPages.map(async (page) => {
      // ページのコンテンツ（ブロック）を取得
      const content: BlockObjectResponse = await fetchContent(page.id);

      return createHabitModel(page, content);
    })
  );
}

async function fetchContent(pageId: string): Promise<BlockObjectResponse> {
  try {
  const blocks = await notionClient.blocks.children.list({
      block_id: pageId,
    });
    return blocks.results;
  } catch (error) {
    console.error(`ページ ${pageId} のコンテンツ取得エラー:`, error);
    return [];
  }
}

function createHabitModel(page: PageObjectResponse | PartialPageObjectResponse | PartialDatabaseObjectResponse | DatabaseObjectResponse, content: BlockObjectResponse): Habit {
  return {
    name:
      // @ts-ignore
      page.properties.NAME?.title?.[0]?.plain_text,
    time:
      // @ts-ignore
      page.properties.TIME?.rich_text?.[0]?.plain_text,
    days:
      // @ts-ignore
      page.properties.DAY?.multi_select?.map((day: any) => day.name),
    profiles:
      // @ts-ignore
      page.properties.PROFILE?.relation?.map((rel: any) => rel.id),
    tobes:
      // @ts-ignore
      page.properties.TOBE?.relation?.map((rel: any) => rel.id),
    content: content,
  };
}
