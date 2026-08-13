# Notion Automatic Habit Insert

NotionのTemplateを活用した習慣管理システム。GitHub Actionsの毎日のcronジョブから直接ワンショットCLIとして実行し、Timebox（旧Todos）データベースに習慣エントリを作成します。

## 📋 概要

このアプリケーションは、Notionのテンプレート機能を活用した習慣追跡システムです。従来のHabitsデータベースを廃止し、Timeboxデータベース内でタスクと習慣を統一管理します。

### 主な特徴

- **テンプレートベース**: Notionの標準テンプレート機能を活用
- **統一データベース**: TimboxデータベースでタスクとHABITを一元管理
- **設定ファイル駆動**: `habits.json`で習慣スケジュールを管理
- **サーバーレス**: HTTPサーバーやWebhookを持たず、GitHub Actionsのcronから直接実行されるワンショットCLI

### 処理フロー

1. **GitHub Actionsのcronがジョブを起動** → ワンショットスクリプトを実行
2. **習慣設定読み込み** → `config/habits.json`から設定取得
3. **スケジュール判定** → 明日実行すべき習慣を特定
4. **テンプレート適用** → Notionテンプレートを使用してエントリ作成
5. **プロパティ設定** → TAG="HABIT"、EXPECTED時間を自動設定（明日の日付で）
6. **終了コードで結果を報告** → 成功時は`0`、エラーがあれば`1`で終了しGitHub Actionsに実行結果を伝える

**重要**: このシステムは、ジョブが実行された時点で**明日の日付**で習慣を作成します。例えば、月曜日にジョブが実行されると、火曜日の習慣が作成されます。これにより、前日に翌日の習慣を準備することができます。

## 🏗️ アーキテクチャ

シンプルで保守しやすい設計を採用：

- **GitHub Actions (cron)**: 毎日決まった時刻にワンショットスクリプトを起動するトリガー
- **HabitManager**: 習慣作成のコアロジック
- **NotionClientWrapper**: Notion API統合
- **Configuration Management**: 設定ファイル管理
- **Time Utilities**: 時間計算とタイムゾーン処理

サーバープロセスは存在せず、ジョブは1回実行されて終了します（常駐プロセスもポート待受もありません）。実行のたびにDockerコンテナやNode.jsプロセスを起動し、処理が終わったら終了します。二重実行を防ぐ重複排除ロジックは意図的に持たないため、`workflow_dispatch`で手動実行した場合、同日中に複数回実行するとNotion側に重複したページが作成される点に注意してください。

## 🚀 クイックスタート

### 前提条件

- Node.js 18+ または Docker
- Notion Internal connectionのInstallation access token
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
NOTION_TOKEN=secret_xxx
TIMEBOX_DATABASE_ID=database_id_xxx

# タイムゾーン設定
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

### 4. 本番運用: GitHub Actionsのcron

本番運用はGitHub Actionsのスケジュール実行（`.github/workflows/run-habits.yml`、毎日21:00 JST）が直接ワンショットスクリプトを実行する方式です。サーバーを起動し続ける必要はありません。リポジトリのSecretsに`NOTION_TOKEN`・`TIMEBOX_DATABASE_ID`を登録しておけば、手動実行（`workflow_dispatch`）も含めて自動的に動作します。

### 5. ローカルでの動作確認

#### Node.js で直接実行（1回だけ実行して終了）

```bash
cd app
npm install
npm start
```

#### Docker で実行（1回だけ実行して終了）

```bash
cd app
docker compose up --build
```

いずれも常駐サーバーではなく、1回habit作成処理を実行したらプロセスが終了します。

## 🔐 環境変数

| 名前                  | 説明                                | 必須 | デフォルト           |
| --------------------- | ----------------------------------- | ---- | -------------------- |
| `NOTION_TOKEN`        | Notion Internal connectionのInstallation access token | ✓    | -                    |
| `TIMEBOX_DATABASE_ID` | TimeboxデータベースのID             | ✓    | -                    |
| `TIMEZONE`            | タイムゾーン（IANA形式）            | -    | `UTC`                |
| `LOG_LEVEL`           | ログレベル（debug/info/warn/error） | -    | `info`               |
| `HABIT_CONFIG_PATH`   | 習慣設定ファイルのパス              | -    | `config/habits.json` |

### Notion設定

