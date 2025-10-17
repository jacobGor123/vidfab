#!/bin/bash

# VidFab 订阅系统表初始化脚本
# 用途：创建订阅系统所需的数据库表

set -e  # 遇到错误立即退出

# 颜色配置
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 主执行函数
main() {
    log_info "开始初始化 VidFab 订阅系统数据库表..."

    # 加载环境变量
    if [[ -f ".env.local" ]]; then
        log_info "加载环境变量文件 .env.local"
        export $(grep -v '^#' .env.local | xargs)
    fi

    # 检查环境变量
    if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" ]]; then
        log_error "NEXT_PUBLIC_SUPABASE_URL 环境变量未设置"
        exit 1
    fi

    if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
        log_error "SUPABASE_SERVICE_ROLE_KEY 环境变量未设置"
        exit 1
    fi

    # 执行订阅系统schema
    local schema_file="lib/database/subscription-schema.sql"
    if [[ ! -f "$schema_file" ]]; then
        log_error "订阅系统 schema 文件不存在: $schema_file"
        exit 1
    fi

    log_info "执行订阅系统 schema: $schema_file"

    # 读取SQL文件内容
    local sql_content=$(cat "$schema_file")

    # 使用psql直接连接数据库执行SQL（如果可用）
    if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
        log_info "使用 psql 执行 SQL..."
        echo "$sql_content" | psql "$DATABASE_URL"
    else
        # 使用curl通过Supabase API执行
        log_info "使用 Supabase API 执行 SQL..."

        # 检查jq是否可用
        if ! command -v jq &> /dev/null; then
            log_error "jq 命令未找到，请安装 jq 或设置 DATABASE_URL 环境变量使用 psql"
            exit 1
        fi

        # 分割SQL语句并逐个执行（避免单次请求过大）
        echo "$sql_content" | sed '/^--/d;/^$/d' | split -l 50 - sql_chunk_

        for chunk_file in sql_chunk_*; do
            if [[ -f "$chunk_file" ]]; then
                local chunk_content=$(cat "$chunk_file")
                local json_payload=$(jq -n --arg query "$chunk_content" '{query: $query}')

                local response=$(curl -s -w "%{http_code}" \
                    -X POST \
                    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
                    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
                    -H "Content-Type: application/json" \
                    -d "$json_payload" \
                    "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/exec_sql" 2>/dev/null)

                local http_code="${response: -3}"

                if [[ "$http_code" -ne 200 ]]; then
                    log_error "SQL 执行失败 (HTTP $http_code)"
                    echo "${response%???}"
                    rm -f sql_chunk_*
                    exit 1
                fi

                rm -f "$chunk_file"
            fi
        done
    fi

    log_info "订阅系统数据库表初始化完成！"
    log_info "现在可以正常使用订阅功能了"
}

# 如果直接执行此脚本，则运行主函数
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi