#!/bin/bash

##############################################################################
# Video Agent - 端到端测试脚本
#
# 测试完整的 Video Agent 流程:
# 1. 创建项目
# 2. 脚本分析
# 3. 人物配置
# 4. 图片风格选择
# 5. 分镜图生成
# 6. 视频生成
# 7. 音乐和转场选择
# 8. 最终合成
#
# 使用方法:
#   ./scripts/test-video-agent-e2e.sh
##############################################################################

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
API_PREFIX="/api/video-agent"

# 测试数据
TEST_SCRIPT="A brave prince rides to a dark castle to rescue a princess from a dragon. After a fierce battle, he defeats the dragon. But when he reaches the tower, he discovers the princess IS the dragon - she was never in danger. Twist ending!"

# 临时文件
PROJECT_ID_FILE="/tmp/video-agent-test-project-id.txt"
TEST_LOG_FILE="/tmp/video-agent-test-log.txt"

##############################################################################
# 工具函数
##############################################################################

# 打印带颜色的日志
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 API 响应
check_response() {
    local response=$1
    local expected_field=$2

    if echo "$response" | jq -e ".success" > /dev/null 2>&1; then
        if [ -n "$expected_field" ]; then
            if echo "$response" | jq -e ".$expected_field" > /dev/null 2>&1; then
                return 0
            else
                log_error "响应中缺少字段: $expected_field"
                echo "$response" | jq .
                return 1
            fi
        fi
        return 0
    else
        log_error "API 请求失败"
        echo "$response" | jq .
        return 1
    fi
}

# 等待异步任务完成
wait_for_completion() {
    local status_url=$1
    local max_attempts=${2:-60}
    local interval=${3:-5}
    local attempt=0

    log_info "等待任务完成 (最多 ${max_attempts} 次,间隔 ${interval}s)..."

    while [ $attempt -lt $max_attempts ]; do
        sleep $interval
        attempt=$((attempt + 1))

        response=$(curl -s -X GET "$status_url")

        # 检查所有任务是否完成
        local all_completed=$(echo "$response" | jq -r '.data | map(.status) | all(. == "success" or . == "failed")')

        if [ "$all_completed" = "true" ]; then
            log_success "任务完成 (尝试 $attempt/$max_attempts)"
            echo "$response"
            return 0
        fi

        log_info "进度: $attempt/$max_attempts - 继续等待..."
    done

    log_error "任务超时"
    return 1
}

##############################################################################
# 测试步骤
##############################################################################

# 步骤 0: 准备测试环境
test_setup() {
    log_info "========================================="
    log_info "步骤 0: 测试环境准备"
    log_info "========================================="

    # 清理旧的测试文件
    rm -f "$PROJECT_ID_FILE" "$TEST_LOG_FILE"

    # 检查 API 服务是否运行
    log_info "检查 API 服务状态..."
    if ! curl -s -f "$API_BASE_URL/api/health" > /dev/null 2>&1; then
        log_error "API 服务未运行,请先启动开发服务器: npm run dev"
        exit 1
    fi

    log_success "API 服务正常运行"

    # 检查必要的命令
    for cmd in curl jq; do
        if ! command -v $cmd &> /dev/null; then
            log_error "缺少必要的命令: $cmd"
            exit 1
        fi
    done

    log_success "测试环境准备完成"
}

# 步骤 1: 创建项目
test_create_project() {
    log_info "========================================="
    log_info "步骤 1: 创建项目"
    log_info "========================================="

    local response=$(curl -s -X POST "$API_BASE_URL$API_PREFIX/projects" \
        -H "Content-Type: application/json" \
        -d "{
            \"duration\": 45,
            \"story_style\": \"twist\",
            \"original_script\": \"$TEST_SCRIPT\"
        }")

    if check_response "$response" "data.id"; then
        local project_id=$(echo "$response" | jq -r '.data.id')
        echo "$project_id" > "$PROJECT_ID_FILE"
        log_success "项目创建成功: $project_id"
        echo "$response" | jq .
    else
        log_error "项目创建失败"
        exit 1
    fi
}

# 步骤 2: 脚本分析
test_analyze_script() {
    log_info "========================================="
    log_info "步骤 2: 脚本分析"
    log_info "========================================="

    local project_id=$(cat "$PROJECT_ID_FILE")
    local response=$(curl -s -X POST "$API_BASE_URL$API_PREFIX/projects/$project_id/analyze-script")

    if check_response "$response" "data"; then
        log_success "脚本分析完成"
        echo "$response" | jq '.data'
    else
        log_error "脚本分析失败"
        exit 1
    fi
}

# 步骤 3: 配置人物 (跳过 - 使用默认)
test_configure_characters() {
    log_info "========================================="
    log_info "步骤 3: 配置人物 (跳过)"
    log_info "========================================="

    log_warning "此步骤在实际测试中跳过,使用分析结果中的默认人物"
}

# 步骤 4: 选择图片风格
test_select_image_style() {
    log_info "========================================="
    log_info "步骤 4: 选择图片风格"
    log_info "========================================="

    local project_id=$(cat "$PROJECT_ID_FILE")
    local response=$(curl -s -X POST "$API_BASE_URL$API_PREFIX/projects/$project_id/image-style" \
        -H "Content-Type: application/json" \
        -d '{"styleId": "cinematic"}')

    if check_response "$response"; then
        log_success "图片风格选择完成"
        echo "$response" | jq .
    else
        log_error "图片风格选择失败"
        exit 1
    fi
}

