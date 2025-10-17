#!/bin/bash

# VidFab 数据库迁移脚本
# 用途：管理数据库版本升级和迁移

set -e  # 遇到错误立即退出

# 颜色配置
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo "VidFab 数据库迁移工具"
    echo ""
    echo "用法:"
    echo "  $0 [选项] [命令]"
    echo ""
    echo "命令:"
    echo "  up              应用所有待执行的迁移"
    echo "  down            回滚最后一次迁移"
    echo "  status          显示当前迁移状态"
    echo "  create [name]   创建新的迁移文件"
    echo "  reset           重置数据库到初始状态"
    echo ""
    echo "选项:"
    echo "  -h, --help      显示此帮助信息"
    echo "  -v, --verbose   详细输出模式"
    echo "  --dry-run       仅显示将要执行的操作，不实际执行"
    echo ""
    echo "示例:"
    echo "  $0 up                    # 应用所有迁移"
    echo "  $0 create add_user_phone # 创建新迁移文件"
    echo "  $0 status                # 查看迁移状态"
}

# 检查环境变量
check_env() {
    log_debug "检查环境变量..."
    
    if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" ]]; then
        log_error "NEXT_PUBLIC_SUPABASE_URL 环境变量未设置"
        exit 1
    fi
    
    if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
        log_error "SUPABASE_SERVICE_ROLE_KEY 环境变量未设置"
        exit 1
    fi
    
    log_debug "环境变量检查通过"
}

# 创建迁移表（如果不存在）
create_migrations_table() {
    log_debug "创建迁移记录表..."
    
    local sql="
    CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT NOW()
    );
    "
    
    execute_sql "$sql"
}

# 执行SQL命令
execute_sql() {
    local sql_content=$1
    local description=${2:-"SQL命令"}
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] 将执行: $description"
        return 0
    fi
    
    log_debug "执行: $description"
    
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
    
    if [[ "$http_code" -ne 200 ]]; then
        log_error "SQL 执行失败 (HTTP $http_code): $description"
        exit 1
    fi
}

# 获取已执行的迁移
get_executed_migrations() {
    # 这里需要查询数据库获取已执行的迁移
    # 简化实现，返回空列表
    echo ""
}

# 获取待执行的迁移文件
get_pending_migrations() {
    local migrations_dir="scripts/migrations"
    
    if [[ ! -d "$migrations_dir" ]]; then
        echo ""
        return
    fi
    
    # 获取所有迁移文件，按版本号排序
    find "$migrations_dir" -name "*.sql" -type f | sort
}

# 应用迁移
migrate_up() {
    log_info "开始应用数据库迁移..."
    
    create_migrations_table
    
    local pending_migrations=$(get_pending_migrations)
    
    if [[ -z "$pending_migrations" ]]; then
        log_info "没有待执行的迁移"
        return
    fi
    
    for migration_file in $pending_migrations; do
        local version=$(basename "$migration_file" .sql)
        
        # 检查是否已经执行过
        local executed=$(execute_sql "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';" "检查迁移状态")
        
        if [[ "$executed" == "0" ]]; then
            log_info "应用迁移: $version"
            
            # 执行迁移文件
            local sql_content=$(cat "$migration_file")
            execute_sql "$sql_content" "迁移 $version"
            
            # 记录迁移
            execute_sql "INSERT INTO schema_migrations (version) VALUES ('$version');" "记录迁移 $version"
            
            log_info "迁移 $version 完成"
        else
            log_debug "迁移 $version 已经执行过，跳过"
        fi
    done
    
    log_info "所有迁移应用完成"
}

# 回滚迁移
migrate_down() {
    log_warn "回滚功能尚未实现"
    log_warn "请手动处理数据库回滚"
}

# 显示迁移状态
show_status() {
    log_info "数据库迁移状态:"
    
    create_migrations_table
    
    local pending_migrations=$(get_pending_migrations)
    
    if [[ -n "$pending_migrations" ]]; then
        echo "待执行的迁移:"
        for migration_file in $pending_migrations; do
            local version=$(basename "$migration_file" .sql)
            echo "  - $version"
        done
    else
        echo "没有待执行的迁移"
    fi
}

# 创建新迁移文件
create_migration() {
    local name=$1
    
    if [[ -z "$name" ]]; then
        log_error "请提供迁移名称"
        log_info "用法: $0 create <migration_name>"
        exit 1
    fi
    
    # 创建迁移目录
    local migrations_dir="scripts/migrations"
    mkdir -p "$migrations_dir"
    
    # 生成时间戳版本号
    local timestamp=$(date +"%Y%m%d%H%M%S")
    local filename="${timestamp}_${name}.sql"
    local filepath="${migrations_dir}/${filename}"
    
    # 创建迁移文件模板
    cat > "$filepath" << EOF
-- 迁移: $name
-- 创建时间: $(date)
-- 说明: [请在此处添加迁移说明]

-- 向上迁移 (应用此迁移)
-- 在这里添加你的 SQL 语句

-- 示例:
-- ALTER TABLE users ADD COLUMN phone VARCHAR(20);
-- CREATE INDEX idx_users_phone ON users(phone);

-- 注意: 请确保所有语句都是幂等的（可以重复执行）
EOF
    
    log_info "创建新迁移文件: $filepath"
    log_info "请编辑该文件添加你的 SQL 语句"
}

# 重置数据库
reset_database() {
    log_warn "这将删除所有数据库表和数据！"
    read -p "确定要继续吗? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "操作已取消"
        exit 0
    fi
    
    log_info "重置数据库..."
    
    # 删除所有表（谨慎操作）
    local reset_sql="
    DROP TABLE IF EXISTS payments CASCADE;
    DROP TABLE IF EXISTS subscriptions CASCADE;
    DROP TABLE IF EXISTS video_jobs CASCADE;
    DROP TABLE IF EXISTS verification_codes CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS schema_migrations CASCADE;
    "
    
    execute_sql "$reset_sql" "重置数据库"
    
    log_info "数据库重置完成"
    log_info "请运行 './scripts/setup-database.sh' 重新初始化数据库"
}

# 主执行函数
main() {
    local command=""
    local name=""
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--verbose)
                set -x
                shift
                ;;
            --dry-run)
                DRY_RUN="true"
                log_info "运行在 DRY RUN 模式"
                shift
                ;;
            up|down|status|reset)
                command=$1
                shift
                ;;
            create)
                command=$1
                shift
                if [[ $# -gt 0 ]]; then
                    name=$1
                    shift
                fi
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 如果没有指定命令，显示帮助
    if [[ -z "$command" ]]; then
        show_help
        exit 1
    fi
    
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
        log_debug "加载环境变量文件 .env.local"
        export $(grep -v '^#' .env.local | xargs)
    fi
    
    # 执行检查（除了 create 命令）
    if [[ "$command" != "create" ]]; then
        check_env
    fi
    
    # 执行相应命令
    case $command in
        up)
            migrate_up
            ;;
        down)
            migrate_down
            ;;
        status)
            show_status
            ;;
        create)
            create_migration "$name"
            ;;
        reset)
            reset_database
            ;;
        *)
            log_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 如果直接执行此脚本，则运行主函数
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi