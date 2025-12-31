# Video Agent 功能说明文档

> 本文档面向非技术人员，详细说明 Video Agent 的完整功能、AI 参与点以及所有 AI Prompt 规范。

---

## 📋 目录

1. [系统概述](#系统概述)
2. [完整工作流程（7步骤）](#完整工作流程7步骤)
3. [功能模块详解](#功能模块详解)
   - [步骤1：脚本分析](#步骤1脚本分析)
   - [步骤2：人物Prompt生成](#步骤2人物prompt生成)
   - [步骤3：人物头像生成](#步骤3人物头像生成)
   - [步骤4：分镜图生成](#步骤4分镜图生成)
   - [步骤5：视频片段生成](#步骤5视频片段生成)
   - [步骤6：视频合成](#步骤6视频合成)
   - [步骤7：资源保存](#步骤7资源保存)
4. [AI Prompt 完整规范](#ai-prompt-完整规范)
5. [输出规范说明](#输出规范说明)

---

## 系统概述

**Video Agent** 是一个自动化视频生成系统，能够将用户的文字脚本或现有视频转化为全新的视频作品。系统使用多个 AI 模型协同工作，完成从脚本分析到最终视频合成的全部流程。

### 核心能力

- ✅ **脚本智能分析**：将文字脚本自动拆解为专业分镜
- ✅ **视频严格复刻**：分析现有视频并生成相同结构的新版本
- ✅ **角色一致性保证**：确保同一角色在所有画面中保持外观一致
- ✅ **风格可控**：支持 8 种图像风格（写实、动漫、奇幻等）
- ✅ **全自动流程**：从脚本到成品视频，最小化人工干预

### 支持的输入类型

1. **文字脚本**：用户自己编写的故事或描述
2. **YouTube 视频**：提供 YouTube 链接，系统自动分析
3. **本地视频**：上传本地视频文件进行分析

### 支持的输出时长

**文字脚本模式（推荐）**：
- 15 秒（3 个分镜）
- 30 秒（6 个分镜）
- 45 秒（9 个分镜）
- 60 秒（12 个分镜）

**YouTube 视频复刻模式**：
- 1-60 秒之间的任意整数时长
- 时长由原视频的实际长度决定
- 系统会自动四舍五入为整数秒

---

## 完整工作流程（7步骤）

```
用户输入脚本/视频
    ↓
【步骤1】AI 脚本分析 → 生成分镜脚本
    ↓
【步骤2】AI 人物Prompt生成 → 为每个角色生成描述
    ↓
【步骤3】AI 人物头像生成 → 生成角色参考图
    ↓
【步骤4】AI 分镜图生成 → 为每个分镜生成静态图片
    ↓
【步骤5】AI 视频生成 → 将静态图转为视频片段
    ↓
【步骤6】视频合成 → 拼接所有片段+音乐+转场
    ↓
【步骤7】资源保存 → 保存到资源库供后续使用
```

---

## 功能模块详解

### 步骤1：脚本分析

#### 功能描述

将用户提供的文字脚本或视频，智能分解为多个分镜（Shot），每个分镜包含详细的视觉描述、镜头角度、角色动作、情绪氛围等信息。

#### 两种模式

**模式A：文字脚本分析**
- 输入：用户自己写的故事文本
- AI 任务：理解故事内容，创造性地生成分镜
- 分镜数量：根据视频时长自动计算（15秒=3镜，30秒=6镜，45秒=9镜，60秒=12镜）
- 每个分镜时长：统一为 5 秒

**模式B：视频分析（严格复刻模式）**
- 输入：YouTube 链接或本地视频
- AI 任务：分析原视频，完全复刻其结构
- 分镜数量：严格等于原视频的镜头切换次数
- 每个分镜时长：严格等于原视频每个镜头的实际时长（动态时长，不统一为 5 秒）
- 视频总时长：必须在 1-60 秒之间（超过 60 秒会报错）
- **重要**：YouTube 模式下，系统会自动创建项目并跳转到步骤 1（分镜脚本编辑），无需用户手动选择时长

#### AI 参与点

**使用的 AI 模型**：Google Gemini 2.0 Flash Experimental

**AI 的核心任务**：
1. 识别故事中的所有角色（人类、动物、机器人等）
2. 将脚本拆解为指定数量的分镜
3. 为每个分镜生成：
   - 场景视觉描述（environment, objects, composition）
   - 镜头角度（camera type + angle）
   - 角色动作（character actions）
   - 出现的角色列表
   - 情绪氛围（mood keywords）
   - 分镜时长（duration in seconds）

#### 给 AI 的 Prompt（文字脚本模式）

**Prompt 结构**：

```
# 任务: 专业视频分镜脚本生成

你是一位经验丰富的视频导演和分镜师。请根据用户提供的脚本，生成专业的视频分镜脚本。

## 用户输入
- **原始脚本**: "[用户的脚本内容]"
- **视频总时长**: [duration] 秒
- **剧情风格**: [storyStyle]
- **分镜数量**: [shotCount] 个

## 任务要求

### 1. 脚本分析与优化
根据剧情风格优化和延伸脚本内容。

### 2. 人物角色提取
- **重要：识别脚本中所有出现的命名实体作为角色**
- 包括：人类、动物、机器人、生物、怪物、虚拟角色等
- 使用简洁明确的英文名称（如 "Young Man", "Elderly Woman", "Robot", "Cat"）
- 如果某个实体在多个镜头中出现，必须使用完全相同的名称

### 3. 分镜拆分规则
- 将脚本拆分为 **恰好 [shotCount] 个分镜**
- 每个分镜时长约 5 秒
- 确保时间范围连续且不重叠（如 "0-5s", "5-10s"）

### 4. 分镜描述要求

**a) description (场景视觉描述)**
- 用英文描述场景的核心视觉元素
- 包含环境、人物位置、主要物体
- 具体且可视化（避免抽象概念）
- 示例: "A young woman standing at a bus stop in the rain, holding a red umbrella"

**b) camera_angle (镜头角度)**
- 镜头类型: Wide shot / Medium shot / Close-up / Extreme close-up
- 摄像机角度: Eye level / High angle / Low angle / Bird's eye view
- 示例: "Medium shot, eye level"

**c) character_action (角色动作)**
- 描述角色的具体动作和行为
- 用英文，动词清晰
- 示例: "Looking at her watch nervously, then glancing down the street"

**d) characters (出现的角色)**
- 列出该分镜中出现的所有角色名称
- 使用与全局角色列表完全一致的名称
- 示例：["Man", "Cat", "Robot"]

**e) mood (情绪氛围)**
- 用 2-4 个英文形容词描述场景的情绪基调
- 示例: "Anxious and hopeful" / "Mysterious and tense"

**f) duration_seconds (分镜时长)**
- 该分镜的持续时间（秒）
- 所有分镜时长之和必须等于总时长

## 输出格式

**严格的 JSON 格式，直接输出纯 JSON，不要用 ```json 包裹：**

{
  "duration": [总时长],
  "shot_count": [分镜数量],
  "story_style": "[风格]",
  "characters": ["Character1", "Character2"],
  "shots": [
    {
      "shot_number": 1,
      "time_range": "0-5s",
      "description": "Detailed visual description in English",
      "camera_angle": "Medium shot, eye level",
      "character_action": "Specific character action",
      "characters": ["Character1"],
      "mood": "Emotional tone",
      "duration_seconds": 5
    }
  ]
}
```

**关键参数说明**：

| 参数 | 说明 | 示例 |
|------|------|------|
| `duration` | 视频总时长（秒） | 30 |
| `shot_count` | 分镜总数 | 6 |
| `story_style` | 剧情风格 | "comedy", "mystery", "auto" |
| `characters` | 全局角色列表（去重） | ["Young Man", "Robot"] |
| `shots` | 分镜数组 | 见上方 JSON 示例 |

#### 给 AI 的 Prompt（视频分析模式）

**Prompt 核心要求**：

```
# 任务: 视频严格复刻与分镜脚本生成

你是一位专业的视频分析师。你的任务是**严格复刻原视频**，而不是改编或重新创作。

## ⚠️ 绝对输出要求（优先级最高）

**直接输出纯 JSON，不要有任何额外的文字、解释或 markdown 代码块。**

## 🔥 最高优先级：骨架锁定协议

### 第一步：内部计数
1. 完整观看原视频
2. 识别视频中**所有独立的镜头切换**
3. 统计镜头总数
4. 记录视频的真实总时长

### 第二步：绝对对齐
- 你输出的 "shot_count" **必须严格等于**你识别出的镜头总数
- 你输出的 "duration" **必须严格等于**视频的真实时长（秒）
- **禁止省略、概括或合并任何镜头**

## 镜头识别规则

### 什么【算】是新的镜头
- ✅ 机位/角度改变
- ✅ 景别改变（远景→特写）
- ✅ 场景改变（室内→室外）
- ✅ 明确的剪辑点

### 什么【不算】是新的镜头
- ❌ 角色的位置移动
- ❌ 角色的姿态变化
- ❌ 角色的表情变化
- ❌ 物体状态变化

### 示例
正确: "两人面朝镜头挥手，然后转身走出大门" → **1个镜头**
错误: 拆分为 "1.两人挥手" 和 "2.两人走出" → **严格禁止**

## 开场绝对复刻原则

原视频的**前3个镜头**必须进行像素级复刻：
- 精确描述每一帧的画面细节
- 保留原始的机位、景别、构图
- 不做任何简化或概括

## 人物角色命名协议

**首次出现时**：
- 创建简短英文名称（如 "Rumi", "Kenji"）
- 记录详细特征描述
- 格式："名称 (特征描述)"
- 示例："Rumi (Indian woman, 20s, long black hair, wearing faded blue kurta)"

**后续出现时**：
- characters 数组中使用完整格式
- description 和 character_action 中只使用名称

## 分镜描述要求

**a) description (场景视觉描述)**
- **描述"起幅画面"**：只描述该镜头的**第一帧静态画面**
- **禁止描述过程**：不要描述"试图"、"准备"、"想要"等意图
- 包含：环境、人物位置、主要物体、光影、构图

**b) camera_angle (镜头角度)**
- 视角：Eye level / High angle / Low angle / Bird's eye view / Dutch angle
- 景别：Extreme wide shot / Wide shot / Full shot / Medium shot / Close-up / Extreme close-up
- 格式: "Medium shot, eye level"

**c) character_action (角色动作)**
- 描述角色在这个镜头中的**具体动作和行为**
- 可以描述时间上的连续变化

**d) characters (出现的角色)**
- 格式：["名称 (特征描述)", "名称 (特征描述)"]
- 路人使用泛指：["a passerby", "several police officers"]

**e) mood (情绪氛围)**
- 必须从标准情绪词表中选择 1-3 个：
  - Happy, Sad, Angry, Fearful, Surprised, Disgusted, Anxious
  - Hopeful, Desperate, Confused, Excited, Calm, Tense, Warm
  - Mysterious, Nostalgic, Melancholic, Joyful, Somber

**f) duration_seconds (分镜时长)**
- 基于原视频的真实时长（精确到小数点后1位）
- 所有分镜时长之和必须等于视频总时长

## 输出格式

{
  "duration": <视频真实总时长（秒）>,
  "shot_count": <识别出的镜头总数>,
  "story_style": "[style]",
  "characters": [
    "角色名1 (特征描述)",
    "角色名2 (特征描述)"
  ],
  "shots": [
    {
      "shot_number": 1,
      "time_range": "0.0-2.5s",
      "description": "Detailed static first-frame description",
      "camera_angle": "Medium shot, eye level",
      "character_action": "Specific actions",
      "characters": ["角色名1 (特征描述)"],
      "mood": "Anxious and hopeful",
      "duration_seconds": 2.5
    }
  ]
}
```

#### AI 的输出规范

**输出格式**：纯 JSON（不能有任何 markdown 标记或额外文字）

**必需字段**：

```json
{
  "duration": 30,
  "shot_count": 6,
  "story_style": "comedy",
  "characters": [
    "Young Man",
    "Robot"
  ],
  "shots": [
    {
      "shot_number": 1,
      "time_range": "0-5s",
      "description": "A young man sitting at a desk in a modern office, surrounded by computer screens displaying code, natural daylight from large windows",
      "camera_angle": "Medium shot, eye level",
      "character_action": "Typing on keyboard, occasionally glancing at multiple screens",
      "characters": ["Young Man"],
      "mood": "Focused and determined",
      "duration_seconds": 5
    },
    {
      "shot_number": 2,
      "time_range": "5-10s",
      "description": "A humanoid robot entering through the office door, metallic silver body with glowing blue eyes",
      "camera_angle": "Wide shot, low angle",
      "character_action": "Walking towards the desk, extending hand for greeting",
      "characters": ["Robot"],
      "mood": "Mysterious and intriguing",
      "duration_seconds": 5
    }
  ]
}
```

**字段验证规则**：
- ✅ 所有描述必须是英文
- ✅ `duration` = 所有 `duration_seconds` 之和
- ✅ `shot_count` = `shots` 数组的长度
- ✅ `characters` 数组不能为空（除非脚本完全没有角色）
- ✅ 每个分镜的 `characters` 必须是全局 `characters` 的子集
- ✅ 时间范围连续无间隙

---

### 步骤2：人物Prompt生成

#### 功能描述

根据步骤1生成的分镜脚本，为每个角色生成专业的生图 Prompt（文本描述），用于后续生成角色的参考头像。

#### AI 参与点

**使用的 AI 模型**：Google Gemini 2.0 Flash Experimental

**AI 的核心任务**：
1. 分析角色在各个分镜中的描述
2. 为每个角色生成详细的外观描述 Prompt
3. 确保 Prompt 包含足够细节以保证后续生成的一致性
4. 根据用户选择的图像风格，添加对应的风格关键词

#### 给 AI 的 Prompt

```
# 任务: 为视频人物生成专业的生图 Prompt

你是一位资深的 AI 图像生成专家。请根据视频脚本分析结果，为每个人物生成高质量的生图 prompt。

## 视频信息

**剧情风格**: [story_style]
**图片风格**: [image_style] (例如 Realistic, Anime, Fantasy...)
**人物列表**: [character1, character2, ...]

## 人物在分镜中的描述

### [角色名称]
出现在以下分镜中:
- **Shot 1**
  - 场景: [description]
  - 动作: [character_action]
  - 情绪: [mood]
- **Shot 2**
  - ...

## Prompt 生成要求

### 1. 核心原则
- **一致性第一**: 确保同一人物在所有分镜中保持外观一致
- **风格匹配**: 完全符合用户选择的图片风格
- **细节丰富**: 包含足够的视觉细节（外貌、服装、特征）
- **英文输出**: 所有 prompt 必须是英文

### 2. Prompt 结构

每个人物的 prompt 应包含以下部分（按顺序）:

**a) 主体描述**
- 人物类型（human, creature, robot, etc.）
- 性别/年龄（如适用）
- 核心特征（发型、面部特征、体型）

**b) 服装与配饰**
- 详细的服装描述
- 配饰和道具

**c) 外观细节**
- 皮肤/表面质感
- 眼睛颜色和表情
- 独特标识（疤痕、纹身、特殊标记）

**d) 风格关键词**
- 根据图片风格添加对应关键词

**e) 一致性强化**
- 添加: "consistent character design, character reference sheet, turnaround"

### 3. Negative Prompt 要求

为每个人物生成 negative prompt，避免:
- 低质量: "low quality, blurry, distorted, deformed, ugly, bad anatomy"
- 不一致: "inconsistent, multiple characters, different person, character variation"
- 风格冲突: 列出与目标风格冲突的关键词
- 其他: "watermark, text, signature, out of frame"

### 4. 示例

假设人物是 "Young Wizard":
- **Prompt**: "A young male wizard in his 20s, short messy brown hair, bright blue eyes, wearing a dark blue robe with silver star patterns, holding a wooden staff with a crystal top, confident expression, photorealistic, high detail, natural lighting, consistent character design, character reference sheet"
- **Negative Prompt**: "low quality, blurry, old person, female, inconsistent, multiple characters, cartoon, anime, watermark"

## 输出格式

{
  "characterPrompts": [
    {
      "characterName": "Young Wizard",
      "prompt": "Detailed character prompt...",
      "negativePrompt": "Negative prompt..."
    }
  ]
}
```

#### 支持的图像风格

系统支持 8 种图像风格，每种风格都有专属的关键词：

| 风格名称 | 英文名 | 风格关键词 |
|---------|--------|-----------|
| 写实风格 | Realistic | photorealistic, high detail, natural lighting, professional photography, 8k uhd, dslr, soft lighting, high quality, film grain, Fujifilm XT3 |
| 动漫风格 | Anime | anime style, manga, japanese animation, vibrant colors, cel shaded, by Makoto Shinkai, studio ghibli style, highly detailed |
| 奇幻风格 | Fantasy | fantasy art, epic, magical, detailed, concept art, artstation, by greg rutkowski, dramatic lighting, vibrant colors |
| 赛博朋克 | Cyberpunk | cyberpunk, neon lights, futuristic, high tech, dystopian, sci-fi, blade runner style, synthwave, glowing elements |
| 油画风格 | Oil Painting | oil painting, classical art, fine art, brush strokes, canvas texture, renaissance style, museum quality, detailed |
| 3D渲染 | 3D Render | 3d render, octane render, unreal engine, highly detailed, smooth, sharp focus, trending on artstation, ray tracing |
| 水彩画 | Watercolor | watercolor painting, soft colors, artistic, flowing, delicate, pastel tones, hand painted, traditional art |
| 漫画书风格 | Comic Book | comic book style, bold lines, vibrant colors, halftone dots, graphic novel, pop art, dynamic composition |

#### AI 的输出规范

**输出格式**：纯 JSON

**示例**：

```json
{
  "characterPrompts": [
    {
      "characterName": "Young Man",
      "prompt": "A young man in his mid-20s, short dark brown hair styled messily, bright hazel eyes with an intelligent expression, clean-shaven with a friendly smile, wearing a casual gray hoodie over a white t-shirt, holding a smartphone in hand, lean athletic build, warm skin tone, photorealistic, high detail, natural lighting, professional photography, 8k uhd, dslr, soft lighting, high quality, film grain, Fujifilm XT3, consistent character design, character reference sheet, turnaround",
      "negativePrompt": "low quality, blurry, distorted, deformed, ugly, bad anatomy, bad proportions, inconsistent, multiple characters, different person, character variation, old person, child, female, cartoon, anime, watercolor, oil painting, watermark, text, signature, out of frame"
    },
    {
      "characterName": "Robot",
      "prompt": "A humanoid robot with a sleek metallic silver body, glowing bright blue circular eyes, smooth polished chrome surface with visible panel seams, articulated joints with mechanical details, standing upright with perfect posture, modern minimalist design, futuristic aesthetic, LED indicators on chest panel, photorealistic, high detail, studio lighting, professional 3d render, octane render, ray tracing, consistent character design, character reference sheet, turnaround",
      "negativePrompt": "low quality, blurry, distorted, deformed, ugly, bad anatomy, rusty, damaged, dirty, inconsistent, multiple robots, different design, human, organic, cartoon, anime, sketch, watermark, text, signature"
    }
  ]
}
```

**验证规则**：
- ✅ 每个角色都必须有 Prompt 和 Negative Prompt
- ✅ Prompt 长度：50-150 词
- ✅ 必须包含风格关键词
- ✅ 必须包含一致性强化关键词
- ✅ 所有内容必须是英文

---

### 步骤3：人物头像生成

#### 功能描述

使用步骤2生成的 Prompt，调用图像生成 API（Seedream API），为每个角色生成参考头像图片。这些头像将作为后续分镜图和视频生成的参考，确保角色外观一致性。

#### AI 参与点

**使用的 AI 服务**：Seedream API（图像生成模型：seedream-v4）

**AI 的核心任务**：
1. 根据 Prompt 生成角色头像
2. 确保生成的图片符合风格要求
3. 为每个角色生成 1 张参考图

#### 调用参数

**API 端点**：`/seedream/v4/text-to-image`

**请求参数**：

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `prompt` | string | 人物描述 Prompt | "A young man in his mid-20s..." |
| `negative_prompt` | string | 负向提示 | "low quality, blurry..." |
| `width` | number | 图片宽度 | 1024 |
| `height` | number | 图片高度 | 1024 |
| `num_images` | number | 生成数量 | 1 |
| `guidance_scale` | number | 提示词引导强度 | 7.5 |
| `num_inference_steps` | number | 推理步数 | 50 |

**返回结果**：

```json
{
  "images": [
    {
      "url": "https://storage.example.com/character-123.png",
      "width": 1024,
      "height": 1024
    }
  ]
}
```

#### 输出规范

- 每个角色生成 **1 张头像**
- 图片分辨率：**1024x1024**
- 图片格式：PNG
- 存储位置：云存储服务（返回 URL）

---

### 步骤4：分镜图生成

#### 功能描述

为每个分镜生成静态图片（类似电影分镜板），这些图片将作为下一步视频生成的起始帧。生成时会参考角色头像，确保角色外观一致。

#### AI 参与点

**使用的 AI 服务**：Seedream API（图像生成模型：seedream-v4）

**AI 的核心任务**：
1. 根据分镜描述生成场景图片
2. 参考角色头像图，确保角色外观一致
3. 符合指定的镜头角度和情绪氛围
4. 应用用户选择的图像风格

#### 给 AI 的 Prompt

**Prompt 构建逻辑**：

```
[如果有角色参考图]
CRITICAL REQUIREMENT: Generate EXACTLY THE SAME characters as shown in the reference images.
Characters in this scene: [character_names].
MUST maintain 100% identical appearance: same face, same facial features, same hair, same clothing, same body type, same skin tone.
DO NOT change or modify the character's appearance in ANY way.

Scene: [shot.description].
Camera: [shot.camera_angle].
Action: [shot.character_action].
Mood: [shot.mood].
Style: [style_prompt].

[如果有角色参考图]
REMINDER: The character(s) [character_names] MUST look EXACTLY like the reference images provided.
Keep facial structure, eye color, nose shape, mouth shape, hair style, hair color, clothing style, body proportions, and all other details IDENTICAL.
This is the SAME character from the reference images, not a similar character.

High quality, professional composition.
```

**Negative Prompt（有参考图时）**：

```
different face, different person, changed face, altered face, modified face, wrong face, different facial features, different eyes, different nose, different mouth, different hair, different hairstyle, different hair color, inconsistent character, character variation, character inconsistency, wrong identity, wrong character, multiple versions, character change, appearance change, different clothing, different outfit, changed clothes, different body type, different skin tone, different age, appearance inconsistency, look-alike, similar but different, low quality, blurry, distorted, deformed, ugly, bad anatomy, bad proportions, watermark, text, signature
```

**Negative Prompt（无参考图时）**：

```
low quality, blurry, distorted, deformed, ugly, bad anatomy, bad proportions, watermark, text, signature
```

#### 调用参数

**API 端点**：`/seedream/v4/image-to-image`（如果有参考图）或 `/seedream/v4/text-to-image`（无参考图）

**请求参数**：

| 参数 | 类型 | 说明 | 是否必需 |
|------|------|------|----------|
| `prompt` | string | 完整的分镜描述 Prompt | 是 |
| `negative_prompt` | string | 负向提示 | 是 |
| `image` | string | 参考图 URL（Base64 或 URL） | 仅当有参考图时 |
| `width` | number | 输出宽度 | 是 |
| `height` | number | 输出高度 | 是 |
| `num_images` | number | 生成数量（固定为1） | 是 |
| `guidance_scale` | number | 提示词引导强度 | 是 |
| `denoise_strength` | number | 去噪强度（仅 image-to-image） | 否 |

**批量生成策略**：

- 并发控制：同时生成 **3 张分镜图**
- 实时更新：每生成完1张，立即保存到数据库
- 错误处理：如果某张生成失败，记录错误状态，继续生成其他

#### 输出规范

- 每个分镜生成 **1 张图片**
- 图片分辨率：根据视频比例（常见：1920x1080 或 1024x1024）
- 图片格式：PNG
- 存储：云存储（返回 URL）

**示例输出**：

```json
{
  "shot_number": 1,
  "storyboard_url": "https://storage.example.com/storyboard-1.png",
  "status": "success"
}
```

---

### 步骤5：视频片段生成

#### 功能描述

将步骤4生成的静态分镜图转换为动态视频片段。系统支持两种生成模式：
- **旁白模式**：使用 Google Veo 3.1 模型，支持并发生成
- **非旁白模式**：使用 BytePlus Seedance 模型，顺序生成（首尾帧链式）

#### AI 参与点

**使用的 AI 服务**：
- **Veo 3.1**（Wavespeed API）：用于旁白模式
- **BytePlus Seedance**：用于非旁白模式

**AI 的核心任务**：
1. 将静态图片转换为 3-10 秒的视频片段
2. 根据 Prompt 添加自然的运动效果
3. 保持画面流畅，避免闪烁或跳跃
4. （非旁白模式）确保相邻视频片段的首尾帧平滑过渡

#### 给 AI 的 Prompt

**Prompt 构建逻辑**：

```
[shot.description].
[shot.character_action].
[shot.camera_angle].
Mood: [shot.mood].
Smooth camera movement, natural motion, cinematic.
No text, no subtitles, no captions, no words on screen.
```

**示例**：

```
A young man sitting at a desk in a modern office, surrounded by computer screens displaying code, natural daylight from large windows.
Typing on keyboard, occasionally glancing at multiple screens.
Medium shot, eye level.
Mood: Focused and determined.
Smooth camera movement, natural motion, cinematic.
No text, no subtitles, no captions, no words on screen.
```

#### 调用参数

**模式A：旁白模式（Veo 3.1）**

**API 端点**：`/google/veo3.1-fast/image-to-video`

**请求参数**：

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `prompt` | string | 视频生成 Prompt | "A young man sitting..." |
| `image` | string | 分镜图 URL 或 Base64 | "https://..." |
| `duration` | number | 视频时长（秒） | 6 |
| `last_image` | string | 上一个视频的最后一帧（可选） | "https://..." |
| `safety_tolerance` | number | 安全容忍度（1-6，6最宽松） | 6 |

**时长映射表**：

| 分镜时长 | 实际生成时长 |
|---------|-------------|
| 5 秒 | 6 秒 |
| 3-4 秒 | 4 秒 |
| 8-10 秒 | 8 秒 |

**并发策略**：同时生成 **3 个视频片段**

---

**模式B：非旁白模式（BytePlus Seedance）**

**API 端点**：`/video/generation` (submitVideoGeneration)

**请求参数**：

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `prompt` | string | 视频生成 Prompt | "A young man sitting..." |
| `image` | string | 分镜图 Base64 | "data:image/png;base64,..." |
| `duration` | number | 视频时长（秒） | 5 |
| `cameraFixed` | boolean | 禁用自动多镜头切换 | true |

**生成策略**：
- **顺序生成**：一次只生成 1 个视频
- **首尾帧链式**：将当前视频的最后一帧作为下一个视频的起始帧（确保流畅过渡）
- **非阻塞轮询**：前端定时查询生成状态，不阻塞后端

#### 输出规范

**返回数据结构**：

```json
{
  "shot_number": 1,
  "video_url": "https://storage.example.com/video-1.mp4",
  "duration": 6,
  "status": "success"
}
```

**状态说明**：

| 状态 | 说明 |
|------|------|
| `generating` | 生成中 |
| `success` | 生成成功 |
| `failed` | 生成失败 |

---

### 步骤6：视频合成

#### 功能描述

将所有视频片段拼接成一个完整的视频，并添加背景音乐和转场效果。这一步使用 FFmpeg 工具进行处理，不涉及 AI。

#### 处理流程

1. **下载所有视频片段**：从云存储下载到本地临时目录
2. **生成拼接列表**：创建 FFmpeg concat 文件
3. **下载背景音乐**（可选）
4. **构建 FFmpeg 命令**：
   - 拼接视频片段
   - 应用转场效果
   - 混音背景音乐
   - 设置分辨率和帧率
5. **执行合成**：运行 FFmpeg
6. **上传最终视频**：上传到云存储

#### 支持的转场效果

| 转场类型 | 英文名 | 效果描述 |
|---------|--------|---------|
| **无转场** | **none** | **直接拼接，无过渡效果（最快）** |
| 淡入淡出 | fade | 前一个画面逐渐变暗，后一个画面逐渐变亮 |
| 交叉淡化 | crossfade | 两个画面交叉溶解（推荐，最流畅） |
| 滑动 | slide | 后一个画面从侧面滑入 |
| 缩放 | zoom | 前一个画面缩小，后一个画面放大 |

#### 音乐混音参数

- 背景音乐音量：调整为不干扰视频主体声音
- 淡入时长：2 秒
- 淡出时长：2 秒

#### 输出规范

- **视频格式**：MP4
- **视频编码**：H.264
- **分辨率**：1920x1080（或原始分辨率）
- **帧率**：30 fps
- **音频编码**：AAC
- **音频采样率**：48000 Hz

---

### 步骤7：资源保存

#### 功能描述

将最终生成的视频保存到资源库（Assets），供后续项目复用或下载。同时保存项目的所有中间结果（分镜脚本、分镜图、视频片段等）。

#### 保存内容

- ✅ 最终合成视频
- ✅ 分镜脚本 JSON
- ✅ 所有分镜图
- ✅ 所有视频片段
- ✅ 人物头像
- ✅ 项目元数据（时长、风格、创建时间等）

#### 输出规范

资源库记录包含以下信息：

```json
{
  "id": "asset-123",
  "type": "video",
  "title": "My Video Project",
  "final_video_url": "https://storage.example.com/final-video.mp4",
  "duration": 30,
  "shot_count": 6,
  "style": "realistic",
  "created_at": "2025-12-30T10:00:00Z",
  "storyboards": [
    "https://storage.example.com/storyboard-1.png",
    "https://storage.example.com/storyboard-2.png"
  ],
  "video_clips": [
    "https://storage.example.com/clip-1.mp4",
    "https://storage.example.com/clip-2.mp4"
  ]
}
```

---

## AI Prompt 完整规范

### 1. 脚本分析 AI Prompt

**目标**：将文字脚本转换为结构化的分镜数据

**Prompt 模板**：见 [步骤1](#给-ai-的-prompt文字脚本模式)

**关键要求**：
- 输出纯 JSON（不要 markdown 标记）
- 识别所有命名实体作为角色
- 分镜时长统一为 5 秒
- 时间范围连续无间隙

---

### 2. 视频分析 AI Prompt

**目标**：严格复刻原视频的结构

**Prompt 模板**：见 [步骤1](#给-ai-的-prompt视频分析模式)

**关键要求**：
- 骨架锁定：镜头数必须等于原视频镜头数
- 前 3 个镜头像素级复刻
- 人物命名协议：首次出现时创建 "名称 (特征描述)"
- 情绪词汇从标准词表选择

---

### 3. 人物 Prompt 生成 AI Prompt

**目标**：为每个角色生成详细的生图描述

**Prompt 模板**：见 [步骤2](#给-ai-的-prompt)

**关键要求**：
- Prompt 结构：主体描述 → 服装 → 外观细节 → 风格关键词 → 一致性强化
- 必须包含风格关键词（根据用户选择）
- 必须包含 "consistent character design, character reference sheet"
- Negative Prompt 避免不一致和低质量

---

### 4. 分镜图生成 AI Prompt

**目标**：生成符合分镜描述的静态图片

**Prompt 模板**：

```
[如果有参考图]
CRITICAL REQUIREMENT: Generate EXACTLY THE SAME characters as shown in the reference images.
Characters: [names].
MUST maintain 100% identical appearance.

Scene: [description].
Camera: [camera_angle].
Action: [character_action].
Mood: [mood].
Style: [style_prompt].

[如果有参考图]
REMINDER: Keep IDENTICAL to reference images.

High quality, professional composition.
```

**Negative Prompt（有参考图）**：

```
different face, different person, changed face, altered face, modified face, wrong face, different facial features, different eyes, different nose, different mouth, different hair, different hairstyle, different hair color, inconsistent character, character variation, character inconsistency, wrong identity, wrong character, multiple versions, character change, appearance change, different clothing, different outfit, changed clothes, different body type, different skin tone, different age, appearance inconsistency, look-alike, similar but different, low quality, blurry, distorted, deformed, ugly, bad anatomy, bad proportions, watermark, text, signature
```

**关键要求**：
- 如果有角色参考图，强制要求 100% 一致
- 重复强调角色一致性（3 次）
- Negative Prompt 包含 16+ 个避免角色变化的关键词

---

### 5. 视频生成 AI Prompt

**目标**：将静态图转换为动态视频

**Prompt 模板**：

```
[description].
[character_action].
[camera_angle].
Mood: [mood].
Smooth camera movement, natural motion, cinematic.
No text, no subtitles, no captions, no words on screen.
```

**关键要求**：
- 包含场景描述、角色动作、镜头角度、情绪
- 添加运动提示（Smooth camera movement）
- 禁止文字和字幕

---

## 输出规范说明

### 1. 分镜脚本 JSON 规范

```typescript
interface ScriptAnalysisResult {
  duration: number                // 视频总时长（秒）
  shot_count: number              // 分镜总数
  story_style: string             // 剧情风格
  characters: string[]            // 全局角色列表
  shots: Shot[]                   // 分镜数组
}

interface Shot {
  shot_number: number             // 分镜编号（从1开始）
  time_range: string              // 时间范围（如 "0-5s"）
  description: string             // 场景视觉描述（英文）
  camera_angle: string            // 镜头角度（如 "Medium shot, eye level"）
  character_action: string        // 角色动作（英文）
  characters: string[]            // 出现的角色列表
  mood: string                    // 情绪氛围（英文）
  duration_seconds: number        // 分镜时长（秒）
}
```

**验证规则**：
- ✅ `duration` = Σ `duration_seconds`
- ✅ `shot_count` = `shots.length`
- ✅ 每个分镜的 `characters` ⊆ 全局 `characters`
- ✅ 时间范围连续无间隙

---

### 2. 人物 Prompt JSON 规范

```typescript
interface CharacterPromptsResult {
  characterPrompts: CharacterPrompt[]
}

interface CharacterPrompt {
  characterName: string           // 角色名称
  prompt: string                  // 生图 Prompt（50-150词）
  negativePrompt: string          // 负向 Prompt
}
```

**Prompt 结构要求**：
1. 主体描述（人物类型、性别、年龄、核心特征）
2. 服装与配饰
3. 外观细节（皮肤、眼睛、标记）
4. 风格关键词（根据图像风格）
5. 一致性强化关键词

**必需关键词**：
- "consistent character design"
- "character reference sheet"
- "turnaround"（可选）

---

### 3. 分镜图生成 Prompt 规范

**完整 Prompt 结构**：

```
[角色一致性要求（如果有参考图，3倍强调）]
+ Scene: [场景描述]
+ Camera: [镜头角度]
+ Action: [角色动作]
+ Mood: [情绪氛围]
+ Style: [风格关键词]
+ [角色一致性再次强调（如果有参考图）]
+ High quality, professional composition
```

**Negative Prompt 规范**：

- **有参考图**：包含 50+ 个避免角色变化的关键词
- **无参考图**：仅包含质量相关的负向词

---

### 4. 视频生成 Prompt 规范

**Prompt 组成**：

1. **场景描述**（`shot.description`）
2. **角色动作**（`shot.character_action`）
3. **镜头角度**（`shot.camera_angle`）
4. **情绪氛围**（`Mood: ${shot.mood}`）
5. **运动提示**（`Smooth camera movement, natural motion, cinematic`）
6. **禁止文字**（`No text, no subtitles, no captions, no words on screen`）

**示例**：

```
A young man sitting at a desk in a modern office, surrounded by computer screens displaying code, natural daylight from large windows.
Typing on keyboard, occasionally glancing at multiple screens.
Medium shot, eye level.
Mood: Focused and determined.
Smooth camera movement, natural motion, cinematic.
No text, no subtitles, no captions, no words on screen.
```

---

### 5. 图像生成 API 参数规范

**文本转图像（Text-to-Image）**：

```json
{
  "prompt": "Detailed description...",
  "negative_prompt": "low quality, blurry...",
  "width": 1024,
  "height": 1024,
  "num_images": 1,
  "guidance_scale": 7.5,
  "num_inference_steps": 50
}
```

**图像转图像（Image-to-Image）**：

```json
{
  "prompt": "Detailed description...",
  "negative_prompt": "low quality, blurry...",
  "image": "https://... or base64",
  "width": 1024,
  "height": 1024,
  "num_images": 1,
  "guidance_scale": 7.5,
  "denoise_strength": 0.7
}
```

---

### 6. 视频生成 API 参数规范

**Veo 3.1（旁白模式）**：

```json
{
  "prompt": "Scene description with action...",
  "image": "https://storyboard-url",
  "duration": 6,
  "last_image": "https://previous-video-last-frame (可选)",
  "safety_tolerance": 6
}
```

**BytePlus Seedance（非旁白模式）**：

```json
{
  "prompt": "Scene description with action...",
  "image": "data:image/png;base64,...",
  "duration": 5,
  "cameraFixed": true
}
```

---

## 附录：常见问题

### Q1: 如果脚本中没有明确的角色名称怎么办？

**答**：AI 会自动为角色创建简洁的英文名称，如：
- "Young Man"（年轻男性）
- "Elderly Woman"（老年女性）
- "Robot"（机器人）
- "Cat"（猫）

### Q2: 如何确保角色在所有画面中保持一致？

**答**：系统通过以下机制保证一致性：
1. 生成角色参考头像
2. 分镜图生成时强制参考头像
3. Prompt 中 3 倍强调角色一致性
4. Negative Prompt 包含 16+ 个避免变化的关键词

### Q3: 视频分析模式和脚本分析模式的主要区别是什么？

**答**：

| 特性 | 脚本分析模式 | 视频分析模式 |
|------|-------------|-------------|
| 输入 | 文字脚本 | 视频文件 |
| 创作性 | AI 创造性生成分镜 | AI 严格复刻原视频 |
| 分镜数量 | 固定（根据时长） | 等于原视频镜头数 |
| 分镜时长 | 统一 5 秒 | 等于原视频各镜头时长 |
| 适用场景 | 全新创作 | 视频重制、风格转换 |

### Q4: 支持哪些剧情风格？

**答**：系统支持 8 种剧情风格：
- comedy（喜剧）
- mystery（悬疑）
- moral（道德寓言）
- twist（反转）
- suspense（悬疑紧张）
- warmth（温暖治愈）
- inspiration（励志）
- auto（自动选择）

### Q5: 转场效果如何选择？

**答**：系统支持 5 种转场效果：
- **none（无转场）**：直接拼接，速度最快，适合快节奏视频
- **crossfade（交叉淡化）**：推荐，效果最流畅自然
- fade（简单淡入淡出）
- slide（滑动切换）
- zoom（缩放切换）

**性能提示**：如果追求最快合成速度，选择 `none`；如果追求流畅观感，选择 `crossfade`。

### Q6: 生成失败怎么办？

**答**：系统支持逐个重试：
- 分镜图生成失败 → 可以重新生成单张分镜图
- 视频生成失败 → 可以重试单个视频片段
- 不会影响已成功生成的部分

---

## 总结

Video Agent 是一个完整的 AI 驱动视频生成系统，通过 7 个步骤将文字或视频转化为全新的视频作品：

1. **AI 脚本分析** → 理解故事，生成分镜
2. **AI 人物描述** → 为角色生成详细 Prompt
3. **AI 头像生成** → 创建角色参考图
4. **AI 分镜图生成** → 生成每个场景的静态图
5. **AI 视频生成** → 将图片转为动态视频
6. **自动合成** → 拼接+音乐+转场
7. **资源保存** → 保存所有成果

系统的核心优势：
- ✅ **全自动化**：最小化人工干预
- ✅ **角色一致性**：强制参考头像+3倍约束
- ✅ **严格复刻**：视频分析模式完全还原原结构
- ✅ **风格可控**：8 种图像风格随意切换
- ✅ **灵活重试**：任何步骤失败都可单独重试

所有 AI Prompt 都经过精心设计，确保输出的质量和一致性。
