import { Habit, Day, Todo } from '../../domain/model';
import { AppError, ERROR_CODES } from '../errors/AppError';
import { ConsoleLogger } from '../logger/Logger';

/**
 * バリデーション結果の型定義
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * バリデーターインターフェース
 */
export interface IValidator<T> {
  validate(data: T): ValidationResult;
}

/**
 * Habitバリデーター
 */
export class HabitValidator implements IValidator<Habit> {
  private logger = new ConsoleLogger();

  validate(habit: Habit): ValidationResult {
    const errors: string[] = [];

    // 名前のバリデーション
    if (!habit.name || habit.name.trim().length === 0) {
      errors.push('名前は必須です');
    } else if (habit.name.length > 100) {
      errors.push('名前は100文字以内である必要があります');
    }

    // 開始時間のバリデーション（必須）
    if (habit.startTime.trim().length === 0) {
      errors.push('開始時間は必須です');
    } else if (!this.isValidTimeFormat(habit.startTime)) {
      errors.push('開始時間はHH:MM形式である必要があります');
    }

    // 終了時間のバリデーション
    if (habit.endTime !== undefined) {
      if (!habit.endTime || habit.endTime.trim().length === 0) {
        errors.push('終了時間は空でない文字列である必要があります');
      } else if (!this.isValidTimeFormat(habit.endTime)) {
        errors.push('終了時間はHH:MM形式である必要があります');
      }
    }

    // 開始時間と終了時間の整合性チェック
    if (habit.startTime && habit.endTime) {
      // 日をまたぐ時間範囲（例：22:00-6:00）の場合は特別処理
      const startHour = parseInt(habit.startTime.split(':')[0]);
      const endHour = parseInt(habit.endTime.split(':')[0]);

      // 日をまたぐ場合（開始時間が終了時間より大きい場合）は有効
      if (startHour > endHour) {
        // 日をまたぐ時間範囲は有効
        this.logger.debug(
          `日をまたぐ時間範囲を検出: ${habit.startTime} - ${habit.endTime}`
        );
      } else if (habit.startTime >= habit.endTime) {
        errors.push('開始時間は終了時間より早い必要があります');
      }
    }

    // 曜日のバリデーション
    if (!Array.isArray(habit.days)) {
      errors.push('曜日は配列である必要があります');
    } else if (habit.days.length === 0) {
      errors.push('少なくとも1つの曜日を選択してください');
    } else if (
      !habit.days.every((day: Day) => Object.values(Day).includes(day))
    ) {
      errors.push('無効な曜日が含まれています');
    }

    // プロファイルのバリデーション
    if (!Array.isArray(habit.profiles)) {
      errors.push('プロファイルは配列である必要があります');
    } else if (
      habit.profiles.some(
        (profile: string) =>
          typeof profile !== 'string' || profile.trim().length === 0
      )
    ) {
      errors.push('プロファイルIDは空でない文字列である必要があります');
    }

    // TOBEのバリデーション
    if (!Array.isArray(habit.tobes)) {
      errors.push('TOBEは配列である必要があります');
    } else if (
      habit.tobes.some(
        (tobe: string) => typeof tobe !== 'string' || tobe.trim().length === 0
      )
    ) {
      errors.push('TOBE IDは空でない文字列である必要があります');
    }

    // コンテンツのバリデーション
    if (!habit.content) {
      errors.push('コンテンツは必須です');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 時間形式のバリデーション（HH:MM）
   */
  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }
}

/**
 * Todoバリデーター
 */
export class TodoValidator implements IValidator<Todo> {
  private logger = new ConsoleLogger();

