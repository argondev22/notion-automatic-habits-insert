import { BlockObjectResponse } from "../lib/notionhq/type";

export interface Habit {
  name: string;
  time: string;
  days: Array<Day>;
  profile: Array<Profile>;
  content: BlockObjectResponse;
}

export interface Todo {
  name: string;
  startTime: Date;
  endTime: Date;
  profile: Array<Profile>;
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

export enum Profile {
  ENGINEER,
  WORK,
  PRIVATE,
}
