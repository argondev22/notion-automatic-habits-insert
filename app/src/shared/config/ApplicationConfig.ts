/**
 * 設定インターフェース
 */
export interface IFetchConfig {
  readonly databaseId: string;
  readonly cacheEnabled: boolean;
  readonly cacheTtl: number; // ミリ秒
  readonly retryAttempts: number;
  readonly retryDelay: number; // ミリ秒
  readonly timeout: number; // ミリ秒
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * デフォルト設定
 */
export const DEFAULT_CONFIG: IFetchConfig = {
  databaseId: '',
  cacheEnabled: true,
  cacheTtl: 5 * 60 * 1000, // 5分
  retryAttempts: 3,
  retryDelay: 1000, // 1秒
  timeout: 30000, // 30秒
  logLevel: 'info',
};

/**
 * 設定管理クラス
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: IFetchConfig;

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  getConfig(): IFetchConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<IFetchConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  setDatabaseId(databaseId: string): void {
    this.updateConfig({ databaseId });
  }

  getDatabaseId(): string {
    return this.config.databaseId;
  }
}
