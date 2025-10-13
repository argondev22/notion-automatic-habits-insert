import { Habit, Day } from '../../model';
import {
  PageResponse,
  isHabitPageObjectResponse,
  isPartialHabitPageObjectResponse,
  BlockObjectResponse,
} from '../../../lib/notionhq/type';
import { AppError, ERROR_CODES } from '../../../shared/errors/AppError';
import { ILogger } from '../../../shared/logger/Logger';
import { ValidatorFactory } from '../../../shared/validation/Validator';

/**
 * NotionページをHabitモデルに変換するマッパークラス
 */
export class HabitMapper {
  private logger: ILogger;

  // 曜日マッピング定数（パフォーマンス最適化）
  private static readonly DAY_MAP: Record<string, Day> = {
    MON: Day.MONDAY,
    TUE: Day.TUESDAY,
    WED: Day.WEDNESDAY,
    THU: Day.THURSDAY,
    FRI: Day.FRIDAY,
    SAT: Day.SATURDAY,
    SUN: Day.SUNDAY,
  };

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  /**
   * ページレスポンスをHabitモデルに変換
   */
  async mapToHabit(
    page: PageResponse,
    content: BlockObjectResponse
  ): Promise<Habit> {
    try {
      this.logger.debug(`ページ ${page.id} をHabitモデルに変換中`);

      const habit = this.createHabitModel(page, content);

      // バリデーション
      ValidatorFactory.validateHabit(habit);

      this.logger.debug(`ページ ${page.id} の変換が完了しました`);
      return habit;
    } catch (error) {
      this.logger.error(`ページ ${page.id} の変換エラー`, error as Error, {
        pageId: page.id,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `ページ ${page.id} の変換に失敗しました: ${error}`,
        ERROR_CODES.PROPERTY_MAPPING_FAILED,
        { pageId: page.id, originalError: error }
      );
    }
  }

  /**
   * 複数のページレスポンスをHabitモデルの配列に変換
   */
  async mapToHabits(
    pages: PageResponse[],
    contents: BlockObjectResponse[]
  ): Promise<Habit[]> {
    if (pages.length !== contents.length) {
      throw new AppError(
        'ページ数とコンテンツ数が一致しません',
        ERROR_CODES.PROPERTY_MAPPING_FAILED,
        { pageCount: pages.length, contentCount: contents.length }
      );
    }

    this.logger.info(`${pages.length}個のページをHabitモデルに変換中`);

    const results = await Promise.allSettled(
      pages.map((page, index) => this.mapToHabit(page, contents[index]))
    );

    // 成功した結果のみを返す
    const successfulHabits: Habit[] = [];
    const errors: Error[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulHabits.push(result.value);
      } else {
        errors.push(result.reason);
        this.logger.error(
          `ページ ${pages[index].id} の変換に失敗`,
          result.reason
        );
      }
    });

    if (errors.length > 0) {
      this.logger.warn(`${errors.length}個のページの変換に失敗しました`);
    }

