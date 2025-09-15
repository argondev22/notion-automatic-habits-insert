import {
  QueryDatabaseResponse,
  ListBlockChildrenResponse,
} from "@notionhq/client/build/src/api-endpoints";

export type DatabaseObjectResponse = QueryDatabaseResponse["results"];
export type BlockObjectResponse = ListBlockChildrenResponse["results"];
