# Notion Automatic Habit Insert

NotionのTemplateを活用した習慣管理システム。Webhookトリガーで自動的にTimebox（旧Todos）データベースに習慣エントリを作成します。

## 📋 概要

このアプリケーションは、Notionのテンプレート機能を活用した習慣追跡システムです。従来のHabitsデータベースを廃止し、Timeboxデータベース内でタスクと習慣を統一管理します。

### 主な特徴

- **テンプレートベース**: Notionの標準テンプレート機能を活用
- **統一データベース**: TimboxデータベースでタスクとHABITを一元管理
- **設定ファイル駆動**: `habits.json`で習慣スケジュールを管理
- **Webhook対応**: 外部システムからの自動実行をサポート
- **セキュア**: Webhook認証による安全な実行

### 処理フロー

1. **Webhookリクエスト受信** → セキュリティ検証
2. **習慣設定読み込み** → `config/habits.json`から設定取得
3. **スケジュール判定** → 明日実行すべき習慣を特定
4. **テンプレート適用** → Notionテンプレートを使用してエントリ作成
5. **プロパティ設定** → TAG="HABIT"、EXPECTED時間を自動設定（明日の日付で）

**重要**: このシステムは、Webhookが発火した時点で**明日の日付**で習慣を作成します。例えば、月曜日にWebhookが実行されると、火曜日の習慣が作成されます。これにより、前日に翌日の習慣を準備することができます。

## 🏗️ アーキテクチャ

シンプルで保守しやすい設計を採用：

- **WebhookServer**: HTTPリクエスト処理とセキュリティ検証
- **HabitManager**: 習慣作成のコアロジック
- **NotionClientWrapper**: Notion API統合
- **Configuration Management**: 設定ファイル管理
- **Time Utilities**: 時間計算とタイムゾーン処理

## 🚀 クイックスタート

### 前提条件

- Node.js 18+ または Docker
- Notion APIキー
- Timeboxデータベースとテンプレートの設定

### 1. リポジトリをクローン

```bash
git clone <repo-url> notion-automatic-habit-insert
cd notion-automatic-habit-insert
```

### 2. 環境設定

`.env.example`をコピーして`.env`を作成：

```bash
cd app
cp .env.example .env
```

必要な環境変数を設定：

```bash
# Notion API設定
NOTION_API_KEY=secret_xxx
TIMEBOX_DATABASE_ID=database_id_xxx

# Webhook セキュリティ
WEBHOOK_SECRET=your_secure_secret_here

# サーバー設定
PORT=8080
TIMEZONE=Asia/Tokyo
```

### 3. 習慣設定

`config/habits.json`で習慣スケジュールを設定：

```json
[
  {
    "name": "Morning Exercise",
    "templateId": "template-123",
    "frequency": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "startTime": "07:00",
    "endTime": "08:00",
    "enabled": true
  }
]
```

### 4. サーバーを起動

#### Node.js で直接実行

```bash
cd app
npm install
npm run dev
```

#### Docker で実行

```bash
cd app
docker compose up --build
```

サーバーは `http://localhost:8080` で起動します。

## 🔐 環境変数

| 名前                  | 説明                                | 必須 | デフォルト           |
| --------------------- | ----------------------------------- | ---- | -------------------- |
| `NOTION_API_KEY`      | Notion APIの統合トークン            | ✓    | -                    |
| `TIMEBOX_DATABASE_ID` | TimeboxデータベースのID             | ✓    | -                    |
| `WEBHOOK_SECRET`      | Webhook認証用のシークレット         | ✓    | -                    |
| `PORT`                | サーバーのポート番号                | -    | `8080`               |
| `TIMEZONE`            | タイムゾーン（IANA形式）            | -    | `UTC`                |
| `LOG_LEVEL`           | ログレベル（debug/info/warn/error） | -    | `info`               |
| `HABITS_CONFIG_PATH`  | 習慣設定ファイルのパス              | -    | `config/habits.json` |

### Notion設定

