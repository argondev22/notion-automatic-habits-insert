interface Habit {
  name: string
  startTime: string
  endTime: string
  days: Array<Day>
}

enum Day {
  MONDAY,
  TUESDAY,
  WEDNESDAY,
  THURSDAY,
  FRIDAY,
  SATURDAY,
  SUNDAY
}