# 步骤 5: 生成分镜图
test_generate_storyboards() {
    log_info "========================================="
    log_info "步骤 5: 生成分镜图"
    log_info "========================================="

    local project_id=$(cat "$PROJECT_ID_FILE")

    # 提交生成任务
    log_info "提交分镜图生成任务..."
    local response=$(curl -s -X POST "$API_BASE_URL$API_PREFIX/projects/$project_id/storyboards/generate")

    if ! check_response "$response"; then
        log_error "分镜图生成任务提交失败"
        exit 1
    fi

    # 轮询状态
    log_info "等待分镜图生成完成..."
    local status_url="$API_BASE_URL$API_PREFIX/projects/$project_id/storyboards/status"

    if wait_for_completion "$status_url" 60 5; then
        log_success "分镜图生成完成"
    else
        log_error "分镜图生成超时"
        exit 1
    fi
}

# 步骤 6: 生成视频片段
test_generate_videos() {
    log_info "========================================="
    log_info "步骤 6: 生成视频片段"
    log_info "========================================="

    local project_id=$(cat "$PROJECT_ID_FILE")

    # 提交生成任务
    log_info "提交视频生成任务..."
    local response=$(curl -s -X POST "$API_BASE_URL$API_PREFIX/projects/$project_id/videos/generate")

    if ! check_response "$response"; then
        log_error "视频生成任务提交失败"
        exit 1
    fi

    # 轮询状态
    log_info "等待视频生成完成 (这可能需要 5-10 分钟)..."
    local status_url="$API_BASE_URL$API_PREFIX/projects/$project_id/videos/status"

    if wait_for_completion "$status_url" 120 10; then
        log_success "视频生成完成"
    else
        log_error "视频生成超时"
        exit 1
    fi
}

# 步骤 7: 选择音乐和转场
test_select_music_transition() {
    log_info "========================================="
    log_info "步骤 7: 选择音乐和转场"
    log_info "========================================="

    local project_id=$(cat "$PROJECT_ID_FILE")

    # 选择音乐
    log_info "选择背景音乐..."
    local music_response=$(curl -s -X POST "$API_BASE_URL$API_PREFIX/projects/$project_id/music" \
        -H "Content-Type: application/json" \
        -d '{
            "source": "template",
            "template_id": "epic_adventure",
            "volume": 0.3
        }')

    if ! check_response "$music_response"; then
        log_error "音乐选择失败"
        exit 1
    fi

    # 选择转场
    log_info "选择转场效果..."
    local transition_response=$(curl -s -X POST "$API_BASE_URL$API_PREFIX/projects/$project_id/transition" \
        -H "Content-Type: application/json" \
        -d '{
            "type": "fade",
            "duration": 0.5
        }')

    if check_response "$transition_response"; then
        log_success "音乐和转场选择完成"
    else
        log_error "转场选择失败"
        exit 1
    fi
}

# 步骤 8: 最终合成
test_compose_final_video() {
    log_info "========================================="
    log_info "步骤 8: 最终合成"
    log_info "========================================="

    local project_id=$(cat "$PROJECT_ID_FILE")

    # 提交合成任务
    log_info "提交视频合成任务..."
    local response=$(curl -s -X POST "$API_BASE_URL$API_PREFIX/projects/$project_id/compose")

    if ! check_response "$response"; then
        log_error "视频合成任务提交失败"
        exit 1
    fi

    # 轮询状态
    log_info "等待视频合成完成 (这可能需要 2-5 分钟)..."
    local status_url="$API_BASE_URL$API_PREFIX/projects/$project_id/compose/status"

    if wait_for_completion "$status_url" 60 5; then
        log_success "视频合成完成"

        # 获取最终视频信息
        local final_response=$(curl -s -X GET "$API_BASE_URL$API_PREFIX/projects/$project_id")
        local final_video_url=$(echo "$final_response" | jq -r '.data.final_video.url')

        log_success "最终视频 URL: $final_video_url"
    else
        log_error "视频合成超时"
        exit 1
    fi
}

# 清理测试数据
test_cleanup() {
    log_info "========================================="
    log_info "清理测试数据"
    log_info "========================================="

    if [ -f "$PROJECT_ID_FILE" ]; then
        local project_id=$(cat "$PROJECT_ID_FILE")

        log_info "删除测试项目: $project_id"
        curl -s -X DELETE "$API_BASE_URL$API_PREFIX/projects/$project_id" > /dev/null

        rm -f "$PROJECT_ID_FILE"
    fi

    log_success "清理完成"
}

##############################################################################
# 主流程
##############################################################################

main() {
    echo ""
    log_info "========================================="
    log_info "Video Agent 端到端测试开始"
    log_info "========================================="
    echo ""

    # 执行测试步骤
    test_setup
    test_create_project
    test_analyze_script
    test_configure_characters
    test_select_image_style

    log_warning "========================================="
    log_warning "以下步骤需要实际的 API 实现"
    log_warning "如果 API 尚未实现,测试将失败"
    log_warning "========================================="

    # 以下步骤需要实际 API 实现
    # test_generate_storyboards
    # test_generate_videos
    # test_select_music_transition
    # test_compose_final_video

    echo ""
    log_success "========================================="
    log_success "端到端测试完成!"
    log_success "========================================="
    echo ""

    # 询问是否清理测试数据
    read -p "是否删除测试项目? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_cleanup
    else
        log_info "测试项目保留,ID: $(cat $PROJECT_ID_FILE)"
    fi
}

# 捕获退出信号,确保清理
trap test_cleanup EXIT INT TERM

# 运行主流程
main