1. **Integration作成**: [Notion Integrations](https://www.notion.so/my-integrations)でIntegrationを作成
2. **データベース共有**: TimeboxデータベースをIntegrationと共有
3. **テンプレート作成**: Timeboxデータベース内で習慣用テンプレートを作成
4. **テンプレートID取得**: 各テンプレートのIDを`habits.json`に設定

## 📡 API エンドポイント

### ヘルスチェック

```bash
GET /health
```

**レスポンス:**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-12T12:00:00.000Z",
  "uptime": 3600
}
```

### Webhook（習慣作成）

```bash
POST /webhook
```

**認証方法:**

```bash
# X-Webhook-Secretヘッダーでsecretを送信
curl -X POST http://localhost:8080/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your_webhook_secret"
```

**レスポンス（成功時）:**

```json
{
  "success": true,
  "created": [
    {
      "id": "page-id-123",
      "title": "Morning Exercise",
      "templateUsed": "template-123",
      "timeRange": "07:00-08:00"
    }
  ],
  "skipped": ["Evening Meditation"],
  "errors": [],
  "executionTime": 1250
}
```

**レスポンス（エラー時）:**

```json
{
  "success": false,
  "created": [],
  "skipped": [],
  "errors": ["Failed to create habit: Morning Exercise"],
  "executionTime": 800
}
```

## ⚙️ 習慣設定（habits.json）

`config/habits.json`で習慣のスケジュールを管理します：

```json
[
  {
    "name": "Morning Exercise",
    "templateId": "template-123",
    "frequency": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "startTime": "07:00",
    "endTime": "08:00",
    "enabled": true
  },
  {
    "name": "Weekly Review",
    "templateId": "template-789",
    "frequency": ["sunday"],
    "startTime": "19:00",
    "endTime": "20:00",
    "enabled": true
  }
]
```

### 設定項目

| フィールド   | 説明                   | 例                     |
| ------------ | ---------------------- | ---------------------- |
| `name`       | 習慣の名前（ログ用）   | `"Morning Exercise"`   |
| `templateId` | NotionテンプレートのID | `"template-123"`       |
| `frequency`  | 実行する曜日の配列     | `["monday", "friday"]` |
| `startTime`  | 開始時刻（HH:MM形式）  | `"07:00"`              |
| `endTime`    | 終了時刻（HH:MM形式）  | `"08:00"`              |
| `enabled`    | 有効/無効フラグ        | `true`                 |

### 曜日指定

```json
{
  "frequency": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
}
```

- 毎日: 全曜日を指定
- 平日のみ: `["monday", "tuesday", "wednesday", "thursday", "friday"]`
- 週末のみ: `["saturday", "sunday"]`
- 特定の曜日: `["monday", "wednesday", "friday"]`

**注意**: `frequency`で指定した曜日は、習慣が作成される**翌日**の曜日です。例えば、`["monday"]`と指定した場合、日曜日にWebhookを実行すると月曜日の習慣が作成されます。

### 日付を跨ぐ時間帯

開始時刻が終了時刻より遅い場合、自動的に日付を跨ぐ習慣として処理されます：

```json
{
  "name": "Night Sleep Routine",
  "templateId": "template-101",
  "frequency": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
  "startTime": "23:00",
  "endTime": "06:00",
  "enabled": true
}
```

この例では、23:00から翌日の06:00までの習慣として作成されます。

## 🔧 使用例

### cURL

```bash
# 習慣作成を実行
curl -X POST http://localhost:8080/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your_webhook_secret"

# ヘルスチェック
curl http://localhost:8080/health
```

### GitHub Actions / 外部CI

```yaml
- name: Create Daily Habits
  run: |
    curl -X POST ${{ secrets.WEBHOOK_URL }}/webhook \
      -H "Content-Type: application/json" \
      -H "X-Webhook-Secret: ${{ secrets.WEBHOOK_SECRET }}"
```

### 自動化ツール

- **Zapier**: スケジュールトリガーでWebhookを実行
- **Make.com**: 時間ベースのシナリオでAPI呼び出し
- **GitHub Actions**: Cronジョブで定期実行
- **cron**: サーバーのcrontabで定期実行

```bash
# 毎朝7時に実行（crontab例）
# 注意: 7時に実行すると、その日（今日）の習慣が作成されます
0 7 * * * curl -X POST http://localhost:8080/webhook -H "X-Webhook-Secret: your_secret"

