import { Habit, Todo, Day } from '../../model';
import { ILogger } from '../../../shared/logger/Logger';
import { ICache } from '../../../shared/cache/Cache';
import { RetryManager } from '../../../shared/retry/RetryManager';
import { ConvertMapper } from '../mappers/ConvertMapper';

/**
 * ConvertService - サービス層
 * HabitからTodoへの変換ビジネスロジックを管理
 */
export class ConvertService {
  constructor(
    private mapper: ConvertMapper,
    private logger: ILogger,
    private cache: ICache<Date>,
    private retryManager: RetryManager
  ) {}

  /**
   * Habit配列をTodo配列に変換する
   * @param habits - 変換対象のHabit配列
   * @returns 変換されたTodo配列
   */
  async convertHabitsToTodos(habits: Habit[]): Promise<Todo[]> {
    this.logger.info('ConvertService: Habit配列の変換処理開始', {
      habitCount: habits.length,
    });
    this.logger.debug('ConvertService: Habit配列の詳細', {
      habits: habits.map(h => ({
        name: h.name,
        days: h.days,
        daysLength: h.days.length,
      })),
    });

    const todos: Todo[] = [];

    for (const habit of habits) {
      try {
        this.logger.info('ConvertService: Habitを変換中', {
          habitName: habit.name,
          days: habit.days,
        });

        const habitTodos = await this.convertHabitToTodos(habit);

        this.logger.info('ConvertService: Habit変換完了', {
          habitName: habit.name,
          generatedTodoCount: habitTodos.length,
        });

        todos.push(...habitTodos);
      } catch (error) {
        this.logger.error(
          'ConvertService: 単一Habitの変換に失敗',
          error instanceof Error ? error : new Error('Unknown error'),
          {
            habitName: habit.name,
          }
        );
        // 個別のHabit変換失敗は全体の処理を止めない
        continue;
      }
    }

    this.logger.info('ConvertService: Habit配列の変換処理完了', {
      totalTodoCount: todos.length,
    });

    return todos;
  }

