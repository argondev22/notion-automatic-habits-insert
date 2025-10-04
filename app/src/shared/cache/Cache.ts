/**
 * キャッシュエントリの型定義
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * キャッシュインターフェース
 */
export interface ICache<T> {
  get(key: string): T | null;
  set(key: string, data: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
  isExpired(key: string): boolean;
  getStats(): { size: number; keys: string[] };
}

/**
 * メモリキャッシュ実装
 */
export class MemoryCache<T> implements ICache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTtl: number;

  constructor(defaultTtl: number = 5 * 60 * 1000) {
    // デフォルト5分
    this.defaultTtl = defaultTtl;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (this.isExpired(key)) {
      this.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: ttl || this.defaultTtl,
    };
    this.cache.set(key, entry);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key) && !this.isExpired(key);
  }

  isExpired(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;

    const now = Date.now();
    return now - entry.timestamp > entry.ttl;
  }

  /**
   * 期限切れのエントリをクリーンアップ
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * キャッシュ統計情報を取得
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * キャッシュファクトリー
 */
export class CacheFactory {
  private static instances = new Map<string, ICache<any>>();

  static getCache<T>(name: string, ttl?: number): ICache<T> {
    if (!this.instances.has(name)) {
      this.instances.set(name, new MemoryCache<T>(ttl));
    }
    return this.instances.get(name)!;
  }

  static clearAll(): void {
    this.instances.forEach(cache => cache.clear());
    this.instances.clear();
  }
}