# 前日の夜に実行する場合（推奨）
# 23時に実行すると、翌日の習慣が作成されます
0 23 * * * curl -X POST http://localhost:8080/webhook -H "X-Webhook-Secret: your_secret"
```

## 🛠️ 開発

### ローカル開発

```bash
cd app
npm install
npm run dev
```

### テスト実行

```bash
cd app
npm test                # 全テスト実行
npm run test:watch      # ウォッチモード
npm run test:coverage   # カバレッジ付き
```

### TypeScript型チェック

```bash
cd app
npm run type-check
```

### Linter

```bash
cd app
npm run lint        # 自動修正
npm run lint:check  # チェックのみ
```

### フォーマット

```bash
cd app
npm run format        # 自動フォーマット
npm run format:check  # チェックのみ
```

### ビルド

```bash
cd app
npm run build
```

## 📁 プロジェクト構造

```text
app/
├── src/
│   ├── __tests__/           # メインアプリケーションテスト
│   ├── config/              # 設定管理
│   │   ├── __tests__/       # 設定テスト
│   │   ├── index.ts         # 設定エクスポート
│   │   └── loader.ts        # 習慣設定ローダー
│   ├── types/               # TypeScript型定義
│   │   ├── __tests__/       # 型テスト
│   │   ├── index.ts         # メイン型定義
│   │   └── notion.ts        # Notion API型
│   ├── utils/               # ユーティリティ
│   │   ├── __tests__/       # ユーティリティテスト
│   │   ├── index.ts         # ユーティリティエクスポート
│   │   ├── scheduling.ts    # スケジューリングロジック
│   │   └── time.ts          # 時間計算
│   ├── habit-manager.ts     # 習慣管理コアロジック
│   ├── main.ts              # アプリケーションエントリーポイント
│   ├── notion-client.ts     # Notion APIクライアント
│   └── webhook-server.ts    # Webhookサーバー
├── config/
│   └── habits.json          # 習慣設定ファイル
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── jest.config.js
```

## 📊 テスト

### テストスイート

- **Unit Tests**: 79テスト、5テストスイート
- **Property-Based Tests**: fast-checkを使用した包括的テスト（オプション）
- **Integration Tests**: エンドツーエンドフロー検証（オプション）

### テストカバレッジ

- **Core Utilities**: 90%以上のカバレッジ
- **Configuration**: 完全なバリデーションテスト
- **Time Calculations**: 全時間パターンのテスト
- **Scheduling Logic**: 全頻度パターンのテスト

### テスト実行

```bash
# 全テスト実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジレポート
npm run test:coverage
```

## 🔍 トラブルシューティング

### よくある問題

#### 1. Notion API エラー

```bash
# エラー: Unauthorized
# 解決: NOTION_API_KEYが正しく設定されているか確認
echo $NOTION_API_KEY

# エラー: Database not found
# 解決: TIMEBOX_DATABASE_IDが正しく、Integrationがアクセス権限を持っているか確認
```

#### 2. テンプレートが見つからない

```bash
# エラー: Template not found
# 解決: habits.jsonのtemplateIdが正しいか確認
# Notionでテンプレートを作成し、IDを取得
```

#### 3. Webhook認証エラー

```bash
# エラー: Unauthorized webhook request
# 解決: リクエストにX-Webhook-Secretヘッダーが含まれているか確認
curl -X POST http://localhost:8080/webhook -H "X-Webhook-Secret: your_secret"
```

#### 4. ポートが使用中

```bash
# ポート8080を使用しているプロセスを確認
lsof -i :8080

# または別のポートを使用
PORT=3001 npm run dev
```

### ログの確認

```bash
# 開発環境でデバッグログを有効化
LOG_LEVEL=debug npm run dev

# 本番環境でエラーログのみ
LOG_LEVEL=error npm start
```

### 設定の検証

```bash
# 習慣設定ファイルの構文チェック
cat config/habits.json | jq .

# 環境変数の確認
env | grep -E "(NOTION|WEBHOOK|TIMEBOX)"
```

## 📚 関連ドキュメント

- [Spec Requirements](.kiro/specs/template-based-habit-scheduler/requirements.md) - システム要件
- [Design Document](.kiro/specs/template-based-habit-scheduler/design.md) - 設計仕様
- [Implementation Tasks](.kiro/specs/template-based-habit-scheduler/tasks.md) - 実装タスク
- [Notion API Documentation](https://developers.notion.com/) - Notion API公式ドキュメント
- [Notion Templates Guide](https://www.notion.so/help/database-templates) - テンプレート作成ガイド

## 🚀 デプロイ

### Docker での本番デプロイ

```bash
# 本番用イメージをビルド
docker build -t notion-habit-insert:latest app/

# 本番環境で実行
docker run -d \
  --name notion-habit-insert \
  -p 8080:8080 \
  -e NOTION_API_KEY=your_api_key \
  -e TIMEBOX_DATABASE_ID=your_db_id \
  -e WEBHOOK_SECRET=your_secret \
  -e TIMEZONE=Asia/Tokyo \
  notion-habit-insert:latest
```

### PM2 での Node.js デプロイ

```bash
# PM2をインストール
npm install -g pm2

# アプリケーションを起動
cd app
npm run build
pm2 start dist/main.js --name notion-habit-insert

# 自動起動設定
pm2 startup
pm2 save
```

## 📝 ライセンス

ISC
