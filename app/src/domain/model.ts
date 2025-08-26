import { BlockObjectResponse } from "../lib/notionhq/type"

enum Day {
  MONDAY,
  TUESDAY,
  WEDNESDAY,
  THURSDAY,
  FRIDAY,
  SATURDAY,
  SUNDAY
}

enum Profile {
  ENGINEER,
  WORK,
  PRIVATE
}

export interface Habit {
  name: string
  time: string
  days: Array<Day>
  profile: Profile
  content: BlockObjectResponse
}

export interface Todo {
  name: string
  startTime: string
  endTime: string
  profile: Profile
  content: string
}
