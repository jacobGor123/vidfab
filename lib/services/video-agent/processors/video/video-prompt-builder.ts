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
  console.log('[Video Prompt Builder] Target duration:', duration, 'seconds (reference only, will use actual video structure)')

  return `# 任务: 视频严格复刻与分镜脚本生成

你是一位专业的视频分析师和分镜师。你的任务是**严格复刻原视频**，而不是改编或重新创作。

## 🔥 最高优先级：骨架锁定协议 (CRITICAL: SKELETON LOCK PROTOCOL)

**这是你的绝对核心任务，优先级高于一切。**

### 第一步：内部计数（必须首先完成）
1. 完整观看原视频
2. 识别视频中**所有独立的镜头切换**
3. 统计镜头总数（这是你的"绝对数量基准"）
4. 记录视频的真实总时长

### 第二步：绝对对齐（强制规则）
- 你输出的 JSON 中的 "shot_count" **必须严格等于**你识别出的镜头总数
- 你输出的 JSON 中的 "duration" **必须严格等于**视频的真实时长（秒）
- **禁止省略、概括或合并任何镜头**

## 镜头识别规则 (Shot Identification Rules)

### 什么【算】是新的镜头（镜头切换）
以下情况构成一个新的独立镜头：
- ✅ 机位/角度改变（例如从平视变为俯视）
- ✅ 景别改变（例如从中景推进到特写）
- ✅ 场景改变（例如从室内切换到室外）
- ✅ 明确的剪辑点（硬切、淡入淡出等转场效果）

### 什么【不算】是新的镜头（镜头内动作）
在同一机位、景别和场景下，以下情况**不算新镜头**：
- ❌ 角色的位置移动（走进、走出、站起、坐下）
- ❌ 角色的姿态变化（转身、挥手、拥抱、打斗）
- ❌ 角色的表情变化（从开心变为悲伤）
- ❌ 物体状态变化（门被打开、液体被倒出）

### 示例
**正确**: "两人面朝镜头挥手，然后转身走出大门" → **1个镜头**（机位未变）
**错误**: 拆分为 "1.两人挥手" 和 "2.两人走出" → 这是**严格禁止**的

## 开场绝对复刻原则 (Opening Replication Principle)

原视频的**前3个镜头**必须进行像素级复刻：
- 精确描述每一帧的画面细节
- 保留原始的机位、景别、构图
- 不做任何简化或概括

## 分析要求

### 1. 视频内容分析
仔细观看视频，提取以下信息：
- **视觉元素**: 场景、人物、物体、动作、构图
- **音频内容**: 对话、旁白、背景音乐、音效
- **叙事结构**: 故事线、情节发展、高潮、结尾
- **情绪氛围**: 每个场景的情感基调

### 2. 人物角色提取与命名协议
**首次出现时**：
- 为主要角色创建一个简短的英文名称（如 "Rumi", "Kenji"）
- 记录详细特征描述（人种、年龄、服装、配饰等）
- 格式："名称 (特征描述)"
- 示例："Rumi (Indian woman, 20s, long black hair, wearing faded blue kurta)"

**后续出现时**：
- 在该镜头的 "characters" 数组中，使用完整格式
- 在 "description" 和 "character_action" 中，只使用名称

**路人处理**：
- 使用泛指："a passerby", "several police officers in uniform"

### 3. 分镜拆分（严格按原视频结构）
- **禁止**使用固定时长或固定数量
- 必须按原视频的**真实镜头切换**来拆分
- 每个镜头的时长必须符合原视频的实际时长
- 时间范围必须连续且不重叠

### 4. 分镜描述要求

为每个分镜提供以下详细信息：

**a) description (场景视觉描述)**
- **描述"起幅画面"**：只描述该镜头的**第一帧静态画面**
- **禁止描述过程**：不要描述"试图"、"准备"、"想要"等意图
- **禁止描述连续动作**：不要用一句话描述多个动作序列
- 包含：环境、人物位置、主要物体、光影、构图
- 用英文，具体且可视化（避免抽象概念）
- 示例: "A young woman standing at a bus stop in the rain, holding a red umbrella, street lights reflecting on wet pavement"

**b) camera_angle (镜头角度)**
- **视角**（必须从以下选择一个）：
  - Eye level（平视）
  - High angle（俯视）
  - Low angle（仰视）
  - Bird's eye view（鸟瞰）
  - Dutch angle（倾斜）

- **景别**（必须从以下选择一个）：
  - Extreme wide shot（大远景）
  - Wide shot（远景）
  - Full shot（全景）
  - Medium shot（中景）
  - Close-up（近景/特写）
  - Extreme close-up（大特写）

- 格式示例: "Medium shot, eye level"

**c) character_action (角色动作)**
- 描述角色在这个镜头中的**具体动作和行为**
- 可以描述时间上的连续变化（因为视频是动态的）
- 用英文，动词清晰
- 示例: "Looking at her watch nervously, then glancing down the street, finally pulling out her phone"

**d) characters (出现的角色)**
- 列出该分镜中出现的所有角色
- 格式：["名称 (特征描述)", "名称 (特征描述)"]
- 示例：["Rumi (Indian woman, 20s, long hair, blue kurta)", "Kenji (Japanese man, 30s, business suit)"]
- 路人使用泛指：["a passerby", "several police officers"]
- 只有在没有任何人物时才返回空数组

**e) mood (情绪氛围)**
- **必须从以下词汇中选择 1-3 个**（英文）：
  - Happy, Sad, Angry, Fearful, Surprised, Disgusted, Anxious
  - Hopeful, Desperate, Confused, Excited, Calm, Tense, Warm
  - Mysterious, Nostalgic, Melancholic, Joyful, Somber
- 示例: "Anxious and hopeful" / "Mysterious and tense" / "Warm and nostalgic"

**f) duration_seconds (分镜时长)**
- 该分镜的持续时间（秒，精确到小数点后1位）
- 必须基于原视频的真实时长
- 所有分镜时长之和必须等于视频的真实总时长

## 输出格式

**严格的 JSON 格式，不要包含任何 markdown 标记、代码块符号或额外说明文字：**

{
  "duration": <视频真实总时长（秒）>,
  "shot_count": <你识别出的镜头总数>,
  "story_style": "${storyStyle}",
  "characters": [
    "角色名1 (特征描述)",
    "角色名2 (特征描述)"
  ],
  "shots": [
    {
      "shot_number": 1,
      "time_range": "0.0-2.5s",
      "description": "Detailed static first-frame description in English, including environment, character pose, objects, lighting, composition",
      "camera_angle": "景别, 视角 (e.g., Medium shot, eye level)",
      "character_action": "Specific character actions and behavior in this shot",
      "characters": [
        "角色名1 (特征描述)"
      ],
      "mood": "Emotion1 and Emotion2",
      "duration_seconds": 2.5
    },
    {
      "shot_number": 2,
      "time_range": "2.5-5.8s",
      "description": "...",
      "camera_angle": "...",
      "character_action": "...",
      "characters": ["..."],
      "mood": "...",
      "duration_seconds": 3.3
    }
  ]
}

**🔥 最终检查清单（必须完成）:**
1. ✅ "shot_count" 等于你识别出的镜头总数
2. ✅ "duration" 等于视频真实总时长
3. ✅ 所有 "duration_seconds" 之和等于 "duration"
4. ✅ 时间范围连续无间隙（0-2.5, 2.5-5.8, 5.8-9.0...）
5. ✅ 前3个镜头进行了像素级复刻
6. ✅ 每个镜头的 "description" 只描述第一帧静态画面
7. ✅ 所有视角和景别都从标准词汇表中选择
8. ✅ 所有情绪词汇都从标准词汇表中选择
9. ✅ "characters" 数组中使用完整格式（名称 + 特征）
10. ✅ 全局 "characters" 列表包含所有角色（去重）

**重要提示:**
- 直接输出纯 JSON，不要用 \\\`\\\`\\\`json 包裹
- 确保 JSON 格式正确，可以被直接解析
- 所有描述字段必须是英文
- 不要省略任何镜头
- 不要合并任何镜头
- 不要添加原视频中不存在的镜头`
}
