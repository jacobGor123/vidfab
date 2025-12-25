/**
 * Script Analyzer - Prompt 构建器
 */

import { UNIFIED_SEGMENT_DURATION, SHOT_COUNT_MAP, STYLE_GUIDES } from './constants'

/**
 * 获取剧情风格指南
 */
export function getStyleGuide(storyStyle: string): string {
  return STYLE_GUIDES[storyStyle] || STYLE_GUIDES.auto
}

/**
 * 脚本分析 Prompt 模板
 */
export function buildScriptAnalysisPrompt(
  userScript: string,
  duration: number,
  storyStyle: string
): string {
  // 🔥 基于统一 5 秒时长计算分镜数量
  const shotCount = SHOT_COUNT_MAP[duration] || Math.ceil(duration / UNIFIED_SEGMENT_DURATION)

  // 🔥 每个分镜固定为 5 秒
  const avgShotDuration = UNIFIED_SEGMENT_DURATION

  return `# 任务: 专业视频分镜脚本生成

你是一位经验丰富的视频导演和分镜师。请根据用户提供的脚本，生成专业的视频分镜脚本。

## 用户输入
- **原始脚本**: "${userScript}"
- **视频总时长**: ${duration} 秒
- **剧情风格**: ${storyStyle}
- **分镜数量**: ${shotCount} 个

## 任务要求

### 1. 脚本分析与优化
根据剧情风格 "${storyStyle}" 优化和延伸脚本内容:

${getStyleGuide(storyStyle)}

### 2. 人物角色提取
- **重要：识别脚本中所有出现的命名实体作为角色**
- 包括：人类、动物、机器人、生物、怪物、虚拟角色等任何有名称的实体
- 使用简洁明确的英文名称（如 "Young Man", "Elderly Woman", "Robot", "Cat", "Creature"）
- 如果某个实体在多个镜头中出现，必须使用完全相同的名称
- 只有在完全没有命名实体时才可以省略

### 3. 分镜拆分规则
- 将脚本拆分为 **恰好 ${shotCount} 个分镜**
- 每个分镜时长约 ${avgShotDuration} 秒（可根据剧情需要微调，但总时长必须为 ${duration} 秒）
- 确保时间范围连续且不重叠（如 "0-5s", "5-10s"）
- 每个分镜应该是一个独立的视觉单元，避免过于复杂的场景切换

### 4. 分镜描述要求
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
- **重要：仔细检查 description 中提到的所有命名实体**
- 列出该分镜中出现的所有角色名称（包括人类、动物、生物、机器人等）
- 使用与全局角色列表（characters 字段）完全一致的名称
- 即使角色只是在背景中出现或被提及，也必须列出
- 示例：如果 description 是 "A man and a cat looking at a robot"，则 characters 应该是 ["Man", "Cat", "Robot"]
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
- **关键：确保每个分镜的 characters 数组包含该分镜 description 中提到的所有命名实体**
- **全局 characters 列表必须包含所有分镜中出现的所有角色（去重）**`
}
