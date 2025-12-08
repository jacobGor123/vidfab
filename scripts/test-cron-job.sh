#!/bin/bash

# ===========================================
# Test Cron Job Locally
# ===========================================
# 本地测试 Cron Job 是否正常工作
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}🔍 Testing Cron Job: /api/cron/generate-blog${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# 检查必需的环境变量
echo -e "${YELLOW}📋 Checking required environment variables...${NC}"
echo ""

MISSING_VARS=()

if [ -z "$INNGEST_EVENT_KEY" ]; then
    echo -e "${RED}❌ INNGEST_EVENT_KEY is not set${NC}"
    MISSING_VARS+=("INNGEST_EVENT_KEY")
else
    echo -e "${GREEN}✅ INNGEST_EVENT_KEY is set${NC}"
fi

if [ -z "$INNGEST_SIGNING_KEY" ]; then
    echo -e "${RED}❌ INNGEST_SIGNING_KEY is not set${NC}"
    MISSING_VARS+=("INNGEST_SIGNING_KEY")
else
    echo -e "${GREEN}✅ INNGEST_SIGNING_KEY is set${NC}"
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  ANTHROPIC_API_KEY is not set (needed for blog generation)${NC}"
    MISSING_VARS+=("ANTHROPIC_API_KEY")
else
    echo -e "${GREEN}✅ ANTHROPIC_API_KEY is set${NC}"
fi

echo ""

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required environment variables!${NC}"
    echo -e "${YELLOW}Please set the following variables in your .env file:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo -e "  - $var"
    done
    echo ""
    echo -e "${YELLOW}For more information, see: docs/cron-job-diagnostic.md${NC}"
    exit 1
fi

# 检查开发服务器是否运行
echo -e "${YELLOW}📡 Checking if development server is running...${NC}"
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${RED}❌ Development server is not running!${NC}"
    echo -e "${YELLOW}Please start the server first:${NC}"
    echo -e "  npm run dev"
    echo -e "  # or"
    echo -e "  ./scripts/dev.sh"
    exit 1
fi
echo -e "${GREEN}✅ Development server is running${NC}"
echo ""

# 测试 Cron API 端点
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}🚀 Testing Cron API Endpoint${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

echo -e "${YELLOW}Sending GET request to http://localhost:3000/api/cron/generate-blog${NC}"
echo ""

# 使用 curl 测试 API
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/cron/generate-blog)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo -e "${YELLOW}HTTP Status Code:${NC} $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Request successful (200 OK)${NC}"
    echo ""
    echo -e "${YELLOW}Response Body:${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""

    # 提取 eventIds
    EVENT_IDS=$(echo "$BODY" | jq -r '.eventIds[]' 2>/dev/null)

    if [ -n "$EVENT_IDS" ]; then
        echo -e "${GREEN}✅ Inngest event queued successfully!${NC}"
        echo -e "${YELLOW}Event IDs:${NC}"
        echo "$EVENT_IDS"
        echo ""
        echo -e "${BLUE}=========================================${NC}"
        echo -e "${BLUE}📊 Next Steps${NC}"
        echo -e "${BLUE}=========================================${NC}"
        echo ""
        echo -e "${YELLOW}1. Check Inngest Dashboard:${NC}"
        echo -e "   https://www.inngest.com/dashboard"
        echo ""
        echo -e "${YELLOW}2. Find your function:${NC}"
        echo -e "   App: vidfab"
        echo -e "   Function: generate-blog-article"
        echo ""
        echo -e "${YELLOW}3. View execution logs:${NC}"
        echo -e "   - Check each step's execution status"
        echo -e "   - View detailed logs and errors"
        echo -e "   - Monitor execution time"
        echo ""
        echo -e "${YELLOW}4. Check local console:${NC}"
        echo -e "   Your development server console should show:"
        echo -e "   - ℹ️  Cron job triggered: generate-blog"
        echo -e "   - 📝 Blog generation started"
        echo -e "   - ... (more logs as generation proceeds)"
        echo ""
    else
        echo -e "${YELLOW}⚠️  Response doesn't contain eventIds${NC}"
        echo -e "${YELLOW}This might indicate an issue with Inngest configuration${NC}"
    fi
else
    echo -e "${RED}❌ Request failed with status code: $HTTP_CODE${NC}"
    echo ""
    echo -e "${YELLOW}Response Body:${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
    echo -e "${YELLOW}Please check:${NC}"
    echo -e "  1. Your .env file has all required variables"
    echo -e "  2. The development server is running properly"
    echo -e "  3. Inngest configuration is correct"
    echo ""
    echo -e "${YELLOW}For more information, see: docs/cron-job-diagnostic.md${NC}"
    exit 1
fi

echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}✅ Test completed successfully!${NC}"
echo -e "${BLUE}=========================================${NC}"