    this.logger.info(
      `${successfulHabits.length}個のHabitモデルが正常に変換されました`
    );
    return successfulHabits;
  }

  /**
   * ページレスポンスからHabitモデルを作成
   */
  private createHabitModel(
    page: PageResponse,
    content: BlockObjectResponse
  ): Habit {
    // 型ガードを使用して型安全にプロパティにアクセス
    if (isHabitPageObjectResponse(page)) {
      const timeText = this.extractRichText(page.properties.TIME.rich_text);
      const timeRange = this.parseTimeRange(timeText);

      return {
        name: this.extractTitle(page.properties.NAME.title),
        startTime: timeRange.startTime,
        endTime: timeRange.endTime || undefined,
        days: page.properties.DAY.multi_select.map(day =>
          this.convertStringToDay(day.name)
        ),
        profiles: page.properties.PROFILE.relation.map(rel => rel.id),
        tobes: page.properties.TOBE.relation.map(rel => rel.id),
        content: content,
      };
    } else if (isPartialHabitPageObjectResponse(page) && page.properties) {
      const timeText = this.extractRichText(page.properties.TIME?.rich_text);
      const timeRange = this.parseTimeRange(timeText);

      return {
        name: this.extractTitle(page.properties.NAME?.title),
        startTime: timeRange.startTime,
        endTime: timeRange.endTime || undefined,
        days:
          page.properties.DAY?.multi_select?.map(day =>
            this.convertStringToDay(day.name)
          ) || [],
        profiles: page.properties.PROFILE?.relation?.map(rel => rel.id) || [],
        tobes: page.properties.TOBE?.relation?.map(rel => rel.id) || [],
        content: content,
      };
    } else {
      throw new AppError(
        `ページ ${page.id} のプロパティが期待される形式ではありません`,
        ERROR_CODES.PROPERTY_MAPPING_FAILED,
        { pageId: page.id, pageObject: page.object }
      );
    }
  }

  /**
   * タイトル配列からテキストを抽出
   */
  private extractTitle(
    titleArray: Array<{ plain_text: string }> | undefined
  ): string {
    if (!titleArray || titleArray.length === 0) {
      return '';
    }
    return titleArray[0]?.plain_text || '';
  }

  /**
   * リッチテキスト配列からテキストを抽出
   */
  private extractRichText(
    richTextArray: Array<{ plain_text: string }> | undefined
  ): string {
    if (!richTextArray || richTextArray.length === 0) {
      this.logger.debug('時間プロパティが空または存在しません');
      return '';
    }
    const text = richTextArray[0]?.plain_text || '';
    this.logger.debug(`抽出された時間テキスト: "${text}"`);

    if (!text || text.trim().length === 0) {
      this.logger.warn('時間テキストが空です');
      return '';
    }

    // 時間範囲の場合はそのまま返す（parseTimeRangeで処理される）
    if (text.includes('-')) {
      return text;
    }

    return this.normalizeTimeFormat(text);
  }

  /**
   * 時間形式を正規化（HH:MM形式に変換）
   */
  private normalizeTimeFormat(time: string): string {
    if (!time || time.trim().length === 0) {
      return '';
    }

    // 既にHH:MM形式の場合はそのまま返す
    if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      return time;
    }

    // 様々な時間形式をサポート
    const timePatterns = [
      // HH:MM:SS形式
      /^(\d{1,2}):(\d{2}):(\d{2})$/,
      // HH.MM形式
      /^(\d{1,2})\.(\d{2})$/,
      // HHMM形式（4桁）
      /^(\d{2})(\d{2})$/,
      // HMM形式（3桁）
      /^(\d{1})(\d{2})$/,
      // 12時間形式（AM/PM）
      /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
    ];

    for (const pattern of timePatterns) {
      const match = time.match(pattern);
      if (match) {
        if (pattern === timePatterns[0]) {
          // HH:MM:SS形式
          return `${match[1].padStart(2, '0')}:${match[2]}`;
        } else if (pattern === timePatterns[1]) {
          // HH.MM形式
          return `${match[1].padStart(2, '0')}:${match[2]}`;
        } else if (pattern === timePatterns[2]) {
          // HHMM形式
          return `${match[1]}:${match[2]}`;
        } else if (pattern === timePatterns[3]) {
          // HMM形式
          return `0${match[1]}:${match[2]}`;
        } else if (pattern === timePatterns[4]) {
          // 12時間形式
          let hour = parseInt(match[1]);
          const minute = match[2];
          const ampm = match[3].toUpperCase();

          if (ampm === 'PM' && hour !== 12) {
            hour += 12;
          } else if (ampm === 'AM' && hour === 12) {
            hour = 0;
          }

          return `${hour.toString().padStart(2, '0')}:${minute}`;
        }
      }
    }

    this.logger.warn(`認識できない時間形式: "${time}"`);
    return time; // 変換できない場合は元の値を返す
  }

  /**
   * 時間範囲を解析して開始時間と終了時間を返す
   */
  private parseTimeRange(time: string): {
    startTime: string;
    endTime: string | null;
  } {
    if (!time || time.trim().length === 0) {
      return { startTime: '', endTime: null };
    }

    // 時間範囲（例：20:00-21:45）の場合は開始時間と終了時間を分離
    const timeRangePattern = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/;
    const timeRangeMatch = time.match(timeRangePattern);
    if (timeRangeMatch) {
      const startHour = timeRangeMatch[1].padStart(2, '0');
      const startMinute = timeRangeMatch[2];
      const endHour = timeRangeMatch[3].padStart(2, '0');
      const endMinute = timeRangeMatch[4];

      const startTime = `${startHour}:${startMinute}`;
      const endTime = `${endHour}:${endMinute}`;

      this.logger.debug(
        `時間範囲を検出: "${time}" -> 開始時間: ${startTime}, 終了時間: ${endTime}`
      );
      return { startTime, endTime };
    }

    // 単一時間の場合は開始時間として扱う
    const normalizedTime = this.normalizeTimeFormat(time);
    return { startTime: normalizedTime, endTime: null };
  }

  /**
   * 文字列をDay型に変換
   */
  private convertStringToDay(dayString: string): Day {
    const day = HabitMapper.DAY_MAP[dayString.toUpperCase()];
    if (day === undefined) {
      throw new AppError(
        `無効な曜日: ${dayString}`,
        ERROR_CODES.VALIDATION_FAILED,
        { dayString, validDays: Object.keys(HabitMapper.DAY_MAP) }
      );
    }

    return day;
  }
}
