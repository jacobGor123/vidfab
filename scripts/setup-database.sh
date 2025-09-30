#!/bin/bash

# VidFab 数据库初始化脚本
# 用途：初始化 Supabase 数据库，创建所有必要的表和配置

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

# 检查环境变量
check_env() {
    log_info "检查环境变量..."
    
    if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" ]]; then
        log_error "NEXT_PUBLIC_SUPABASE_URL 环境变量未设置"
        exit 1
    fi
    
    if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
        log_error "SUPABASE_SERVICE_ROLE_KEY 环境变量未设置"
        exit 1
    fi
    
    log_info "环境变量检查通过"
}

# 检查数据库连接
check_connection() {
    log_info "测试数据库连接..."
    
    # 使用 curl 测试 Supabase API 连接
    if ! curl -s -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
         -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
         "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" > /dev/null; then
        log_error "无法连接到 Supabase 数据库"
        exit 1
    fi
    
    log_info "数据库连接测试成功"
}

# 执行SQL文件
execute_sql() {
    local sql_file=$1
    log_info "执行 SQL 文件: $sql_file"
    
    if [[ ! -f "$sql_file" ]]; then
        log_error "SQL 文件不存在: $sql_file"
        exit 1
    fi
    
    # 使用 Supabase REST API 执行 SQL
    # 注意：这里需要将 SQL 文件内容作为 JSON 发送
    local sql_content=$(cat "$sql_file")
    
    # 构建 JSON payload
    local json_payload=$(jq -n --arg query "$sql_content" '{query: $query}')
    
    # 发送请求到 Supabase
    local response=$(curl -s -w "%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -d "$json_payload" \
        "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/exec_sql" 2>/dev/null)
    
    local http_code="${response: -3}"
    local response_body="${response%???}"
    
    if [[ "$http_code" -eq 200 ]]; then
        log_info "SQL 执行成功"
    else
        log_error "SQL 执行失败 (HTTP $http_code)"
        echo "$response_body"
        exit 1
    fi
}

# 主执行函数
main() {
    log_info "开始初始化 VidFab 数据库..."
    
    # 检查依赖
    if ! command -v curl &> /dev/null; then
        log_error "curl 命令未找到，请安装 curl"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_error "jq 命令未找到，请安装 jq"
        exit 1
    fi
    
    # 加载环境变量
    if [[ -f ".env.local" ]]; then
        log_info "加载环境变量文件 .env.local"
        export $(grep -v '^#' .env.local | xargs)
    fi
    
    # 执行检查
    check_env
    check_connection
    
    # 执行数据库初始化
    local schema_file="lib/database-schema.sql"
    if [[ -f "$schema_file" ]]; then
        execute_sql "$schema_file"
    else
        log_error "数据库 schema 文件不存在: $schema_file"
        exit 1
    fi
    
    log_info "数据库初始化完成！"
    log_info "接下来可以运行 ./scripts/seed-database.sh 来添加初始数据"
}

# 如果直接执行此脚本，则运行主函数
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi