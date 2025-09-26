#!/bin/bash

# VidFab 数据库初始数据填充脚本
# 用途：为开发和测试环境填充初始数据

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
    echo "VidFab 数据库数据填充工具"
    echo ""
    echo "用法:"
    echo "  $0 [选项] [环境]"
    echo ""
    echo "环境:"
    echo "  development     开发环境数据（默认）"
    echo "  testing         测试环境数据"
    echo "  demo            演示环境数据"
    echo ""
    echo "选项:"
    echo "  -h, --help      显示此帮助信息"
    echo "  -v, --verbose   详细输出模式"
    echo "  --dry-run       仅显示将要执行的操作，不实际执行"
    echo "  --clean         清空现有数据后再填充"
    echo ""
    echo "示例:"
    echo "  $0 development   # 填充开发环境数据"
    echo "  $0 --clean demo  # 清空后填充演示数据"
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

# 清空现有数据
clean_data() {
    log_warn "清空现有数据..."
    
    local clean_sql="
    -- 清空所有表数据（保留表结构）
    TRUNCATE payments CASCADE;
    TRUNCATE subscriptions CASCADE;
    TRUNCATE video_jobs CASCADE;
    TRUNCATE verification_codes CASCADE;
    TRUNCATE users CASCADE;
    
    -- 重置序列
    ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS video_jobs_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS subscriptions_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS payments_id_seq RESTART WITH 1;
    "
    
    execute_sql "$clean_sql" "清空数据表"
    log_info "数据清空完成"
}

# 填充开发环境数据
seed_development() {
    log_info "填充开发环境数据..."
    
    local dev_sql="
    -- 插入测试用户
    INSERT INTO users (
        uuid, email, nickname, avatar_url, signin_type, signin_provider,
        signin_openid, email_verified, subscription_status, subscription_plan,
        credits_remaining, total_videos_processed, storage_used_mb, max_storage_mb
    ) VALUES 
    (
        gen_random_uuid(),
        'dev@vidfab.ai',
        '开发者',
        'https://avatar.vidfab.ai/dev.png',
        'credentials',
        'email',
        NULL,
        TRUE,
        'active',
        'pro',
        100,
        5,
        256,
        10240
    ),
    (
        gen_random_uuid(),
        'test@vidfab.ai', 
        '测试用户',
        NULL,
        'credentials',
        'email',
        NULL,
        TRUE,
        'inactive',
        'basic',
        10,
        0,
        0,
        1024
    ),
    (
        gen_random_uuid(),
        'demo@vidfab.ai',
        'Demo用户',
        'https://avatar.vidfab.ai/demo.png',
        'oauth',
        'google',
        'google_demo_123',
        TRUE,
        'active',
        'enterprise',
        500,
        25,
        1024,
        51200
    );
    
    -- 插入一些示例视频任务
    INSERT INTO video_jobs (
        user_uuid, job_type, status, input_data, output_data,
        credits_used, completed_at
    ) 
    SELECT 
        u.uuid,
        'generate',
        'completed',
        '{\"prompt\": \"一只可爱的小猫在花园里玩耍\", \"duration\": 10, \"style\": \"anime\"}',
        '{\"video_url\": \"https://videos.vidfab.ai/cat_garden.mp4\", \"thumbnail\": \"https://videos.vidfab.ai/thumbnails/cat_garden.jpg\"}',
        5,
        NOW() - INTERVAL '2 hours'
    FROM users u WHERE u.email = 'dev@vidfab.ai';
    
    INSERT INTO video_jobs (
        user_uuid, job_type, status, input_data, credits_used
    ) 
    SELECT 
        u.uuid,
        'enhance',
        'processing',
        '{\"video_url\": \"https://upload.vidfab.ai/original.mp4\", \"enhancement_type\": \"upscale_4k\"}',
        10
    FROM users u WHERE u.email = 'demo@vidfab.ai';
    
    -- 插入订阅记录
    INSERT INTO subscriptions (
        user_uuid, stripe_subscription_id, stripe_customer_id,
        status, plan_id, current_period_start, current_period_end
    ) 
    SELECT 
        u.uuid,
        'sub_dev_' || substr(md5(random()::text), 1, 8),
        'cus_dev_' || substr(md5(random()::text), 1, 8),
        'active',
        'pro_monthly',
        DATE_TRUNC('month', CURRENT_DATE),
        DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    FROM users u WHERE u.email = 'dev@vidfab.ai';
    
    -- 插入支付记录
    INSERT INTO payments (
        user_uuid, stripe_payment_intent_id, amount, currency,
        status, description
    ) 
    SELECT 
        u.uuid,
        'pi_dev_' || substr(md5(random()::text), 1, 12),
        2999, -- $29.99
        'USD',
        'succeeded',
        'Pro Plan - Monthly Subscription'
    FROM users u WHERE u.email = 'dev@vidfab.ai';
    "
    
    execute_sql "$dev_sql" "插入开发环境数据"
    log_info "开发环境数据填充完成"
}

# 填充测试环境数据
seed_testing() {
    log_info "填充测试环境数据..."
    
    local test_sql="
    -- 插入测试专用用户
    INSERT INTO users (
        uuid, email, nickname, signin_type, signin_provider,
        email_verified, subscription_status, subscription_plan,
        credits_remaining
    ) VALUES 
    (
        '00000000-0000-0000-0000-000000000001',
        'test1@example.com',
        '测试用户1',
        'credentials',
        'email',
        TRUE,
        'active',
        'basic',
        50
    ),
    (
        '00000000-0000-0000-0000-000000000002',
        'test2@example.com',
        '测试用户2',
        'credentials',
        'email',
        FALSE,
        'inactive',
        'basic',
        10
    );
    
    -- 插入测试验证码（用于自动化测试）
    INSERT INTO verification_codes (
        email, code, expires_at, attempts
    ) VALUES 
    (
        'test1@example.com',
        '123456',
        NOW() + INTERVAL '10 minutes',
        0
    ),
    (
        'test2@example.com', 
        '654321',
        NOW() + INTERVAL '10 minutes',
        0
    );
    "
    
    execute_sql "$test_sql" "插入测试环境数据"
    log_info "测试环境数据填充完成"
}

# 填充演示环境数据  
seed_demo() {
    log_info "填充演示环境数据..."
    
    local demo_sql="
    -- 插入演示用户
    INSERT INTO users (
        uuid, email, nickname, avatar_url, signin_type, signin_provider,
        email_verified, subscription_status, subscription_plan,
        credits_remaining, total_videos_processed, storage_used_mb
    ) VALUES 
    (
        gen_random_uuid(),
        'alice.demo@vidfab.ai',
        'Alice Johnson',
        'https://i.pravatar.cc/150?img=1',
        'oauth',
        'google',
        TRUE,
        'active',
        'pro',
        75,
        12,
        512
    ),
    (
        gen_random_uuid(),
        'bob.demo@vidfab.ai',
        'Bob Smith',
        'https://i.pravatar.cc/150?img=2',
        'oauth',
        'google',
        TRUE,
        'active',
        'enterprise',
        200,
        45,
        2048
    ),
    (
        gen_random_uuid(),
        'carol.demo@vidfab.ai',
        'Carol Davis',
        'https://i.pravatar.cc/150?img=3',
        'credentials',
        'email',
        TRUE,
        'inactive',
        'basic',
        3,
        2,
        128
    );
    
    -- 插入演示视频项目
    INSERT INTO video_jobs (
        user_uuid, job_type, status, input_data, output_data,
        credits_used, completed_at
    ) 
    SELECT 
        u.uuid,
        (ARRAY['generate', 'enhance', 'convert'])[floor(random() * 3 + 1)],
        (ARRAY['completed', 'processing', 'failed'])[floor(random() * 3 + 1)],
        format('{\"prompt\": \"Demo video %s\", \"style\": \"realistic\"}', floor(random() * 100)),
        CASE 
            WHEN random() > 0.3 THEN format('{\"video_url\": \"https://demo.vidfab.ai/video_%s.mp4\"}', floor(random() * 100))
            ELSE NULL 
        END,
        floor(random() * 20 + 1),
        CASE 
            WHEN random() > 0.4 THEN NOW() - (random() * INTERVAL '30 days')
            ELSE NULL 
        END
    FROM users u 
    CROSS JOIN generate_series(1, 3) 
    WHERE u.email LIKE '%.demo@vidfab.ai';
    "
    
    execute_sql "$demo_sql" "插入演示环境数据"
    log_info "演示环境数据填充完成"
}

# 显示填充结果统计
show_statistics() {
    log_info "数据填充统计:"
    
    local stats_sql="
    SELECT 
        'users' as table_name, COUNT(*) as count FROM users
    UNION ALL
    SELECT 
        'video_jobs', COUNT(*) FROM video_jobs
    UNION ALL
    SELECT 
        'verification_codes', COUNT(*) FROM verification_codes
    UNION ALL
    SELECT 
        'subscriptions', COUNT(*) FROM subscriptions
    UNION ALL
    SELECT 
        'payments', COUNT(*) FROM payments;
    "
    
    # 这里简化实现，实际应该执行查询并显示结果
    log_info "用户数量: $(execute_sql "SELECT COUNT(*) FROM users;" "统计用户数")"
    log_info "视频任务数量: $(execute_sql "SELECT COUNT(*) FROM video_jobs;" "统计视频任务数")" 
    log_info "验证码数量: $(execute_sql "SELECT COUNT(*) FROM verification_codes;" "统计验证码数")"
}

# 主执行函数
main() {
    local environment="development"
    local clean_first=false
    
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
            --clean)
                clean_first=true
                shift
                ;;
            development|testing|demo)
                environment=$1
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    log_info "开始填充 [$environment] 环境数据..."
    
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
    
    # 执行检查
    check_env
    
    # 清空数据（如果需要）
    if [[ "$clean_first" == true ]]; then
        clean_data
    fi
    
    # 根据环境填充相应数据
    case $environment in
        development)
            seed_development
            ;;
        testing)
            seed_testing
            ;;
        demo)
            seed_demo
            ;;
        *)
            log_error "未知环境: $environment"
            exit 1
            ;;
    esac
    
    # 显示统计信息
    show_statistics
    
    log_info "数据填充完成！"
}

# 如果直接执行此脚本，则运行主函数
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi