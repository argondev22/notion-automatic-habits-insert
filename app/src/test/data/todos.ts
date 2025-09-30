import { Profile, Todo } from "../../domain/model";

export const todos: Todo[] = [
  {
    name: "朝ごはん/ケア",
    startTime: "8:15",
    endTime: "9:00",
    profile: [Profile.PRIVATE],
    content: [],
  },
  {
    name: "ランニング",
    startTime: "19:00",
    endTime: "19:30",
    profile: [Profile.PRIVATE],
    content: [],
  },
];
