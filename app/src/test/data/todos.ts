import { Profile, Todo } from "../../domain/model";

const now = new Date();

function createDate(hour: number, minute: number): Date {
  const tomorrow = now.getDate() + 1;
  return new Date(now.getFullYear(), now.getMonth(), tomorrow, hour, minute, 0);
}

export const todos: Todo[] = [
  {
    name: "朝ごはん/ケア",
    startTime: createDate(8, 15),
    endTime: createDate(9, 0),
    profiles: [Profile.PRIVATE],
    content: [],
  },
  {
    name: "ランニング",
    startTime: createDate(19, 0),
    endTime: createDate(19, 30),
    profiles: [Profile.PRIVATE],
    content: [],
  },
];
