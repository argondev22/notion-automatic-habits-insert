import { BlockObjectResponse } from '../lib/notionhq/type';

export interface Habit {
  id?: string; // NotionページID（取得時に設定される）
  name: string;
  startTime: string; // HH:MM形式
  endTime?: string; // HH:MM形式
  days: Array<Day>;
  profiles: Array<string>;
  tobes: Array<string>;
  todos: Array<string>;
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
  id?: string; // NotionページID（取得時に設定される）
  name: string;
  startTime: Date;
  endTime: Date;
  profiles: Array<string>;
  tobes: Array<string>;
  content: BlockObjectResponse;
}
