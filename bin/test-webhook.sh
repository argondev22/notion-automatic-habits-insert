#!/bin/bash

# Webhookサーバーテストスクリプト

# 色設定
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# デフォルト設定
HOST="${WEBHOOK_HOST:-localhost}"
PORT="${WEBHOOK_PORT:-8080}"
SECRET="${WEBHOOK_SECRET:-your_webhook_secret_here}"
BASE_URL="http://${HOST}:${PORT}"

echo "=========================================="
echo "  Webhook Server Test"
echo "=========================================="
echo ""
echo "Target: ${BASE_URL}"
echo ""

# 1. ヘルスチェック
echo "1. Health Check..."
HEALTH_RESPONSE=$(curl -s "${BASE_URL}/health")
HEALTH_STATUS=$(echo $HEALTH_RESPONSE | jq -r '.status' 2>/dev/null)

if [ "$HEALTH_STATUS" == "ok" ]; then
  echo -e "${GREEN}✓ Health check passed${NC}"
  echo "   Response: $HEALTH_RESPONSE"
else
  echo -e "${RED}✗ Health check failed${NC}"
  echo "   Response: $HEALTH_RESPONSE"
  exit 1
fi

echo ""

# 2. ルートエンドポイント
echo "2. Root Endpoint..."
ROOT_RESPONSE=$(curl -s "${BASE_URL}/")
ROOT_MESSAGE=$(echo $ROOT_RESPONSE | jq -r '.message' 2>/dev/null)

if [ "$ROOT_MESSAGE" != "null" ]; then
  echo -e "${GREEN}✓ Root endpoint accessible${NC}"
  echo "   Message: $ROOT_MESSAGE"
else
  echo -e "${RED}✗ Root endpoint failed${NC}"
  echo "   Response: $ROOT_RESPONSE"
fi

echo ""

# 3. Webhook（認証なし）
echo "3. Webhook without authentication..."
WEBHOOK_NO_AUTH=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/webhook" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$WEBHOOK_NO_AUTH" | tail -n 1)
RESPONSE_BODY=$(echo "$WEBHOOK_NO_AUTH" | sed '$d')

if [ "$HTTP_CODE" == "401" ]; then
  echo -e "${GREEN}✓ Authentication required (401)${NC}"
  echo "   Response: $RESPONSE_BODY"
else
  echo -e "${YELLOW}⚠ Expected 401, got ${HTTP_CODE}${NC}"
  echo "   Response: $RESPONSE_BODY"
fi

echo ""

# 4. Webhook（認証あり）
echo "4. Webhook with authentication..."
echo "   (This will trigger the actual Habit→Todo conversion)"
echo ""
read -p "   Continue? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  WEBHOOK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/webhook" \
    -H "Content-Type: application/json" \
    -H "X-Webhook-Secret: ${SECRET}")

  HTTP_CODE=$(echo "$WEBHOOK_RESPONSE" | tail -n 1)
  RESPONSE_BODY=$(echo "$WEBHOOK_RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" == "200" ]; then
    SUCCESS=$(echo $RESPONSE_BODY | jq -r '.success' 2>/dev/null)

    if [ "$SUCCESS" == "true" ]; then
      echo -e "${GREEN}✓ Webhook execution successful${NC}"
      echo ""
      echo "   Results:"
      echo "   --------"
      echo $RESPONSE_BODY | jq '.'
    else
      echo -e "${RED}✗ Webhook execution failed${NC}"
      echo "   Error: $(echo $RESPONSE_BODY | jq -r '.error' 2>/dev/null)"
      echo ""
      echo "   Full response:"
      echo $RESPONSE_BODY | jq '.'
    fi
  else
    echo -e "${RED}✗ Unexpected HTTP status: ${HTTP_CODE}${NC}"
    echo "   Response: $RESPONSE_BODY"
  fi
else
  echo "   Skipped webhook execution"
fi

echo ""

# 5. 存在しないエンドポイント
echo "5. Non-existent endpoint (404 test)..."
NOT_FOUND=$(curl -s -w "\n%{http_code}" "${BASE_URL}/nonexistent")
HTTP_CODE=$(echo "$NOT_FOUND" | tail -n 1)

if [ "$HTTP_CODE" == "404" ]; then
  echo -e "${GREEN}✓ 404 handling works correctly${NC}"
else
  echo -e "${YELLOW}⚠ Expected 404, got ${HTTP_CODE}${NC}"
fi

echo ""
echo "=========================================="
echo "  Test Complete"
echo "=========================================="

