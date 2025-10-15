# Notion Automatic Habits Insert

NotionのHabitsデータベースからTodoを自動生成してTodosデータベースに挿入するWebhookサーバー。

## 📋 概要

このアプリケーションは、Notionの習慣追跡システムを自動化するWebhookサーバーです。外部からのHTTPリクエストをトリガーとして、以下の処理を実行します：

1. **Habits データベースからデータを取得**
2. **習慣データをTodoアイテムに変換**
3. **Todosデータベースに自動挿入**

## 🏗️ アーキテクチャ

レイヤードアーキテクチャと依存性注入パターンに基づいて設計されています：

- **Presentation層**: `WebhookServer` - HTTPリクエストの処理
- **Domain層**: `OrchestrationService` - ビジネスロジックの統合
- **Repository層**: データアクセスとキャッシュ管理
- **Service層**: 外部API（Notion）との連携

詳細は [.cursorrules/architecture.md](.cursorrules/architecture.md) を参照してください。

## 🚀 クイックスタート

### 前提条件

- Docker & Docker Compose
- [Dev Container](https://containers.dev/) CLI または VSCode 拡張機能（開発時）

### 1. リポジトリをクローン

```bash
git clone <repo-url> notion-automatic-habits-insert
cd notion-automatic-habits-insert
```

### 2. 環境設定

`docker-compose.example.yml`をコピーして`docker-compose.yml`を作成：

```bash
cp app/docker-compose.example.yml app/docker-compose.yml
```

必要な環境変数を設定：

```yaml
environment:
  - INTEGRATION_SECRET=your_notion_api_key
  - HABITS_DATABASE_ID=your_habits_database_id
  - TODOS_DATABASE_ID=your_todos_database_id
  - PORT=3000
  - WEBHOOK_PATH=/webhook
  - WEBHOOK_SECRET=your_webhook_secret
  - NODE_ENV=production
```

### 3. サーバーを起動

```bash
cd app
docker compose up --build
```

サーバーは `http://localhost:3000` で起動します。

## 🔐 環境変数

| 名前 | 説明 | 必須 | デフォルト |
|---|---|---|---|
| `INTEGRATION_SECRET` | Notion APIの統合シークレット | ✓ | - |
| `HABITS_DATABASE_ID` | HabitsデータベースのID | ✓ | - |
| `TODOS_DATABASE_ID` | TodosデータベースのID | ✓ | - |
| `PORT` | サーバーのポート番号 | - | `3000` |
| `WEBHOOK_PATH` | Webhookのエンドポイントパス | - | `/webhook` |
| `WEBHOOK_SECRET` | Webhook認証用のシークレット | - | - |
| `NODE_ENV` | 実行環境（development/production） | - | `development` |

## 📡 API エンドポイント

### ヘルスチェック

```bash
GET /health
```

**レスポンス:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-15T12:00:00.000Z"
}
```

### ルート

```bash
GET /
```

**レスポンス:**
```json
{
  "message": "Notion Automatic Habits Insert Webhook Server",
  "version": "1.0.0",
  "endpoints": {
    "health": "/health",
    "webhook": "/webhook"
  }
}
```

### Webhook

```bash
POST /webhook
```

**ヘッダー:**
```
Content-Type: application/json
X-Webhook-Secret: your_webhook_secret
```

**レスポンス（成功時）:**
```json
{
  "success": true,
  "habitCount": 10,
  "todoCount": 15,
  "linkedCount": 15,
  "executionTime": 2500,
  "responseTime": 2505,
  "timestamp": "2025-10-15T12:00:00.000Z"
}
```

**レスポンス（エラー時）:**
```json
{
  "success": false,
  "error": "エラーメッセージ",
  "executionTime": 1200,
  "responseTime": 1205,
  "timestamp": "2025-10-15T12:00:00.000Z"
}
```

## 🔧 使用例

### cURL

```bash
# Webhook を実行
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your_webhook_secret"

# ヘルスチェック
curl http://localhost:3000/health
```

### GitHub Actions / 外部CI

```yaml
- name: Trigger Notion Habits Update
  run: |
    curl -X POST ${{ secrets.WEBHOOK_URL }}/webhook \
      -H "Content-Type: application/json" \
      -H "X-Webhook-Secret: ${{ secrets.WEBHOOK_SECRET }}"
```

### Notion Automation

Notionの自動化機能やZapier、Make.comなどのツールから、指定したURLにPOSTリクエストを送信することで、自動的にHabitsからTodosへの変換・挿入が実行されます。

## 🛠️ 開発

### Dev Container での開発

1. `devcontainer.example.json`をコピーして`devcontainer.json`を作成
2. VSCodeでDev Containerを起動

```bash
devcontainer up --workspace-folder .
```

### ローカルでの実行

```bash
cd app
npm install
npm run start
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

## 📁 プロジェクト構造

```
app/
├── src/
│   ├── domain/           # ドメインロジック
│   │   ├── fetch/        # Habits取得
│   │   ├── convert/      # Habits→Todo変換
│   │   ├── insert/       # Todos挿入
│   │   └── orchestration/# 全体のフロー管理
│   ├── presentation/     # HTTPサーバー
│   ├── shared/           # 共通ユーティリティ
│   │   ├── cache/        # キャッシュ管理
│   │   ├── config/       # 設定管理
│   │   ├── di/           # 依存性注入
│   │   ├── errors/       # エラーハンドリング
│   │   ├── factories/    # ファクトリーパターン
│   │   ├── logger/       # ロガー
│   │   ├── retry/        # リトライ機構
│   │   └── validation/   # バリデーション
│   └── main.ts           # エントリーポイント
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

## 🔍 トラブルシューティング

### ポートが使用中

```bash
# ポート3000を使用しているプロセスを確認
lsof -i :3000

# または別のポートを使用
PORT=3001 docker compose up
```

### Notion API エラー

- `INTEGRATION_SECRET`が正しく設定されているか確認
- NotionのIntegrationがHabitsとTodosデータベースにアクセス権限を持っているか確認

### キャッシュのクリア

コンテナを再構築：

```bash
npm run clean
npm run start
```

## 📚 関連ドキュメント

- [アーキテクチャガイド](.cursorrules/architecture.md)
- [コーディングパターン](.cursorrules/coding-patterns.md)
- [Notion API ドキュメント](https://developers.notion.com/)

## 📝 ライセンス

ISC
