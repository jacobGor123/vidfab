#!/bin/bash

# ===========================================
# Check Blog Posts in Database
# ===========================================
# 查询数据库中的博客文章,验证 cron job 是否正常工作
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查环境变量
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Missing required environment variables!${NC}"
    echo -e "${YELLOW}Please ensure the following are set in your .env file:${NC}"
    echo -e "  - NEXT_PUBLIC_SUPABASE_URL"
    echo -e "  - SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

# 运行 TypeScript 脚本
npx tsx scripts/check-blog-posts.ts "$@"
