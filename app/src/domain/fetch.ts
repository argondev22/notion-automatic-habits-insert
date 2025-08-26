import { notionClient } from "../lib/notionhq/init";
import {
  BlockObjectResponse,
  DatabaseObjectResponse,
} from "../lib/notionhq/type";
import { Habit } from "./model";

export async function fetchHabits(): Promise<Habit[]> {
  try {
    // 特定のデータベースの詳細情報を取得
    const habitsDatabaseId = process.env.HABITS_DATABASE_ID;
    if (!habitsDatabaseId) {
      console.log("データベースIDが指定されていません");
      return [];
    }

    // データベース内のページを取得
    const habitPages = await notionClient.databases.query({
      database_id: habitsDatabaseId,
    });

    return await extractHabitsFromPages(habitPages.results);
  } catch (error) {
    console.error("Notion API call error:", error);
    return [];
  }
}

async function extractHabitsFromPages(
  habitPages: DatabaseObjectResponse
): Promise<Habit[]> {
  // 取得したページから必要なデータを抽出
  return await Promise.all(
    habitPages.map(async (page) => {
      // ページのコンテンツ（ブロック）を取得
      let content = "";
      try {
        // @ts-ignore
        const blocks = await notionClient.blocks.children.list({
          block_id: page.id,
        });

        // ブロックからテキストコンテンツを抽出
        content = await extractContentFromBlocks(blocks.results);
      } catch (error) {
        console.error(`ページ ${page.id} のコンテンツ取得エラー:`, error);
        content = "コンテンツの取得に失敗しました";
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
        profile:
          // @ts-ignore
          page.properties.PROFILE?.relation?.[0]?.id ||
          "プロフィールが取得できませんでした",
        content: content,
      };
    })
  );
}

async function extractContentFromBlocks(blocks: BlockObjectResponse) {
  const BLOCK_TYPE = {
    PARAGRAPH: "paragraph",
    HEADING_1: "heading_1",
    HEADING_2: "heading_2",
    BULLETED_LIST_ITEM: "bulleted_list_item",
  };
  return blocks
    .map((block: any) => {
      if (block.type === BLOCK_TYPE.PARAGRAPH && block.paragraph?.rich_text) {
        return convertRichtextToPlainText(block.paragraph.rich_text);
      }
      if (block.type === BLOCK_TYPE.HEADING_1 && block.heading_1?.rich_text) {
        return convertRichtextToPlainText(block.heading_1.rich_text);
      }
      if (block.type === BLOCK_TYPE.HEADING_2 && block.heading_2?.rich_text) {
        return convertRichtextToPlainText(block.heading_2.rich_text);
      }
      if (
        block.type === BLOCK_TYPE.BULLETED_LIST_ITEM &&
        block.bulleted_list_item?.rich_text
      ) {
        return (
          "• " + convertRichtextToPlainText(block.bulleted_list_item.rich_text)
        );
      }
      return "";
    })
    .filter((text: any) => text.trim() !== "")
    .join("\n");
}

function convertRichtextToPlainText(text: any) {
  return text.map((text: any) => text.plain_text).join("");
}
