# 🚀 Fetch ディレクトリ - 拡張性・保守性に優れたアーキテクチャ

このディレクトリは、NotionデータベースからHabitデータを取得・変換するための、設計原則やパターンに基づいた拡張性・保守性に優れたアーキテクチャを実装しています。

## 🏗️ アーキテクチャ概要

### 📁 ディレクトリ構造

```
fetch/
├── core/                    # コア機能
│   ├── errors/              # カスタムエラーシステム
│   │   └── FetchError.ts
│   ├── logger/              # ロギングシステム
│   │   └── Logger.ts
│   ├── cache/               # キャッシュシステム
│   │   └── Cache.ts
│   ├── validation/          # バリデーションシステム
│   │   └── Validator.ts
│   ├── retry/               # リトライシステム
│   │   └── RetryManager.ts
│   ├── config/              # 設定管理
│   │   └── Config.ts
│   └── di/                  # 依存性注入
│       └── Container.ts
├── services/                # ビジネスロジック層
│   └── NotionDatabaseService.ts
├── mappers/                 # データ変換層
│   └── HabitMapper.ts
├── repositories/            # データアクセス層
│   └── HabitRepository.ts
├── factories/               # ファクトリーパターン
│   └── ServiceFactory.ts
├── fetch.ts                 # メインAPI
└── README.md                # このファイル
```

## 🎯 主要な特徴

### 1. 🛡️ **包括的なエラーハンドリング**

- **カスタムエラークラス**: 詳細なエラー情報とコンテキスト
- **エラーコードシステム**: 構造化されたエラー管理
- **型安全なエラー処理**: コンパイル時エラー検出

### 2. 📊 **高度なロギングシステム**

- **構造化ログ**: JSON形式での詳細なログ出力
- **ログレベル管理**: DEBUG, INFO, WARN, ERROR
- **コンテキスト情報**: リクエストID、実行時間、メタデータ

### 3. ⚡ **インテリジェントキャッシュ**

- **マルチレベルキャッシュ**: データベース、コンテンツ、Habits別
- **TTL管理**: 自動的な期限切れ処理
- **キャッシュ統計**: ヒット率、サイズ、パフォーマンス

### 4. 🔄 **自動リトライ機能**

- **指数バックオフ**: 賢い遅延計算
- **ジッター**: ランダム遅延で負荷分散
- **リトライ可能エラー判定**: 一時的なエラーのみリトライ

### 5. ✅ **包括的バリデーション**

- **データバリデーション**: Habitモデルの完全性チェック
- **入力バリデーション**: データベースID、ページID
- **型安全な変換**: 文字列からDay型への安全な変換

### 6. 🏭 **依存性注入パターン**

- **DIコンテナ**: 自動的な依存関係解決
- **シングルトン管理**: 効率的なリソース使用
- **テスト容易性**: モック注入が簡単

### 7. ⚙️ **設定管理システム**

- **動的設定**: 実行時の設定変更
- **デフォルト値**: 安全な初期設定
- **型安全な設定**: コンパイル時設定検証

## 🚀 使用方法

### 基本的な使用

```typescript
import {
  fetchHabits,
  fetchHabitById,
  clearCache,
  getCacheStats,
} from './fetch';

// すべてのHabitsを取得
const result = await fetchHabits();
if (result.success) {
  console.log(`取得したHabits: ${result.data?.length}個`);
  console.log(`実行時間: ${result.metadata?.executionTime}ms`);
} else {
  console.error(`エラー: ${result.error}`);
}

// 特定のHabitを取得
const habitResult = await fetchHabitById('page-id-123');
if (habitResult.success) {
  console.log(`Habit: ${habitResult.data?.name}`);
}
```

### 高度な使用

```typescript
import { updateConfig, healthCheck, getCacheStats } from './fetch';

// 設定を更新
updateConfig({
  cacheEnabled: true,
  cacheTtl: 10 * 60 * 1000, // 10分
  retryAttempts: 5,
  logLevel: 'debug',
});

// ヘルスチェック
const health = await healthCheck();
console.log(`システム状態: ${health.status}`);

// キャッシュ統計
const stats = getCacheStats();
console.log(`キャッシュヒット率: ${stats.habits.size}個のHabits`);
```

