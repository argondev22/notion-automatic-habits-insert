/**
 * 環境変数から設定を取得するユーティリティ
 * アプリケーション全体で共有される設定管理
 */
export class EnvironmentConfig {
  /**
   * HABITSデータベースIDを取得
   */
  static getHabitsDatabaseId(): string | undefined {
    return process.env.HABITS_DATABASE_ID;
  }

  /**
   * TODOSデータベースIDを取得
   */
  static getTodosDatabaseId(): string | undefined {
    return process.env.TODOS_DATABASE_ID;
  }

  /**
   * Notion APIキーを取得
   */
  static getNotionApiKey(): string | undefined {
    return process.env.NOTION_API_KEY;
  }

  /**
   * その他の環境変数
   */
  static getNodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  }

  static isDevelopment(): boolean {
    return this.getNodeEnv() === 'development';
  }

  static isProduction(): boolean {
    return this.getNodeEnv() === 'production';
  }
}
