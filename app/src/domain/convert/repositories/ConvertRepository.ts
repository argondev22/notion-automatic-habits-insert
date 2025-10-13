import { Habit, Todo } from '../../model';
import { ILogger } from '../../../shared/logger/Logger';
import { ICache } from '../../../shared/cache/Cache';
import { ConvertService } from '../services/ConvertService';
import { ConvertMapper } from '../mappers/ConvertMapper';

/**
 * ConvertRepository - データアクセス層
 * HabitからTodoへの変換処理を管理
 */
export class ConvertRepository {
  constructor(
    private service: ConvertService,
    private mapper: ConvertMapper,
    private logger: ILogger,
    private cache: ICache<Todo[]>
  ) {}

  /**
   * Habit配列をTodo配列に変換する
   * @param habits - 変換対象のHabit配列
   * @returns 変換されたTodo配列
   */
  async convertHabitsToTodos(habits: Habit[]): Promise<Todo[]> {
    const cacheKey = `convert:${this.generateCacheKey(habits)}`;

    try {
      // キャッシュから取得を試行
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.logger.info('ConvertRepository: キャッシュからTodo配列を取得', {
          cacheKey,
        });
        return cached;
      }

      this.logger.info('ConvertRepository: Habit配列をTodo配列に変換開始', {
        habitCount: habits.length,
      });

      // サービス層で変換処理を実行
      const todos = await this.service.convertHabitsToTodos(habits);

      // キャッシュに保存
      this.cache.set(cacheKey, todos);

      this.logger.info('ConvertRepository: Habit配列の変換完了', {
        todoCount: todos.length,
      });

      return todos;
    } catch (error) {
      this.logger.error(
        'ConvertRepository: Habit配列の変換に失敗',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          habitCount: habits.length,
        }
      );
      throw error;
    }
  }

  /**
   * 単一のHabitをTodo配列に変換する
   * @param habit - 変換対象のHabit
   * @returns 変換されたTodo配列
   */
  async convertHabitToTodos(habit: Habit): Promise<Todo[]> {
    const cacheKey = `convert:single:${this.generateHabitCacheKey(habit)}`;

    try {
      // キャッシュから取得を試行
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.logger.info(
          'ConvertRepository: キャッシュから単一HabitのTodo配列を取得',
          { cacheKey }
        );
        return cached;
      }

      this.logger.info('ConvertRepository: 単一HabitをTodo配列に変換開始', {
        habitName: habit.name,
      });

      // サービス層で変換処理を実行
      const todos = await this.service.convertHabitToTodos(habit);

      // キャッシュに保存
      this.cache.set(cacheKey, todos);

      this.logger.info('ConvertRepository: 単一Habitの変換完了', {
        habitName: habit.name,
        todoCount: todos.length,
      });

      return todos;
    } catch (error) {
      this.logger.error(
        'ConvertRepository: 単一Habitの変換に失敗',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          habitName: habit.name,
        }
      );
      throw error;
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('ConvertRepository: キャッシュをクリアしました');
  }

  /**
   * キャッシュ統計を取得
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Habit配列のキャッシュキーを生成
   */
  private generateCacheKey(habits: Habit[]): string {
    const habitNames = habits
      .map(h => h.name)
      .sort()
      .join(',');
    const habitCount = habits.length;
    return `${habitCount}:${habitNames}`;
  }

  /**
   * 単一Habitのキャッシュキーを生成
   */
  private generateHabitCacheKey(habit: Habit): string {
    const days = habit.days.sort().join(',');
    return `${habit.name}:${days}:${habit.startTime}`;
  }
}
