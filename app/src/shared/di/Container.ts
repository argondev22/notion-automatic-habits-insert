/**
 * 依存性注入コンテナ
 */
export class DIContainer {
  private static instance: DIContainer;
  private services = new Map<string, unknown>();
  private factories = new Map<string, () => unknown>();

  private constructor() {}

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * サービスを登録
   */
  register<T>(token: string, service: T): void {
    this.services.set(token, service);
  }

  /**
   * ファクトリーを登録
   */
  registerFactory<T>(token: string, factory: () => T): void {
    this.factories.set(token, factory);
  }

  /**
   * サービスを取得
   */
  get<T>(token: string): T {
    // 直接登録されたサービスをチェック
    if (this.services.has(token)) {
      return this.services.get(token);
    }

    // ファクトリーをチェック
    if (this.factories.has(token)) {
      const factory = this.factories.get(token)!;
      const service = factory();
      this.services.set(token, service); // シングルトンとして保存
      return service;
    }

    throw new Error(`Service '${token}' is not registered`);
  }

  /**
   * サービスが登録されているかチェック
   */
  has(token: string): boolean {
    return this.services.has(token) || this.factories.has(token);
  }

  /**
   * サービスを削除
   */
  remove(token: string): void {
    this.services.delete(token);
    this.factories.delete(token);
  }

  /**
   * すべてのサービスをクリア
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}

/**
 * サービストークン定数
 */
export const SERVICE_TOKENS = {
  LOGGER: 'logger',
  CACHE: 'cache',
  RETRY_MANAGER: 'retryManager',
  CONFIG_MANAGER: 'configManager',
  NOTION_CLIENT: 'notionClient',
  HABIT_VALIDATOR: 'habitValidator',
  DATABASE_ID_VALIDATOR: 'databaseIdValidator',
} as const;

export type ServiceToken = (typeof SERVICE_TOKENS)[keyof typeof SERVICE_TOKENS];
