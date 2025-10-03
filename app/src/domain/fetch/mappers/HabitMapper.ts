import { Habit, Day } from "../../model";
import {
  PageResponse,
  isHabitPageObjectResponse,
  isPartialHabitPageObjectResponse,
  BlockObjectResponse
} from "../../../lib/notionhq/type";
import { FetchError, ERROR_CODES } from "../core/errors/FetchError";
import { ILogger } from "../core/logger/Logger";
import { ValidatorFactory } from "../core/validation/Validator";

/**
 * NotionページをHabitモデルに変換するマッパークラス
 */
export class HabitMapper {
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  /**
   * ページレスポンスをHabitモデルに変換
   */
  async mapToHabit(page: PageResponse, content: BlockObjectResponse): Promise<Habit> {
    try {
      this.logger.debug(`ページ ${page.id} をHabitモデルに変換中`);

      const habit = this.createHabitModel(page, content);

      // バリデーション
      ValidatorFactory.validateHabit(habit);

      this.logger.debug(`ページ ${page.id} の変換が完了しました`);
      return habit;
    } catch (error) {
      this.logger.error(`ページ ${page.id} の変換エラー`, error as Error, { pageId: page.id });

      if (error instanceof FetchError) {
        throw error;
      }

      throw new FetchError(
        `ページ ${page.id} の変換に失敗しました: ${error}`,
        ERROR_CODES.PROPERTY_MAPPING_FAILED,
        { pageId: page.id, originalError: error }
      );
    }
  }

  /**
   * 複数のページレスポンスをHabitモデルの配列に変換
   */
  async mapToHabits(pages: PageResponse[], contents: BlockObjectResponse[]): Promise<Habit[]> {
    if (pages.length !== contents.length) {
      throw new FetchError(
        "ページ数とコンテンツ数が一致しません",
        ERROR_CODES.PROPERTY_MAPPING_FAILED,
        { pageCount: pages.length, contentCount: contents.length }
      );
    }

    this.logger.info(`${pages.length}個のページをHabitモデルに変換中`);

    const results = await Promise.allSettled(
      pages.map((page, index) =>
        this.mapToHabit(page, contents[index])
      )
    );

    // 成功した結果のみを返す
    const successfulHabits: Habit[] = [];
    const errors: Error[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulHabits.push(result.value);
      } else {
        errors.push(result.reason);
        this.logger.error(`ページ ${pages[index].id} の変換に失敗`, result.reason);
      }
    });

    if (errors.length > 0) {
      this.logger.warn(`${errors.length}個のページの変換に失敗しました`);
    }

    this.logger.info(`${successfulHabits.length}個のHabitモデルが正常に変換されました`);
    return successfulHabits;
  }

  /**
   * ページレスポンスからHabitモデルを作成
   */
  private createHabitModel(page: PageResponse, content: BlockObjectResponse): Habit {
    // 型ガードを使用して型安全にプロパティにアクセス
    if (isHabitPageObjectResponse(page)) {
      return {
        name: this.extractTitle(page.properties.NAME.title),
        time: this.extractRichText(page.properties.TIME.rich_text),
        days: page.properties.DAY.multi_select.map(day => this.convertStringToDay(day.name)),
        profiles: page.properties.PROFILE.relation.map(rel => rel.id),
        tobes: page.properties.TOBE.relation.map(rel => rel.id),
        content: content,
      };
    } else if (isPartialHabitPageObjectResponse(page) && page.properties) {
      return {
        name: this.extractTitle(page.properties.NAME?.title),
        time: this.extractRichText(page.properties.TIME?.rich_text),
        days: page.properties.DAY?.multi_select?.map(day => this.convertStringToDay(day.name)) || [],
        profiles: page.properties.PROFILE?.relation?.map(rel => rel.id) || [],
        tobes: page.properties.TOBE?.relation?.map(rel => rel.id) || [],
        content: content,
      };
    } else {
      throw new FetchError(
        `ページ ${page.id} のプロパティが期待される形式ではありません`,
        ERROR_CODES.PROPERTY_MAPPING_FAILED,
        { pageId: page.id, pageObject: page.object }
      );
    }
  }

  /**
   * タイトル配列からテキストを抽出
   */
  private extractTitle(titleArray: Array<{ plain_text: string }> | undefined): string {
    if (!titleArray || titleArray.length === 0) {
      return "";
    }
    return titleArray[0]?.plain_text || "";
  }

  /**
   * リッチテキスト配列からテキストを抽出
   */
  private extractRichText(richTextArray: Array<{ plain_text: string }> | undefined): string {
    if (!richTextArray || richTextArray.length === 0) {
      return "";
    }
    return richTextArray[0]?.plain_text || "";
  }

  /**
   * 文字列をDay型に変換
   */
  private convertStringToDay(dayString: string): Day {
    const dayMap: Record<string, Day> = {
      'MONDAY': Day.MONDAY,
      'TUESDAY': Day.TUESDAY,
      'WEDNESDAY': Day.WEDNESDAY,
      'THURSDAY': Day.THURSDAY,
      'FRIDAY': Day.FRIDAY,
      'SATURDAY': Day.SATURDAY,
      'SUNDAY': Day.SUNDAY,
    };

    const day = dayMap[dayString.toUpperCase()];
    if (day === undefined) {
      throw new FetchError(
        `無効な曜日: ${dayString}`,
        ERROR_CODES.VALIDATION_FAILED,
        { dayString, validDays: Object.keys(dayMap) }
      );
    }

    return day;
  }
}