1. **Internal connection作成**: [Notion Developer Portal](https://www.notion.so/my-integrations)（`https://www.notion.so/developers/connections`にリダイレクト）でInternal connectionを作成し、Configurationタブの「Installation access token」を控える
2. **データベース共有**: TimeboxデータベースをそのInternal connectionと共有
3. **テンプレート作成**: Timeboxデータベース内で習慣用テンプレートを作成
4. **テンプレートID取得**: 各テンプレートのIDを`habits.json`に設定

## ⏰ 実行トリガー（GitHub Actions cron）

このアプリケーションはHTTPサーバーを持たず、外部から呼び出すエンドポイントもありません。実行は`.github/workflows/run-habits.yml`で定義されたGitHub Actionsのスケジュール実行のみが担います。

```yaml
on:
  schedule:
    - cron: "0 12 * * *" # 12:00 UTC = 21:00 JST
  workflow_dispatch: {}
```

- **毎日21:00 JST**に自動実行されます（GitHub Actionsのスケジュール実行には数分程度の遅延が発生し得るため、意図的に21:00 JSTを狙ってcronを設定しています）。
- **`workflow_dispatch`**により、GitHub Actionsの画面から手動再実行も可能です。ただし本アプリには重複実行を防ぐ仕組みがないため、同日中に手動で複数回実行するとNotionに重複したページが作成されます。

実行結果（作成件数・スキップ件数・エラー内容）はジョブの標準出力ログと終了コードで確認できます。エラーが発生した場合はプロセスが終了コード`1`で終了し、GitHub Actions上でジョブが失敗として記録されます。

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

**注意**: `frequency`で指定した曜日は、習慣が作成される**翌日**の曜日です。例えば、`["monday"]`と指定した場合、日曜日にジョブが実行されると月曜日の習慣が作成されます。

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

### GitHub Actions（本番運用）

本番運用は`.github/workflows/run-habits.yml`のスケジュール実行のみです。追加の設定なしに、毎日21:00 JSTにワンショットスクリプトが実行されます。GitHub Actionsの画面から「Run workflow」を選択すれば`workflow_dispatch`により手動実行も可能です（重複実行防止はないため、同日中の複数回実行には注意してください）。

### ローカルでの手動実行

```bash
# Node.jsで直接実行（1回実行して終了）
cd app
npm start

# Dockerで実行（1回実行して終了）
cd app
docker compose up --build
```

## 🛠️ 開発

### ローカル開発

```bash
cd app
npm install
npm start
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
│   ├── main.ts              # ワンショットCLIエントリーポイント
│   └── notion-client.ts     # Notion APIクライアント
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
# 解決: NOTION_TOKENが正しく設定されているか確認
echo $NOTION_TOKEN

# エラー: Database not found
# 解決: TIMEBOX_DATABASE_IDが正しく、Internal connectionがアクセス権限を持っているか確認
```

#### 2. テンプレートが見つからない

```bash
# エラー: Template not found
# 解決: habits.jsonのtemplateIdが正しいか確認
# Notionでテンプレートを作成し、IDを取得
```

#### 3. GitHub Actionsでジョブが実行されない/失敗する

```bash
# 解決: リポジトリのSettings > Secrets and variablesに
# NOTION_TOKEN と TIMEBOX_DATABASE_ID が登録されているか確認
# Actionsタブから該当のワークフロー実行のログを確認し、エラー内容を特定する
```

### ログの確認

```bash
# ローカルでデバッグログを有効化
LOG_LEVEL=debug npm start

# エラーログのみ
LOG_LEVEL=error npm start
```

### 設定の検証

```bash
# 習慣設定ファイルの構文チェック
cat config/habits.json | jq .

# 環境変数の確認
env | grep -E "(NOTION|TIMEBOX|TIMEZONE)"
```

## 📚 関連ドキュメント

- [Spec Requirements](.kiro/specs/template-based-habit-scheduler/requirements.md) - システム要件
- [Design Document](.kiro/specs/template-based-habit-scheduler/design.md) - 設計仕様
- [Implementation Tasks](.kiro/specs/template-based-habit-scheduler/tasks.md) - 実装タスク
- [Notion API Documentation](https://developers.notion.com/) - Notion API公式ドキュメント
- [Notion Templates Guide](https://www.notion.so/help/database-templates) - テンプレート作成ガイド

## 🚀 デプロイ

本番運用にサーバーのデプロイは不要です。「デプロイ」は次の2点を設定するだけで完了します：

1. リポジトリの **Settings > Secrets and variables > Actions** に `NOTION_TOKEN` と `TIMEBOX_DATABASE_ID` を登録する
2. `.github/workflows/run-habits.yml` がリポジトリに存在していれば、毎日21:00 JSTに自動でジョブが実行される

常駐サーバーを起動し続ける必要はなく、PM2やDockerでの永続稼働も不要です。Dockerは前述の「ローカルでの動作確認」用途にのみ使用します。

### 動作確認用イメージのビルド（ローカル検証のみ）

```bash
# ローカル検証用イメージをビルド
docker build -t notion-habit-insert:latest app/

# 1回実行して終了
docker run --rm \
  -e NOTION_TOKEN=your_installation_access_token \
  -e TIMEBOX_DATABASE_ID=your_db_id \
  -e TIMEZONE=Asia/Tokyo \
  notion-habit-insert:latest
```

## 📝 ライセンス

ISC
