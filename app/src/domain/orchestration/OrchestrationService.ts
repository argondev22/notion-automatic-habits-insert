import { ILogger } from '../../shared/logger/Logger';
import { fetchHabits } from '../fetch/fetch';
import { convertHabitsToTodos } from '../convert/convert';
import { insertTodosWithHabitMatching } from '../insert/insert';
import { AppError, ERROR_CODES } from '../../shared/errors/AppError';

/**
 * オーケストレーションサービス
 * 複数のドメイン機能を統合して、エンドツーエンドの処理を実行
 */
export interface OrchestrationResult {
  success: boolean;
  habitCount?: number;
  todoCount?: number;
  linkedCount?: number;
  error?: string;
  executionTime: number;
}

/**
 * OrchestrationServiceエラー
 */
export class OrchestrationError extends AppError {
  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message, code, details);
    this.name = 'OrchestrationError';
  }
}

/**
 * OrchestrationService
 * 全体の処理フローを管理
 */
export class OrchestrationService {
  constructor(private logger: ILogger) {}

  /**
   * 習慣データを取得してTodoに変換し、挿入する
   * メインの処理フロー
   */
  async executeHabitToTodoFlow(): Promise<OrchestrationResult> {
    const startTime = Date.now();

    try {
      this.logger.info('習慣→Todo変換フロー開始');

      // 1. DB_HABITSのデータを取得
      const habitsResult = await fetchHabits();
      if (!habitsResult.success || !habitsResult.data) {
        const error = '習慣データの取得に失敗しました';
        this.logger.error(error, undefined, {
          error: habitsResult.error,
        });
        throw new OrchestrationError(
          error,
          ERROR_CODES.FETCH_ERROR,
          { originalError: habitsResult.error }
        );
      }

      this.logger.info('習慣データ取得完了', {
        habitCount: habitsResult.data.length
      });

      // 2. HabitモデルをTodoモデルに変換
      this.logger.info('変換開始', { habitCount: habitsResult.data.length });
      const todosResult = await convertHabitsToTodos(habitsResult.data);

      if (!todosResult.success || !todosResult.data) {
        const error = '変換に失敗しました';
        this.logger.error(error, undefined, {
          error: todosResult.error,
        });
        throw new OrchestrationError(
          error,
          ERROR_CODES.CONVERSION_ERROR,
          { originalError: todosResult.error }
        );
      }

      this.logger.info('変換完了', {
        success: todosResult.success,
        todoCount: todosResult.data?.length || 0,
      });

      if (todosResult.data.length === 0) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          '変換されたTodoが0個です。今日実行すべきHabitがない可能性があります'
        );
        return {
          success: true,
          habitCount: habitsResult.data.length,
          todoCount: 0,
          linkedCount: 0,
          executionTime,
        };
      }

      // 3. TodoをHabitにマッチングして挿入
      const insertResult = await insertTodosWithHabitMatching(
        todosResult.data,
        habitsResult.data
      );

      if (!insertResult.success || !insertResult.data) {
        const error = 'Todoの挿入に失敗しました';
        this.logger.error(error, undefined, {
          error: insertResult.error,
        });
        throw new OrchestrationError(
          error,
          ERROR_CODES.INSERT_ERROR,
          { originalError: insertResult.error }
        );
      }

      const executionTime = Date.now() - startTime;
      this.logger.info('すべての処理が完了しました', {
        habitCount: habitsResult.data.length,
        todoCount: insertResult.data.insertedTodos.length,
        linkedCount: insertResult.data.linkedCount,
        executionTime: `${executionTime}ms`,
      });

      return {
        success: true,
        habitCount: habitsResult.data.length,
        todoCount: insertResult.data.insertedTodos.length,
        linkedCount: insertResult.data.linkedCount,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof OrchestrationError) {
        return {
          success: false,
          error: error.message,
          executionTime,
        };
      }

      this.logger.error('予期しないエラーが発生しました', error as Error, {
        executionTime: `${executionTime}ms`,
      });

      return {
        success: false,
        error: `予期しないエラーが発生しました: ${error}`,
        executionTime,
      };
    }
  }
}