  /**
   * 単一のHabitをTodo配列に変換する
   * @param habit - 変換対象のHabit
   * @returns 変換されたTodo配列
   */
  async convertHabitToTodos(habit: Habit): Promise<Todo[]> {
    this.logger.info('ConvertService: 単一Habitの変換処理開始', {
      habitName: habit.name,
      days: habit.days,
      daysLength: habit.days.length,
    });

    const todos: Todo[] = [];

    try {
      // 現在の週の日付を取得（キャッシュ付き）
      const weekDates = await this.getCurrentWeekDates();

      this.logger.info('ConvertService: 週の日付を取得', {
        habitName: habit.name,
        weekDates: Object.entries(weekDates).map(([key, value]) => ({
          day: key,
          date: value.toISOString(),
        })),
      });

      for (const day of habit.days) {
        this.logger.info('ConvertService: 曜日を処理中', {
          habitName: habit.name,
          day,
          dayValue: Day[day],
        });

        const targetDate = weekDates[day as Day];
        if (!targetDate) {
          this.logger.warn('ConvertService: 対象日付が見つかりません', {
            day,
            dayValue: Day[day],
            habitName: habit.name,
          });
          continue;
        }

        const todo = await this.createTodoFromHabit(habit, targetDate);
        todos.push(todo);
      }

      this.logger.info('ConvertService: 単一Habitの変換処理完了', {
        habitName: habit.name,
        todoCount: todos.length,
      });

      return todos;
    } catch (error) {
      this.logger.error(
        'ConvertService: 単一Habitの変換に失敗',
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
  private async createTodoFromHabit(
    habit: Habit,
    targetDate: Date
  ): Promise<Todo> {
    try {
      this.logger.info('ConvertService: Habit時間データ確認', {
        habitName: habit.name,
        startTime: habit.startTime,
        endTime: habit.endTime,
        targetDate: targetDate.toISOString(),
      });

      const startDateTime = this.createDateTime(targetDate, habit.startTime);
      const endDateTime = habit.endTime
        ? this.createEndDateTime(startDateTime, habit.endTime, targetDate)
        : new Date(startDateTime.getTime() + 60 * 60 * 1000); // デフォルト1時間

      this.logger.info('ConvertService: 時間比較確認', {
        habitName: habit.name,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        startTimeMs: startDateTime.getTime(),
        endTimeMs: endDateTime.getTime(),
        isStartBeforeEnd: startDateTime < endDateTime,
      });

      const todo: Todo = {
        name: habit.name,
        startTime: startDateTime,
        endTime: endDateTime,
        profiles: [...habit.profiles],
        tobes: [...habit.tobes],
        content: habit.content,
      };

      this.logger.debug('ConvertService: Todo作成完了', {
        habitName: habit.name,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
      });

      return todo;
    } catch (error) {
      this.logger.error(
        'ConvertService: Todo作成に失敗',
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
   * 現在の週の日付を取得する（キャッシュ付き）
   * @returns Day enumをキーとした日付マップ
   */
  private async getCurrentWeekDates(): Promise<Record<Day, Date>> {
    // 日付を含めてキャッシュキーを生成（来週の月曜日を基準）
    const today = new Date();
    const dayOfWeek = today.getDay();
    const nextWeekMonday = new Date(today);
    nextWeekMonday.setDate(today.getDate() - dayOfWeek + 1 + 7);
    const dateKey = nextWeekMonday.toISOString().split('T')[0]; // YYYY-MM-DD形式
    const cacheKey = `currentWeekDates:${dateKey}`;

    try {
      // キャッシュから取得を試行
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('ConvertService: キャッシュから週の日付を取得');
        return this.reconstructWeekDates(cached);
      }

      // リトライ機能付きで週の日付を計算
      const weekDates = await this.retryManager.executeWithRetry(async () => {
        return this.calculateCurrentWeekDates();
      }, '週の日付計算');

      // 月曜日の日付をキャッシュに保存
      this.cache.set(cacheKey, weekDates[Day.MONDAY]);

      this.logger.debug('ConvertService: 週の日付を計算してキャッシュに保存');
      return weekDates;
    } catch (error) {
      this.logger.error(
        'ConvertService: 週の日付取得に失敗',
        error instanceof Error ? error : new Error('Unknown error')
      );
      throw error;
    }
  }

  /**
   * 来週の日付を計算する
   * 曜日に関係なく常に来週の日付を返す
   * @returns Day enumをキーとした日付マップ
   */
  private calculateCurrentWeekDates(): Record<Day, Date> {
    const today = new Date();
    const dayOfWeek = today.getDay();

    // 常に来週の月曜日を基準とする
    const nextWeekMonday = new Date(today);
    nextWeekMonday.setDate(today.getDate() - dayOfWeek + 1 + 7); // 来週の月曜日

    this.logger.debug('ConvertService: 来週の日付計算', {
      today: today.toISOString(),
      dayOfWeek,
      nextWeekMonday: nextWeekMonday.toISOString(),
    });

    return {
      [Day.MONDAY]: new Date(nextWeekMonday),
      [Day.TUESDAY]: new Date(nextWeekMonday.getTime() + 24 * 60 * 60 * 1000),
      [Day.WEDNESDAY]: new Date(
        nextWeekMonday.getTime() + 2 * 24 * 60 * 60 * 1000
      ),
      [Day.THURSDAY]: new Date(
        nextWeekMonday.getTime() + 3 * 24 * 60 * 60 * 1000
      ),
      [Day.FRIDAY]: new Date(
        nextWeekMonday.getTime() + 4 * 24 * 60 * 60 * 1000
      ),
      [Day.SATURDAY]: new Date(
        nextWeekMonday.getTime() + 5 * 24 * 60 * 60 * 1000
      ),
      [Day.SUNDAY]: new Date(
        nextWeekMonday.getTime() + 6 * 24 * 60 * 60 * 1000
      ),
    };
  }

  /**
   * キャッシュされた月曜日の日付から週の日付を再構築する
   * @param mondayDate - キャッシュされた月曜日の日付
   * @returns Day enumをキーとした日付マップ
   */
  private reconstructWeekDates(mondayDate: Date): Record<Day, Date> {
    const monday = new Date(mondayDate);
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
        'ConvertService: 日時作成に失敗',
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
   * 日をまたぐ時間範囲を考慮して終了時間を作成する
   * @param startDateTime - 開始時間
   * @param endTimeString - 終了時間文字列（HH:MM形式）
   * @param targetDate - 対象日付
   * @returns 作成された終了時間Dateオブジェクト
   */
  private createEndDateTime(
    startDateTime: Date,
    endTimeString: string,
    targetDate: Date
  ): Date {
    try {
      const [hours, minutes] = endTimeString.split(':').map(Number);

      if (isNaN(hours) || isNaN(minutes)) {
        throw new Error(`無効な時間形式: ${endTimeString}`);
      }

      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error(`時間が範囲外: ${endTimeString}`);
      }

      // 終了時間の日付を決定
      let endDate = new Date(targetDate);
      endDate.setHours(hours, minutes, 0, 0);

      // 終了時間が開始時間より前の場合（日をまたぐ場合）、翌日に設定
      if (endDate <= startDateTime) {
        endDate.setDate(endDate.getDate() + 1);
        this.logger.info('ConvertService: 日をまたぐ時間範囲を検出', {
          startTime: startDateTime.toISOString(),
          endTime: endDate.toISOString(),
        });
      }

      return endDate;
    } catch (error) {
      this.logger.error(
        'ConvertService: 終了時間作成に失敗',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          startDateTime: startDateTime.toISOString(),
          endTimeString,
          targetDate: targetDate.toISOString(),
        }
      );
      throw error;
    }
  }
}
