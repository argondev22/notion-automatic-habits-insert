import { Habit, Day, Profile } from "../../domain/model";

export const habits: Habit[] = [
  {
    name: "朝ごはん/ケア",
    time: "8:15-9:00",
    days: [Day.MONDAY],
    profile: [Profile.PRIVATE],
    content: [],
  },
  {
    name: "ランニング",
    time: "19:00-19:30",
    days: [Day.SATURDAY],
    profile: [Profile.PRIVATE],
    content: [],
  },
];
