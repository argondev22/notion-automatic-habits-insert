import {
  QueryDatabaseResponse,
  ListBlockChildrenResponse,
  PageObjectResponse,
  PartialPageObjectResponse,
  PartialDatabaseObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

// 基本的な型定義
export type DatabaseResponse = QueryDatabaseResponse["results"];
export type BlockObjectResponse = ListBlockChildrenResponse["results"];
export type PageResponse = PageObjectResponse | PartialPageObjectResponse | PartialDatabaseObjectResponse;

// プロパティの型定義
export interface HabitProperties {
  NAME: {
    title: Array<{
      plain_text: string;
    }>;
  };
  TIME: {
    rich_text: Array<{
      plain_text: string;
    }>;
  };
  DAY: {
    multi_select: Array<{
      name: string;
    }>;
  };
  PROFILE: {
    relation: Array<{
      id: string;
    }>;
  };
  TOBE: {
    relation: Array<{
      id: string;
    }>;
  };
}

// 型安全なHabitページの型
export interface HabitPageObjectResponse extends Omit<PageObjectResponse, 'properties'> {
  properties: HabitProperties;
}

// 型安全なHabitページの部分型
export interface PartialHabitPageObjectResponse extends Omit<PartialPageObjectResponse, 'properties'> {
  properties?: Partial<HabitProperties>;
}

// 型ガード関数
export function isHabitPageObjectResponse(
  page: PageResponse
): page is HabitPageObjectResponse {
  return (
    page.object === "page" &&
    "properties" in page &&
    page.properties !== null &&
    typeof page.properties === "object" &&
    "NAME" in page.properties &&
    "TIME" in page.properties &&
    "DAY" in page.properties &&
    "PROFILE" in page.properties &&
    "TOBE" in page.properties
  );
}

export function isPartialHabitPageObjectResponse(
  page: PageResponse
): page is PartialHabitPageObjectResponse {
  return (
    page.object === "page" &&
    "properties" in page &&
    page.properties !== null &&
    typeof page.properties === "object"
  );
}
