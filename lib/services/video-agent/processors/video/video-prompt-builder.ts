/**
 * Video Analyzer - Prompt 构建器
 */

import { UNIFIED_SEGMENT_DURATION, SHOT_COUNT_MAP, STYLE_GUIDES } from '../script/constants'

/**
 * 获取剧情风格指南
 */
function getStyleGuide(storyStyle: string): string {
  return STYLE_GUIDES[storyStyle] || STYLE_GUIDES.auto
}

/**
 * 构建视频分析 Prompt
 */
export function buildVideoAnalysisPrompt(
  duration: number,
  storyStyle: string
): string {
  // 基于统一 5 秒时长计算分镜数量
  const shotCount = SHOT_COUNT_MAP[duration] || Math.ceil(duration / UNIFIED_SEGMENT_DURATION)
  const avgShotDuration = UNIFIED_SEGMENT_DURATION

  return `# 任务: 视频分析与脚本重构

你是一位经验丰富的视频导演和分镜师。请仔细观看这个视频，分析其内容，然后生成一个可重新创作的专业分镜脚本。

## 分析要求

### 1. 视频内容分析
仔细观看视频，提取以下信息：
- **视觉元素**: 场景、人物、物体、动作、构图
- **音频内容**: 对话、旁白、背景音乐、音效
- **叙事结构**: 故事线、情节发展、高潮、结尾
- **情绪氛围**: 每个场景的情感基调

### 2. 脚本重构
基于视频内容，生成一个改编脚本：
- **目标时长**: ${duration} 秒
- **剧情风格**: ${storyStyle}
- **改编原则**:
  - 保留核心创意和关键情节
  - 可以简化或调整细节
  - 确保叙事连贯性
  - 适配目标时长

${getStyleGuide(storyStyle)}

### 3. 人物角色提取
- 识别视频中所有出现的命名实体作为角色
- 包括：人类、动物、机器人、生物、怪物、虚拟角色等
- 使用简洁明确的英文名称（如 "Young Man", "Cat", "Robot"）
- 如果某个实体在多个镜头中出现，必须使用完全相同的名称

### 4. 分镜拆分
- 拆分为 **恰好 ${shotCount} 个分镜**
- 每个分镜时长约 ${avgShotDuration} 秒
- 确保时间范围连续且不重叠（如 "0-5s", "5-10s"）
- 每个分镜应该是一个独立的视觉单元

### 5. 分镜描述要求

为每个分镜提供以下详细信息：

**a) description (场景视觉描述)**
- 用英文描述场景的核心视觉元素
- 包含环境、人物位置、主要物体
- 具体且可视化（避免抽象概念）
- 示例: "A young woman standing at a bus stop in the rain, holding a red umbrella"

**b) camera_angle (镜头角度)**
- 镜头类型: Wide shot / Medium shot / Close-up / Extreme close-up / Over-the-shoulder
- 摄像机角度: Eye level / High angle / Low angle / Bird's eye view / Dutch angle
- 示例: "Medium shot, eye level"

**c) character_action (角色动作)**
- 描述角色的具体动作和行为
- 用英文，动词清晰
- 示例: "Looking at her watch nervously, then glancing down the street"

**d) characters (出现的角色)**
- 列出该分镜中出现的所有角色名称
- 使用与全局角色列表完全一致的名称
- 即使角色只是在背景中出现或被提及，也必须列出
- 只有在没有任何命名实体时才返回空数组

**e) mood (情绪氛围)**
- 用 2-4 个英文形容词描述场景的情绪基调
- 示例: "Anxious and hopeful" / "Mysterious and tense" / "Warm and nostalgic"

**f) duration_seconds (分镜时长)**
- 该分镜的持续时间（秒）
- 所有分镜时长之和必须等于 ${duration} 秒

## 输出格式

**严格的 JSON 格式，不要包含任何 markdown 标记、代码块符号或额外说明文字：**

{
  "duration": ${duration},
  "shot_count": ${shotCount},
  "story_style": "${storyStyle}",
  "characters": ["Character1", "Character2"],
  "shots": [
    {
      "shot_number": 1,
      "time_range": "0-${avgShotDuration}s",
      "description": "Detailed visual description in English",
      "camera_angle": "Shot type and camera angle",
      "character_action": "Specific character action in English",
      "characters": ["Character1"],
      "mood": "Emotional tone",
      "duration_seconds": ${avgShotDuration}
    }
  ]
}

**重要提示:**
- 直接输出纯 JSON，不要用 \\\`\\\`\\\`json 包裹
- 确保 JSON 格式正确，可以被直接解析
- 所有描述字段必须是英文
- 时间范围必须连续且总和为 ${duration} 秒
- 确保每个分镜的 characters 数组包含该分镜中提到的所有命名实体
- 全局 characters 列表必须包含所有分镜中出现的所有角色（去重）`
}
