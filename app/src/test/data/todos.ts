import { Profile, Todo } from "../../domain/model";

const now = new Date();

export const todos: Todo[] = [
  {
    name: "朝ごはん/ケア",
    startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 15, 0),
    endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
    profile: [Profile.PRIVATE],
    content: [],
  },
  {
    name: "ランニング",
    startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 0, 0),
    endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 30, 0),
    profile: [Profile.PRIVATE],
    content: [],
  },
];