  validate(todo: Todo): ValidationResult {
    const errors: string[] = [];

    // 名前のバリデーション
    if (!todo.name || todo.name.trim().length === 0) {
      errors.push('Todo名は必須です');
    } else if (todo.name.length > 100) {
      errors.push('Todo名は100文字以内である必要があります');
    }

    // 開始時間のバリデーション
    if (!todo.startTime || !(todo.startTime instanceof Date)) {
      errors.push('開始時間は有効なDateオブジェクトである必要があります');
    }

    // 終了時間のバリデーション
    if (!todo.endTime || !(todo.endTime instanceof Date)) {
      errors.push('終了時間は有効なDateオブジェクトである必要があります');
    }

    // 開始時間と終了時間の整合性チェック
    if (todo.startTime && todo.endTime && todo.startTime >= todo.endTime) {
      errors.push('開始時間は終了時間より早い必要があります');
    }

    // プロファイルのバリデーション
    if (!Array.isArray(todo.profiles)) {
      errors.push('プロファイルは配列である必要があります');
    } else if (
      todo.profiles.some(
        (profile: string) =>
          typeof profile !== 'string' || profile.trim().length === 0
      )
    ) {
      errors.push('プロファイルIDは空でない文字列である必要があります');
    }

    // TOBEのバリデーション
    if (!Array.isArray(todo.tobes)) {
      errors.push('TOBEは配列である必要があります');
    } else if (
      todo.tobes.some(
        (tobe: string) => typeof tobe !== 'string' || tobe.trim().length === 0
      )
    ) {
      errors.push('TOBE IDは空でない文字列である必要があります');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * データベースIDバリデーター
 */
export class DatabaseIdValidator implements IValidator<string> {
  validate(databaseId: string): ValidationResult {
    const errors: string[] = [];

    if (!databaseId || databaseId.trim().length === 0) {
      errors.push('データベースIDは必須です');
    } else if (!this.isValidNotionId(databaseId)) {
      errors.push('データベースIDは有効なNotion IDである必要があります');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Notion ID形式のバリデーション
   */
  private isValidNotionId(id: string): boolean {
    // Notion IDは32文字の英数字（ハイフンなし）または36文字のUUID形式
    const notionIdRegex =
      /^[a-zA-Z0-9]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return notionIdRegex.test(id);
  }
}

/**
 * バリデーションファクトリー
 */
export class ValidatorFactory {
  private static habitValidator = new HabitValidator();
  private static todoValidator = new TodoValidator();
  private static databaseIdValidator = new DatabaseIdValidator();

  static getHabitValidator(): IValidator<Habit> {
    return this.habitValidator;
  }

  static getTodoValidator(): IValidator<Todo> {
    return this.todoValidator;
  }

  static getDatabaseIdValidator(): IValidator<string> {
    return this.databaseIdValidator;
  }

  /**
   * Habitデータをバリデーションし、エラーがある場合はAppErrorを投げる
   */
  static validateHabit(habit: Habit): void {
    const result = this.habitValidator.validate(habit);
    if (!result.isValid) {
      throw new AppError(
        `Habitデータのバリデーションに失敗しました: ${result.errors.join(', ')}`,
        ERROR_CODES.VALIDATION_FAILED,
        { habit, errors: result.errors }
      );
    }
  }

  /**
   * Todoデータをバリデーションし、エラーがある場合はAppErrorを投げる
   */
  static validateTodo(todo: Todo): void {
    const result = this.todoValidator.validate(todo);
    if (!result.isValid) {
      throw new AppError(
        `Todoデータのバリデーションに失敗しました: ${result.errors.join(', ')}`,
        ERROR_CODES.VALIDATION_FAILED,
        { todo, errors: result.errors }
      );
    }
  }

  /**
   * データベースIDをバリデーションし、エラーがある場合はAppErrorを投げる
   */
  static validateDatabaseId(databaseId: string): void {
    const result = this.databaseIdValidator.validate(databaseId);
    if (!result.isValid) {
      throw new AppError(
        `データベースIDのバリデーションに失敗しました: ${result.errors.join(', ')}`,
        ERROR_CODES.INVALID_DATABASE_ID,
        { databaseId, errors: result.errors }
      );
    }
  }
}
