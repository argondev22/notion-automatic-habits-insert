import { BlockObjectResponse } from "../lib/notionhq/type";

export interface Habit {
  name: string;
  time: string; // 後方互換性のため保持
  startTime?: string; // 開始時間（HH:MM形式）
  endTime?: string; // 終了時間（HH:MM形式）
  days: Array<Day>;
  profiles: Array<string>;
  tobes: Array<string>;
  content: BlockObjectResponse;
}

export enum Day {
  MONDAY,
  TUESDAY,
  WEDNESDAY,
  THURSDAY,
  FRIDAY,
  SATURDAY,
  SUNDAY,
}

export interface Todo {
  name: string;
  startTime: Date;
  endTime: Date;
  profiles: Array<string>;
  tobes: Array<string>;
  content: BlockObjectResponse;
}
