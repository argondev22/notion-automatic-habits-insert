import { Habit, Todo, Day } from '../../model';
import { ILogger } from '../../../shared/logger/Logger';
import { ValidatorFactory } from '../../../shared/validation/Validator';

/**
 * ConvertMapper - データ変換層
 * HabitからTodoへの型安全な変換を管理
 */
export class ConvertMapper {
  constructor(private logger: ILogger) {}

  /**
   * Habit配列をTodo配列に変換する
   * @param habits - 変換対象のHabit配列
   * @returns 変換されたTodo配列
   */
  async mapHabitsToTodos(habits: Habit[]): Promise<Todo[]> {
    this.logger.info('ConvertMapper: Habit配列のマッピング開始', {
      habitCount: habits.length,
    });

    const todos: Todo[] = [];

    for (const habit of habits) {
      try {
        // 個別のHabitをバリデーション
        ValidatorFactory.validateHabit(habit);

        const habitTodos = await this.mapHabitToTodos(habit);
        todos.push(...habitTodos);
      } catch (error) {
        this.logger.error(
          'ConvertMapper: 単一Habitのマッピングに失敗',
          error instanceof Error ? error : new Error('Unknown error'),
          {
            habitName: habit.name,
          }
        );
        // 個別のHabit変換失敗は全体の処理を止めない
        continue;
      }
    }

    this.logger.info('ConvertMapper: Habit配列のマッピング完了', {
      todoCount: todos.length,
    });

    return todos;
  }

  /**
   * 単一のHabitをTodo配列に変換する
   * @param habit - 変換対象のHabit
   * @returns 変換されたTodo配列
   */
  async mapHabitToTodos(habit: Habit): Promise<Todo[]> {
    this.logger.info('ConvertMapper: 単一Habitのマッピング開始', {
      habitName: habit.name,
    });

    try {
      // Habitのバリデーション
      ValidatorFactory.validateHabit(habit);

      const todos: Todo[] = [];
      const weekDates = this.getCurrentWeekDates();

      for (const day of habit.days) {
        const targetDate = weekDates[day];
        if (!targetDate) {
          this.logger.warn('ConvertMapper: 対象日付が見つかりません', {
            day,
            habitName: habit.name,
          });
          continue;
        }

        const todo = this.createTodoFromHabit(habit, targetDate);
        todos.push(todo);
      }

      this.logger.info('ConvertMapper: 単一Habitのマッピング完了', {
        habitName: habit.name,
        todoCount: todos.length,
      });

      return todos;
    } catch (error) {
      this.logger.error(
        'ConvertMapper: 単一Habitのマッピングに失敗',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          habitName: habit.name,
        }
      );
      throw error;
    }
  }

  /**
   * Habitと日付からTodoを作成する
   * @param habit - 元のHabit
   * @param targetDate - 対象日付
   * @returns 作成されたTodo
   */
  private createTodoFromHabit(habit: Habit, targetDate: Date): Todo {
    try {
      const startDateTime = this.createDateTime(targetDate, habit.startTime);
      const endDateTime = habit.endTime
        ? this.createDateTime(targetDate, habit.endTime)
        : new Date(startDateTime.getTime() + 60 * 60 * 1000); // デフォルト1時間

      const todo: Todo = {
        name: habit.name,
        startTime: startDateTime,
        endTime: endDateTime,
        profiles: [...habit.profiles],
        tobes: [...habit.tobes],
        content: habit.content,
      };

      // Todoのバリデーション
      this.validateTodo(todo);

      this.logger.debug('ConvertMapper: Todo作成完了', {
        habitName: habit.name,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
      });

      return todo;
    } catch (error) {
      this.logger.error(
        'ConvertMapper: Todo作成に失敗',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          habitName: habit.name,
          targetDate: targetDate.toISOString(),
        }
      );
      throw error;
    }
  }

  /**
   * 現在の週の日付を取得する
   * @returns Day enumをキーとした日付マップ
   */
  private getCurrentWeekDates(): Record<Day, Date> {
    const today = new Date();
    const dayOfWeek = today.getDay();

    // 月曜日を週の開始とする
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + 1);

    return {
      [Day.MONDAY]: new Date(monday),
      [Day.TUESDAY]: new Date(monday.getTime() + 24 * 60 * 60 * 1000),
      [Day.WEDNESDAY]: new Date(monday.getTime() + 2 * 24 * 60 * 60 * 1000),
      [Day.THURSDAY]: new Date(monday.getTime() + 3 * 24 * 60 * 60 * 1000),
      [Day.FRIDAY]: new Date(monday.getTime() + 4 * 24 * 60 * 60 * 1000),
      [Day.SATURDAY]: new Date(monday.getTime() + 5 * 24 * 60 * 60 * 1000),
      [Day.SUNDAY]: new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * 指定された日付と時間文字列からDateオブジェクトを作成する
   * @param date - 基準日付
   * @param timeString - HH:MM形式の時間文字列
   * @returns 作成されたDateオブジェクト
   */
  private createDateTime(date: Date, timeString: string): Date {
    try {
      const [hours, minutes] = timeString.split(':').map(Number);

      if (isNaN(hours) || isNaN(minutes)) {
        throw new Error(`無効な時間形式: ${timeString}`);
      }

      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error(`時間が範囲外: ${timeString}`);
      }

      const dateTime = new Date(date);
      dateTime.setHours(hours, minutes, 0, 0);

      return dateTime;
    } catch (error) {
      this.logger.error(
        'ConvertMapper: 日時作成に失敗',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          date: date.toISOString(),
          timeString,
        }
      );
      throw error;
    }
  }

  /**
   * Todoのバリデーション
   * @param todo - バリデーション対象のTodo
   */
  private validateTodo(todo: Todo): void {
    if (!todo.name || todo.name.trim() === '') {
      throw new Error('Todo名が空です');
    }

    if (!todo.startTime || !todo.endTime) {
      throw new Error('Todoの開始時間または終了時間が設定されていません');
    }

    if (todo.startTime >= todo.endTime) {
      throw new Error('Todoの開始時間が終了時間より後になっています');
    }

    if (!Array.isArray(todo.profiles)) {
      throw new Error('Todoのprofilesが配列ではありません');
    }

    if (!Array.isArray(todo.tobes)) {
      throw new Error('Todoのtobesが配列ではありません');
    }

    this.logger.debug('ConvertMapper: Todoバリデーション完了', {
      todoName: todo.name,
      startTime: todo.startTime.toISOString(),
      endTime: todo.endTime.toISOString(),
    });
  }
}
