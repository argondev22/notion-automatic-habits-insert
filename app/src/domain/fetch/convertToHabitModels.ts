import { Habit } from "../model";
import { DatabaseObjectResponse } from "../../lib/notionhq/type";
import { BlockObjectResponse } from "../../lib/notionhq/type";
import { notionClient } from "../../lib/notionhq/init";

export async function convertToHabitModels(
  habitPages: DatabaseObjectResponse
): Promise<Habit[]> {
  // 取得したページから必要なデータを抽出
  return await Promise.all(
    habitPages.map(async (page) => {
      // ページのコンテンツ（ブロック）を取得
      let content: BlockObjectResponse = [];
      try {
        // @ts-ignore
        const blocks = await notionClient.blocks.children.list({
          block_id: page.id,
        });

        content = blocks.results;
      } catch (error) {
        console.error(`ページ ${page.id} のコンテンツ取得エラー:`, error);
      }

      return {
        name:
          // @ts-ignore
          page.properties.NAME?.title?.[0]?.plain_text ||
          "タイトルが取得できませんでした",
        time:
          // @ts-ignore
          page.properties.TIME?.rich_text?.[0]?.plain_text ||
          "開始時間が取得できませんでした",
        days:
          // @ts-ignore
          page.properties.DAY?.multi_select?.map((day: any) => day.name) ||
          "曜日が取得できませんでした",
        profiles:
          // @ts-ignore
          page.properties.PROFILE?.relation?.map((rel: any) => rel.id) ||
          ["プロフィールが取得できませんでした"],
        content: content,
      };
    })
  );
}
