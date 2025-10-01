import { BlockObjectResponse } from "../lib/notionhq/type";

export interface Habit {
  name: string;
  time: string;
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
