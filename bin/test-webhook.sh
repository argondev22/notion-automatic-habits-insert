#!/bin/bash

# Webhook Test Script for Template-Based Habit Scheduler
# このスクリプトは実際のAPIエンドポイントをテストします

set -e

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# デフォルト設定
HOST="${HOST:-localhost}"
PORT="${PORT:-8080}"
BASE_URL="http://${HOST}:${PORT}"

# .envファイルからWEBHOOK_SECRETを読み込む
if [ -f "app/.env" ]; then
    export $(grep -v '^#' app/.env | grep WEBHOOK_SECRET | xargs)
fi

if [ -z "$WEBHOOK_SECRET" ]; then
    echo -e "${RED}❌ WEBHOOK_SECRET が設定されていません${NC}"
    echo "app/.env ファイルに WEBHOOK_SECRET を設定してください"
    exit 1
fi

echo -e "${BLUE}🧪 Webhook API テスト開始${NC}"
echo "=================================="
echo "Base URL: ${BASE_URL}"
echo ""

# テスト1: ヘルスチェック
echo -e "${YELLOW}[テスト 1] ヘルスチェック${NC}"
echo "GET ${BASE_URL}/health"
echo ""

HEALTH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${BASE_URL}/health")
HTTP_STATUS=$(echo "$HEALTH_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Response:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✓ ヘルスチェック成功 (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${RED}✗ ヘルスチェック失敗 (HTTP $HTTP_STATUS)${NC}"
fi
echo ""

# テスト2: 認証なしでWebhookを呼び出し（失敗するはず）
echo -e "${YELLOW}[テスト 2] 認証なしでWebhook呼び出し（401エラーを期待）${NC}"
echo "POST ${BASE_URL}/webhook"
echo ""

WEBHOOK_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{}' \
    "${BASE_URL}/webhook")

HTTP_STATUS=$(echo "$WEBHOOK_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$WEBHOOK_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Response:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" -eq 401 ]; then
    echo -e "${GREEN}✓ 認証エラーが正しく返されました (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${RED}✗ 予期しないステータスコード (HTTP $HTTP_STATUS)${NC}"
fi
echo ""

# テスト3: 正しい認証でWebhookを呼び出し
echo -e "${YELLOW}[テスト 3] 正しい認証でWebhook呼び出し${NC}"
echo "POST ${BASE_URL}/webhook"
echo "Secret: ${WEBHOOK_SECRET:0:10}..."
echo ""

WEBHOOK_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "X-Webhook-Secret: ${WEBHOOK_SECRET}" \
    -d '{}' \
    "${BASE_URL}/webhook")

HTTP_STATUS=$(echo "$WEBHOOK_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$WEBHOOK_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Response:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✓ Webhook呼び出し成功 (HTTP $HTTP_STATUS)${NC}"

    # レスポンスの詳細を表示
    CREATED=$(echo "$RESPONSE_BODY" | jq -r '.created // 0')
    SKIPPED=$(echo "$RESPONSE_BODY" | jq -r '.skipped // 0')
    ERRORS=$(echo "$RESPONSE_BODY" | jq -r '.errors | length // 0')
    EXEC_TIME=$(echo "$RESPONSE_BODY" | jq -r '.executionTime // 0')

    echo ""
    echo "📊 実行結果:"
    echo "  - 作成されたハビット: ${CREATED}"
    echo "  - スキップされたハビット: ${SKIPPED}"
    echo "  - エラー数: ${ERRORS}"
    echo "  - 実行時間: ${EXEC_TIME}ms"
else
    echo -e "${RED}✗ Webhook呼び出し失敗 (HTTP $HTTP_STATUS)${NC}"
fi
echo ""

# テスト4: 存在しないエンドポイント（404エラーを期待）
echo -e "${YELLOW}[テスト 4] 存在しないエンドポイント（404エラーを期待）${NC}"
echo "GET ${BASE_URL}/nonexistent"
echo ""

NOT_FOUND_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${BASE_URL}/nonexistent")
HTTP_STATUS=$(echo "$NOT_FOUND_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$NOT_FOUND_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Response:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" -eq 404 ]; then
    echo -e "${GREEN}✓ 404エラーが正しく返されました (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${RED}✗ 予期しないステータスコード (HTTP $HTTP_STATUS)${NC}"
fi
echo ""

echo -e "${BLUE}=================================="
echo "🎉 テスト完了${NC}"