## 🔧 API リファレンス

### メイン関数

#### `fetchHabits(): Promise<FetchHabitsResult>`

すべてのHabitデータを取得します。

**戻り値:**

```typescript
interface FetchHabitsResult {
  success: boolean;
  data?: Habit[];
  error?: string;
  metadata?: {
    timestamp: Date;
    executionTime: number;
    cacheHit?: boolean;
  };
}
```

#### `fetchHabitById(pageId: string): Promise<FetchHabitResult>`

特定のHabitデータを取得します。

#### `clearCache(): void`

すべてのキャッシュをクリアします。

#### `getCacheStats(): object`

キャッシュ統計情報を取得します。

#### `updateConfig(config: Partial<IFetchConfig>): void`

設定を動的に更新します。

#### `healthCheck(): Promise<HealthStatus>`

システムの健全性をチェックします。

## 🏗️ アーキテクチャパターン

### 1. **レイヤードアーキテクチャ**

```
┌─────────────────────────────────────┐
│           Presentation Layer         │  ← fetch.ts
├─────────────────────────────────────┤
│           Business Layer            │  ← HabitRepository
├─────────────────────────────────────┤
│           Service Layer              │  ← NotionDatabaseService
├─────────────────────────────────────┤
│           Data Access Layer          │  ← HabitMapper
├─────────────────────────────────────┤
│           Infrastructure Layer       │  ← Core services
└─────────────────────────────────────┘
```

### 2. **依存性注入パターン**

```typescript
// 自動的な依存関係解決
const repository =
  ServiceFactory.getService<HabitRepository>('habitRepository');
```

### 3. **ファクトリーパターン**

```typescript
// 統一されたサービス作成
ServiceFactory.initialize();
const service = ServiceFactory.getService<SomeService>('serviceName');
```

## 🧪 テスト戦略

### 単体テスト

```typescript
// モック注入が簡単
ServiceFactory.reset(); // テスト用リセット
const mockLogger = new MockLogger();
ServiceFactory.register('logger', mockLogger);
```

### 統合テスト

```typescript
// 実際のNotion APIを使用したテスト
const result = await fetchHabits();
expect(result.success).toBe(true);
```

## 📈 パフォーマンス最適化

### キャッシュ戦略

- **L1キャッシュ**: メモリ内高速キャッシュ
- **L2キャッシュ**: 永続化キャッシュ（将来実装可能）
- **キャッシュ無効化**: 自動的な期限切れ処理

### 並列処理

- **Promise.all**: 複数ページの並列取得
- **Promise.allSettled**: 部分的な失敗を許容

### リトライ戦略

- **指数バックオフ**: 効率的なリトライ間隔
- **ジッター**: 負荷分散
- **サーキットブレーカー**: 将来実装可能

## 🔒 セキュリティ

### 入力バリデーション

```typescript
// すべての入力が検証される
ValidatorFactory.validateDatabaseId(databaseId);
ValidatorFactory.validateHabit(habit);
```

### エラー情報の制限

```typescript
// 機密情報を除外したエラーメッセージ
throw new FetchError(
  'データベースアクセスエラー',
  ERROR_CODES.DATABASE_NOT_FOUND
);
```

## 🚀 将来の拡張性

### プラグインシステム

```typescript
// 新しいデータソースの追加が簡単
ServiceFactory.register('customDataSource', new CustomDataSource());
```

### メトリクス収集

```typescript
// パフォーマンスメトリクスの自動収集
const metrics = getPerformanceMetrics();
```

### 分散キャッシュ

```typescript
// Redis等の外部キャッシュへの拡張
const redisCache = new RedisCache();
ServiceFactory.register('cache', redisCache);
```

## 📚 ベストプラクティス

1. **単一責任の原則**: 各クラスは一つの責任のみ
2. **依存性逆転**: 抽象に依存、具象に依存しない
3. **開閉の原則**: 拡張に開いて、修正に閉じている
4. **リスコフ置換原則**: 派生クラスは基底クラスと置換可能
5. **インターフェース分離**: クライアントは不要なインターフェースに依存しない

このアーキテクチャは、**スケーラビリティ**、**保守性**、**テスタビリティ**、**パフォーマンス**をすべて考慮した実装です。
