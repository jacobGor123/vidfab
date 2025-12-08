# Studio Video Agent Beta 版产品设计方案

**文档版本:** v1.0
**创建日期:** 2025-12-08
**最后更新:** 2025-12-08
**状态:** 设计评审中
**项目:** VidFab - Studio Video Agent Beta 功能
**位置:** `/studio` 路径下的 Beta 功能模块

---

## 📋 执行摘要

本文档详细说明了在 `/studio` 路径下新增的 **Video Agent Beta** 功能的完整产品设计方案。该功能旨在为用户提供从脚本输入到视频成片的全流程 AI 自动化生成服务，采用步进式交互设计，让用户在每个关键节点都能进行确认和调整。

### 核心价值主张

- ✅ **极简输入** - 用户只需输入脚本和选择时长，AI 自动处理所有细节
- ✅ **智能分析** - LLM 自动识别脚本格式、提取人物、优化分镜
- ✅ **可控生成** - 每个关键步骤都允许用户确认和二次调整
- ✅ **模板驱动** - 提供人物库和风格库，降低创作门槛
- ✅ **草稿保存** - 支持中途保存，随时继续创作

---

## 🎯 产品定位

### 功能定位
- **产品名称:** Video Agent Beta
- **功能路径:** `/studio/video-agent-beta`
- **用户群体:** 需要快速生成短视频的创作者，对 AI 工具有一定了解
- **核心场景:** 从文字脚本快速生成 30-60 秒的短视频

### 与现有功能的区别
```
现有 Studio 功能:
├─ 提供详细的构建器选项
├─ 用户需要手动配置各种参数
└─ 适合专业用户精细化控制

Video Agent Beta:
├─ 构建器仅提供脚本输入和时长选择
├─ AI 自动处理分镜、人物、风格等
├─ 步进式交互，用户在关键节点确认
└─ 适合快速原型制作和创意验证
```

---

## 🔄 完整产品流程设计

### 流程总览

```
用户输入阶段
    ↓
步骤 1: 脚本分析与优化 (弹窗)
    ↓
步骤 2: 人物配置 (弹窗)
    ↓
步骤 3: 图片风格生成/选择 (弹窗)
    ↓
步骤 4: 分镜图批量生成 (弹窗)
    ↓
步骤 5: 视频片段批量生成 (弹窗)
    ↓
步骤 6: 音乐和特效选择 (弹窗)
    ↓
步骤 7: 最终合成 (弹窗)
    ↓
完成输出
```

---

## 📝 详细流程设计

### 阶段 0: 用户输入阶段

#### 界面元素
```
┌─────────────────────────────────────────────┐
│  Video Agent Beta - 快速生成视频              │
├─────────────────────────────────────────────┤
│                                             │
│  [1] 视频时长选择                            │
│      ○ 15 秒  ○ 30 秒  ● 45 秒  ○ 60 秒     │
│                                             │
│  [2] 剧情风格选择                            │
│      ┌────────┬────────┬────────┬────────┐ │
│      │[图标]  │[图标]  │[图标]  │[图标]  │ │
│      │   ●    │        │        │        │ │
│      │ Auto   │ 搞笑   │ 猎奇   │ 警世   │ │
│      └────────┴────────┴────────┴────────┘ │
│      ┌────────┬────────┬────────┬────────┐ │
│      │[图标]  │[图标]  │[图标]  │[图标]  │ │
│      │        │        │        │        │ │
│      │ 反转   │ 悬疑   │ 温情   │ 励志   │ │
│      └────────┴────────┴────────┴────────┘ │
│                                             │
│      💡 Auto: AI 自动判断,不强化特定风格     │
│                                             │
│  [3] 视频脚本输入                            │
│  ┌─────────────────────────────────────┐   │
│  │ 请输入您的视频脚本...                 │   │
│  │                                     │   │
│  │ 支持任何格式:                        │   │
│  │ - 纯文字描述 (如: 王子救公主的故事)   │   │
│  │ - 分镜脚本                           │   │
│  │ - 故事大纲                           │   │
│  │                                     │   │
│  │ 💡 简单描述 + 剧情风格 = AI 自动延伸  │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│               [开始生成]                     │
│                                             │
└─────────────────────────────────────────────┘
```

#### 剧情风格说明

| 风格 | 说明 | LLM 延伸方向 |
|------|------|--------------|
| **Auto** | AI 自动判断,不刻意强化特定风格 | 根据脚本内容自然延伸 |
| **搞笑** | 幽默、轻松、娱乐向 | 增加笑点、夸张表现、喜剧冲突 |
| **猎奇** | 新奇、怪异、超现实 | 加入不寻常元素、反常规设定 |
| **警世** | 警示、教育、深刻 | 强化道德寓意、社会批判 |
| **反转** | 意外结局、剧情反转 | 设置悬念、埋伏笔、反转结局 |
| **悬疑** | 神秘、紧张、推理 | 营造悬念、设置谜团 |
| **温情** | 感人、温暖、治愈 | 强化情感、人物关系、温馨氛围 |
| **励志** | 正能量、奋斗、成长 | 突出挑战、成长、正面价值观 |

#### 用户操作
1. 选择视频时长（15s / 30s / 45s / 60s）
2. 选择剧情风格（Auto / 搞笑 / 猎奇 / 警世 / 反转 / 悬疑 / 温情 / 励志）
3. 在文本框输入脚本（任何格式）
4. 点击"开始生成"按钮

#### 后端处理
- 保存用户输入的原始脚本
- 保存用户选择的视频时长
- 保存用户选择的剧情风格
- 触发步骤 1 的弹窗

---

### 步骤 1: 脚本分析与优化

#### 弹窗设计
```
┌─────────────────────────────────────────────────────┐
│  步骤 1/7: 脚本分析与优化                    [━━━●○○○○○○○] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🤖 AI 正在分析您的脚本...                           │
│                                                     │
│  ✓ 识别脚本格式                                      │
│  ✓ 提取关键场景                                      │
│  ✓ 分析人物数量                                      │
│  ✓ 生成结构化分镜脚本                                │
│                                                     │
│  [加载动画...]                                      │
│                                                     │
└─────────────────────────────────────────────────────┘

     ↓ 分析完成后 ↓

┌─────────────────────────────────────────────────────┐
│  步骤 1/7: 脚本分析与优化                    [━━━●○○○○○○○] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📊 分析结果                                         │
│  • 视频时长: 45 秒                                   │
│  • 分镜数量: 6 个                                    │
│  • 人物数量: 2 个 (Emma, John)                       │
│                                                     │
│  📝 优化后的分镜脚本                                  │
│  ┌───────────────────────────────────────────┐     │
│  │ 分镜 1 (0-7s): 广角镜头                    │     │
│  │ Emma 站在海边,看着远方,表情平静            │     │
│  │ 镜头: Wide shot, eye level                │     │
│  │ 情绪: Peaceful and nostalgic               │     │
│  │                                           │     │
│  │ 分镜 2 (7-14s): 特写镜头                   │     │
│  │ Emma 的脸部特写,眼神中带着回忆             │     │
│  │ 镜头: Close-up, slightly tilted            │     │
│  │ 情绪: Reflective                           │     │
│  │                                           │     │
│  │ 分镜 3 (14-21s): 中景镜头                  │     │
│  │ John 从远处走来,向 Emma 招手               │     │
│  │ 镜头: Medium shot, tracking                │     │
│  │ 情绪: Warm and friendly                    │     │
│  │                                           │     │
│  │ ... (展示所有 6 个分镜)                    │     │
│  └───────────────────────────────────────────┘     │
│                                                     │
│  💡 您可以编辑脚本内容                               │
│  [编辑文本框 - 支持直接修改]                         │
│                                                     │
│          [返回修改]          [确认并继续]            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### LLM 处理逻辑

**输入参数:**
- 用户原始脚本 (任意格式)
- 用户选择的视频时长 (15s/30s/45s/60s)
- 用户选择的剧情风格 (Auto/搞笑/猎奇/警世/反转/悬疑/温情/励志)

**LLM Prompt 示例:**
```
你是一个专业的视频分镜脚本编剧。请分析以下用户输入的脚本,并完成以下任务:

1. 识别脚本格式 (纯文字/结构化/故事大纲等)
2. 根据用户选择的剧情风格 {story_style},优化和延伸脚本内容:
   - 如果是 "Auto": 根据脚本内容自然延伸,不刻意强化特定风格
   - 如果是 "搞笑": 增加笑点、夸张表现、喜剧冲突
   - 如果是 "猎奇": 加入不寻常元素、反常规设定
   - 如果是 "警世": 强化道德寓意、社会批判
   - 如果是 "反转": 设置悬念、埋伏笔、安排反转结局
   - 如果是 "悬疑": 营造悬念、设置谜团
   - 如果是 "温情": 强化情感、人物关系、温馨氛围
   - 如果是 "励志": 突出挑战、成长、正面价值观
3. 提取所有出现的人物角色,列出人物名称
4. 根据视频时长 {duration} 秒,将脚本拆分为 N 个分镜 (建议 15s=3镜, 30s=5镜, 45s=6镜, 60s=8镜)
5. 为每个分镜生成详细描述,包括:
   - 时间段 (例如: 0-7s)
   - 场景描述 (视觉细节)
   - 角色动作
   - 镜头类型 (Wide shot, Close-up, Medium shot 等)
   - 摄像机角度 (eye level, high angle, low angle 等)
   - 情绪氛围

用户输入的脚本:
{user_script}

视频时长:
{duration} 秒

剧情风格:
{story_style}

示例:
用户输入: "王子救公主的故事"
剧情风格: "反转"
优化后: "一位看似英勇的王子前往城堡营救公主,但到达后发现公主其实是伪装的恶龙,而真正的公主早已逃脱并成为了冒险家..."

请以 JSON 格式输出结果:
{
  "duration": 45,
  "shot_count": 6,
  "story_style": "反转",
  "characters": ["Prince", "Princess/Dragon", "Real Princess"],
  "shots": [
    {
      "shot_number": 1,
      "time_range": "0-7s",
      "description": "Prince 骑马来到城堡前,信心满满",
      "camera_angle": "Wide shot, low angle",
      "character_action": "Riding towards castle confidently",
      "mood": "Heroic and determined"
    },
    ...
  ]
}
```

#### 用户操作
1. 查看 AI 优化后的分镜脚本
2. (可选) 直接在文本框编辑分镜内容
3. 点击"确认并继续" → 进入步骤 2
4. 或点击"返回修改" → 回到阶段 0

#### 后端处理
- 调用 LLM API (GPT-OSS-120B 或 Claude)
- 解析 JSON 结果
- 提取人物列表 (用于步骤 2)
- 保存分镜脚本数据
- 如果用户编辑了脚本,需要重新调用 LLM 分析

---

### 步骤 2: 人物配置

#### 弹窗设计
```
┌─────────────────────────────────────────────────────┐
│  步骤 2/7: 人物配置                         [━━━━━●○○○○○○] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  👥 检测到 2 个人物角色,请为每个角色配置形象:         │
│                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  人物 1: Emma                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                     │
│  选择人物形象来源:                                   │
│  ● 从模板库选择  ○ 上传图片  ○ AI 生成新人物         │
│                                                     │
│  [模板库界面]                                        │
│  ┌───────┬───────┬───────┬───────┐                 │
│  │[图1]  │[图2]  │[图3]  │[图4]  │                 │
│  │女性A  │女性B  │女性C  │女性D  │                 │
│  └───────┴───────┴───────┴───────┘                 │
│                                                     │
│  已选择: 女性B - 年轻女性,长发,休闲装                │
│                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  人物 2: John                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                     │
│  选择人物形象来源:                                   │
│  ○ 从模板库选择  ● 上传图片  ○ AI 生成新人物         │
│                                                     │
│  [上传区域]                                          │
│  ┌───────────────────────────────────────────┐     │
│  │  📷 已上传 3 张图片                        │     │
│  │  [缩略图1] [缩略图2] [缩略图3] [+ 继续上传] │     │
│  └───────────────────────────────────────────┘     │
│                                                     │
│  💡 提示: 建议上传 3-5 张不同角度的照片               │
│                                                     │
│          [上一步]            [确认并继续]            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 三种人物来源方式

**方式 1: 从模板库选择**
```
模板库数据结构:
{
  "template_id": "female_casual_001",
  "name": "年轻女性 - 休闲风",
  "thumbnail": "https://cdn.../thumbnail.jpg",
  "reference_images": [
    "https://cdn.../ref_1.jpg",  // 正面
    "https://cdn.../ref_2.jpg",  // 侧面
    "https://cdn.../ref_3.jpg"   // 背面
  ],
  "tags": ["female", "young", "casual"],
  "description": "20-30岁女性,长发,休闲装扮"
}
```

**方式 2: 上传图片**
```
上传要求:
- 支持格式: JPG, PNG
- 单张大小: 最大 10MB
- 建议数量: 3-5 张
- 建议内容: 正面、侧面、背面、不同表情

后端处理:
- 上传到 CDN
- 生成缩略图
- 保存图片 URL 列表
```

**方式 3: AI 生成新人物**
```
┌─────────────────────────────────────────────┐
│  AI 生成新人物                               │
├─────────────────────────────────────────────┤
│                                             │
│  选择生成方式:                               │
│  ● 文生图  ○ 图生图                         │
│                                             │
│  [文生图界面]                                │
│  描述人物特征:                               │
│  ┌───────────────────────────────────┐     │
│  │ 例如: 25岁亚洲女性,短发,商务装扮,  │     │
│  │ 专业干练的气质...                 │     │
│  └───────────────────────────────────┘     │
│                                             │
│  风格选择: [写实] [动漫] [插画]              │
│                                             │
│            [生成]  [取消]                    │
│                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                             │
│  生成结果: (自动生成 3-5 张不同角度)          │
│  [生成图1] [生成图2] [生成图3]               │
│                                             │
│            [重新生成]  [确认使用]            │
│                                             │
└─────────────────────────────────────────────┘

[图生图界面]
上传参考图: [上传区域]
优化描述: [文本框]
          [生成]
```

#### 用户操作
1. 为每个检测到的人物选择形象来源
2. 如果选择模板库 → 点击选择模板
3. 如果上传图片 → 上传 3-5 张照片
4. 如果 AI 生成 → 输入描述或上传参考图,生成新人物
5. 确认所有人物配置完成 → 点击"确认并继续"

#### 后端处理
- 为每个人物保存选择的来源方式和对应的图片资源
- 如果是 AI 生成,调用图像生成 API (Seedream 4.5 或 Nano Banana)
- 验证所有人物都已配置
- 保存人物配置数据

---

### 步骤 3: 图片风格生成/选择

#### 弹窗设计
```
┌─────────────────────────────────────────────────────┐
│  步骤 3/7: 图片风格选择                     [━━━━━━━●○○○○] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🎨 选择分镜图的视觉风格                             │
│                                                     │
│  💡 提示: 图片风格 = 视频风格                        │
│  您选择的图片风格将决定分镜图和最终视频的视觉呈现     │
│                                                     │
│  ┌────────┬────────┬────────┬────────┐             │
│  │[预览图]│[预览图]│[预览图]│[预览图]│             │
│  │        │        │   ✓    │        │             │
│  │ 电影感 │赛博朋克│  写实  │  动漫  │             │
│  └────────┴────────┴────────┴────────┘             │
│                                                     │
│  ┌────────┬────────┬────────┬────────┐             │
│  │[预览图]│[预览图]│[预览图]│[预览图]│             │
│  │        │        │        │        │             │
│  │ 油画风 │ 水彩画 │ 黑白片 │ 复古风 │             │
│  └────────┴────────┴────────┴────────┘             │
│                                                     │
│  已选择: 写实风格                                    │
│  • 高清画质,自然光照                                 │
│  • 真实感强,适合日常场景                             │
│  • 色彩还原度高                                      │
│                                                     │
│          [上一步]            [确认并继续]            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 图片风格库数据结构

```json
{
  "style_id": "realistic_001",
  "name": "写实风格",
  "thumbnail": "https://cdn.../realistic_preview.jpg",
  "description": "高清画质,自然光照,真实感强,适合日常生活场景",
  "prompt_enhancement": [
    "photorealistic",
    "natural lighting",
    "high detail",
    "8k uhd",
    "professional photography",
    "cinematic"
  ],
  "negative_prompt": [
    "cartoon",
    "anime",
    "painting",
    "illustration",
    "artificial",
    "oversaturated",
    "low quality",
    "blurry"
  ],
  "category": "realistic",
  "tags": ["photography", "natural", "realistic", "cinematic"],
  "preview_images": [
    "https://cdn.../realistic_sample_1.jpg",
    "https://cdn.../realistic_sample_2.jpg",
    "https://cdn.../realistic_sample_3.jpg"
  ]
}
```

#### 图片风格选项

| 风格 | 说明 | 适用场景 | Prompt 关键词 |
|------|------|----------|--------------|
| **电影感** | 电影级构图和光照 | 剧情、故事性强的内容 | cinematic, film grain, dramatic lighting |
| **赛博朋克** | 未来科技、霓虹灯 | 科幻、未来题材 | cyberpunk, neon lights, futuristic |
| **写实** | 真实摄影风格 | 日常生活、纪实 | photorealistic, natural, realistic |
| **动漫** | 日式动画风格 | 卡通、二次元 | anime style, manga, illustrated |
| **油画风** | 艺术油画质感 | 艺术、复古题材 | oil painting, artistic, brush strokes |
| **水彩画** | 柔和水彩效果 | 温馨、清新题材 | watercolor, soft, pastel colors |
| **黑白片** | 经典黑白摄影 | 怀旧、文艺 | black and white, monochrome, vintage |
| **复古风** | 70-90年代复古 | 怀旧、复古题材 | retro, vintage, film photography |

#### 用户操作
1. 浏览图片风格库,点击选择一个风格
2. 预览该风格的示例图片(可选)
3. 点击"确认并继续" → 进入步骤 4

#### 后端处理
- 保存用户选择的图片风格
- 准备风格的 prompt_enhancement 和 negative_prompt
- 这些 prompt 将在步骤 4 生成分镜图时使用

---

### 步骤 4: 分镜图批量生成

#### 弹窗设计

**生成中状态:**
```
┌─────────────────────────────────────────────────────┐
│  步骤 4/7: 分镜图生成                       [━━━━━━━━━●○○] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🎬 正在批量生成 6 个分镜图...                        │
│                                                     │
│  ┌─────────────────────────────────────────┐       │
│  │ 分镜 1/6  ████████████████░░░░  80%     │       │
│  │ 分镜 2/6  ███████████████████░░  90%     │       │
│  │ 分镜 3/6  ████████████░░░░░░░░  60%     │       │
│  │ 分镜 4/6  ███░░░░░░░░░░░░░░░░░  15%     │       │
│  │ 分镜 5/6  ░░░░░░░░░░░░░░░░░░░░   0%     │       │
│  │ 分镜 6/6  ░░░░░░░░░░░░░░░░░░░░   0%     │       │
│  └─────────────────────────────────────────┘       │
│                                                     │
│  预计剩余时间: 约 30 秒                              │
│                                                     │
│  💡 提示: 所有分镜图会同时生成,请稍候...              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**生成完成状态:**
```
┌───────────────────────────────────────────────────────────┐
│  步骤 4/7: 分镜图生成                       [━━━━━━━━━●○○]     │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ✅ 所有分镜图已生成完成!                                   │
│                                                           │
│  💡 全局重新生成剩余次数: 3 次                              │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │  分镜 1 (0-7s)                         [重新生成] │     │
│  │  ┌───────────────────────────────┐              │     │
│  │  │                               │              │     │
│  │  │     [分镜图 1 缩略图]           │              │     │
│  │  │                               │              │     │
│  │  └───────────────────────────────┘              │     │
│  │  描述: Emma 站在海边,看着远方,表情平静             │     │
│  │  镜头: Wide shot, eye level                     │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │  分镜 2 (7-14s)                        [重新生成] │     │
│  │  ┌───────────────────────────────┐              │     │
│  │  │                               │              │     │
│  │  │     [分镜图 2 缩略图]           │              │     │
│  │  │                               │              │     │
│  │  └───────────────────────────────┘              │     │
│  │  描述: Emma 的脸部特写,眼神中带着回忆              │     │
│  │  镜头: Close-up, slightly tilted                │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  ... (展示所有 6 个分镜)                                   │
│                                                           │
│          [上一步]            [确认并继续]                  │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

#### 重新生成逻辑

**全局限制机制:**
```javascript
// 全局重新生成配额
const GLOBAL_REGENERATE_QUOTA = 3; // 整个项目总共 3 次

// 用户点击某个分镜的"重新生成"按钮
function regenerateShot(shotNumber) {
  if (remainingQuota <= 0) {
    showAlert("重新生成次数已用完,无法继续重新生成");
    return;
  }

  // 扣除配额
  remainingQuota--;

  // 调用 API 重新生成该分镜
  // 使用相同的 prompt,不允许修改
  regenerateShotAPI(shotNumber, originalPrompt);

  // 更新 UI 显示剩余次数
  updateQuotaDisplay(remainingQuota);
}
```

**重新生成规则:**
- 全局限制: 整个项目最多重新生成 3 次 (不是每张分镜 3 次)
- 不可修改 prompt: 重新生成时使用原始的 prompt 和参数
- 独立生成: 只重新生成选中的那一张分镜,不影响其他分镜
- 异步处理: 重新生成时显示加载状态,其他分镜保持可见

#### 技术实现

**批量生成 API 调用:**
```python
async def batch_generate_storyboards(shots: list, characters: dict, style: dict):
    """
    批量生成所有分镜图
    """
    tasks = []

    for shot in shots:
        # 构建完整的 prompt
        prompt = build_prompt(
            shot_description=shot['description'],
            camera_angle=shot['camera_angle'],
            mood=shot['mood'],
            style_enhancement=style['prompt_enhancement']
        )

        # 获取涉及的人物的参考图
        character_refs = []
        for char_name in shot['characters']:
            refs = characters[char_name]['reference_images']
            character_refs.extend(refs)

        # 创建异步任务
        task = generate_storyboard_image_async(
            prompt=prompt,
            negative_prompt=style['negative_prompt'],
            character_references=character_refs,
            shot_number=shot['shot_number']
        )
        tasks.append(task)

    # 并行执行所有任务
    results = await asyncio.gather(*tasks)

    return results
```

#### 用户操作
1. 等待所有分镜图生成完成
2. 查看每个分镜图
3. (可选) 点击某个分镜的"重新生成"按钮 (最多 3 次)
4. 确认所有分镜满意 → 点击"确认并继续"

#### 后端处理
- 并行调用图像生成 API (Seedream 4.5)
- 实时更新生成进度
- 保存所有分镜图 URL
- 跟踪重新生成配额

---

### 步骤 5: 视频片段批量生成

#### 弹窗设计

**生成中状态:**
```
┌─────────────────────────────────────────────────────┐
│  步骤 5/7: 视频片段生成                     [━━━━━━━━━━━●○] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🎥 正在批量生成 6 个视频片段...                      │
│                                                     │
│  ┌─────────────────────────────────────────┐       │
│  │ 片段 1/6  ████████████████████  生成中   │       │
│  │ 片段 2/6  ████████████████░░░░  生成中   │       │
│  │ 片段 3/6  ██████░░░░░░░░░░░░░  生成中   │       │
│  │ 片段 4/6  ░░░░░░░░░░░░░░░░░░░  等待中   │       │
│  │ 片段 5/6  ░░░░░░░░░░░░░░░░░░░  等待中   │       │
│  │ 片段 6/6  ░░░░░░░░░░░░░░░░░░░  等待中   │       │
│  └─────────────────────────────────────────┘       │
│                                                     │
│  预计剩余时间: 约 2-3 分钟                           │
│                                                     │
│  💡 提示: 视频生成较慢,请耐心等待...                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**生成完成状态:**
```
┌───────────────────────────────────────────────────────────┐
│  步骤 5/7: 视频片段生成                     [━━━━━━━━━━━●○]     │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ✅ 所有视频片段已生成完成!                                 │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │  片段 1 (0-7s)                   [▶️] [🔄 重试]   │     │
│  │  ┌───────────────────────────────┐              │     │
│  │  │                               │              │     │
│  │  │   [视频缩略图/首帧预览]         │              │     │
│  │  │                               │              │     │
│  │  └───────────────────────────────┘              │     │
│  │  描述: Emma 站在海边,看着远方,表情平静             │     │
│  │  时长: 7 秒 | 状态: ✅ 成功                      │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │  片段 2 (7-14s)                  [▶️] [🔄 重试]   │     │
│  │  ┌───────────────────────────────┐              │     │
│  │  │                               │              │     │
│  │  │   [视频缩略图/首帧预览]         │              │     │
│  │  │                               │              │     │
│  │  └───────────────────────────────┘              │     │
│  │  描述: Emma 的脸部特写,眼神中带着回忆              │     │
│  │  时长: 7 秒 | 状态: ✅ 成功                      │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  ... (展示所有 6 个片段)                                   │
│                                                           │
│          [上一步]            [确认并继续]                  │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**生成失败处理:**
```
┌─────────────────────────────────────────────────┐
│  片段 3 (14-21s)                  [▶️] [🔄 重试]  │
│  ┌───────────────────────────────┐              │
│  │                               │              │
│  │        ❌ 生成失败              │              │
│  │                               │              │
│  └───────────────────────────────┘              │
│  描述: John 从远处走来,向 Emma 招手               │
│  时长: 7 秒 | 状态: ❌ 失败                      │
│  错误: API 超时,请重试                          │
└─────────────────────────────────────────────────┘
```

#### 并行生成机制

```python
async def batch_generate_videos(storyboards: list):
    """
    并行生成所有视频片段
    """
    tasks = []

    for idx, storyboard in enumerate(storyboards):
        # 计算每个片段的时长
        shot_duration = calculate_shot_duration(
            total_duration=video_duration,
            shot_index=idx,
            total_shots=len(storyboards)
        )

        # 创建异步任务
        task = generate_video_from_storyboard_async(
            storyboard_image_url=storyboard['image_url'],
            motion_description=storyboard['character_action'],
            duration=shot_duration,
            shot_number=idx + 1
        )
        tasks.append(task)

    # 并行执行,但允许单独失败
    results = []
    for task in asyncio.as_completed(tasks):
        try:
            result = await task
            results.append(result)
        except Exception as e:
            # 记录失败,但不中断其他任务
            results.append({
                'status': 'failed',
                'error': str(e)
            })

    return results
```

#### 单独重试机制

```javascript
async function retryVideoGeneration(shotNumber) {
  // 获取原始的分镜图和参数
  const storyboard = storyboards[shotNumber - 1];

  // 更新 UI 为加载状态
  updateShotStatus(shotNumber, 'generating');

  try {
    // 重新生成该片段
    const result = await generateVideoAPI({
      storyboard_url: storyboard.image_url,
      motion_description: storyboard.character_action,
      duration: storyboard.duration
    });

    // 更新为成功状态
    updateShotStatus(shotNumber, 'success', result.video_url);

  } catch (error) {
    // 更新为失败状态
    updateShotStatus(shotNumber, 'failed', error.message);
  }
}
```

#### 用户操作
1. 等待所有视频片段生成完成
2. 点击 ▶️ 按钮预览每个视频片段
3. 如果某个片段生成失败 → 点击"重试"按钮
4. 确认所有片段生成成功 → 点击"确认并继续"

#### 后端处理
- 并行调用视频生成 API (Seedance 1.0 Pro)
- 实时更新每个片段的生成状态
- 处理失败情况,允许单独重试
- 保存所有视频片段 URL

---

### 步骤 6: 音乐和特效选择

#### 弹窗设计
```
┌─────────────────────────────────────────────────────┐
│  步骤 6/7: 音乐和特效选择                   [━━━━━━━━━━━━━●] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🎵 选择背景音乐                                     │
│                                                     │
│  音乐风格:                                          │
│  ┌────────┬────────┬────────┬────────┐             │
│  │[图标]  │[图标]  │[图标]  │[图标]  │             │
│  │   ✓    │        │        │        │             │
│  │ 轻快   │ 悲伤   │ 史诗   │ 电子   │             │
│  └────────┴────────┴────────┴────────┘             │
│                                                     │
│  ┌────────┬────────┬────────┬────────┐             │
│  │[图标]  │[图标]  │[图标]  │[图标]  │             │
│  │        │        │        │        │             │
│  │ 爵士   │ 古典   │ 摇滚   │ 氛围   │             │
│  └────────┴────────┴────────┴────────┘             │
│                                                     │
│  或使用 Suno AI 生成定制音乐:                        │
│  ┌───────────────────────────────────────────┐     │
│  │ 描述音乐氛围:                              │     │
│  │ (例如: peaceful beach scene, warm...)     │     │
│  └───────────────────────────────────────────┘     │
│  [🎵 生成定制音乐]                                  │
│                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                                     │
│  🎬 选择转场特效                                     │
│                                                     │
│  转场风格:                                          │
│  ┌────────┬────────┬────────┬────────┐             │
│  │[预览]  │[预览]  │[预览]  │[预览]  │             │
│  │        │   ✓    │        │        │             │
│  │淡入淡出│交叉溶解│左滑动  │缩放    │             │
│  └────────┴────────┴────────┴────────┘             │
│                                                     │
│  转场时长: [0.3s ▼] [0.5s] [0.8s] [1.0s]           │
│                                                     │
│  💡 提示: 转场特效会应用到所有分镜之间                │
│                                                     │
│          [上一步]            [确认并继续]            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 音乐选择方式

**方式 1: 从模板库选择**
```json
{
  "music_id": "upbeat_001",
  "name": "轻快 - 阳光海滩",
  "file_url": "https://cdn.../upbeat_001.mp3",
  "duration": 60,
  "style": "upbeat",
  "mood": ["happy", "energetic", "bright"],
  "preview_url": "https://cdn.../preview_001.mp3"
}
```

**方式 2: Suno AI 生成定制音乐**
```python
async def generate_custom_music(mood_description: str, duration: int):
    """
    使用 Suno AI 生成定制背景音乐
    """
    api_url = "https://api.kie.ai/v1/suno/generate"

    payload = {
        "model": "suno-v4.5-plus",
        "prompt": f"{mood_description}, instrumental background music, {duration} seconds",
        "make_instrumental": True,
        "duration": duration,
        "wait_audio": True
    }

    result = await call_api(api_url, payload)
    return result['audio_url']
```

#### 转场特效库

```python
TRANSITION_EFFECTS = {
    'fade': {
        'name': '淡入淡出',
        'ffmpeg_filter': 'fade',
        'default_duration': 0.5,
        'preview_gif': 'fade_preview.gif'
    },
    'dissolve': {
        'name': '交叉溶解',
        'ffmpeg_filter': 'xfade',
        'default_duration': 0.8,
        'preview_gif': 'dissolve_preview.gif'
    },
    'slide_left': {
        'name': '左滑动',
        'ffmpeg_filter': 'xfade=transition=slideleft',
        'default_duration': 0.6,
        'preview_gif': 'slide_preview.gif'
    },
    'zoom': {
        'name': '缩放',
        'ffmpeg_filter': 'xfade=transition=zoomin',
        'default_duration': 0.5,
        'preview_gif': 'zoom_preview.gif'
    }
}
```

#### 用户操作
1. 选择音乐风格 (模板库 或 生成定制音乐)
2. 如果选择生成定制音乐 → 输入描述 → 点击"生成"
3. 选择转场特效风格
4. 调整转场时长 (可选)
5. 点击"确认并继续" → 进入步骤 7

#### 后端处理
- 如果用户选择 Suno AI 生成 → 调用 Kie.ai API
- 保存音乐文件 URL
- 保存转场特效配置
- 准备最终合成参数

---

### 步骤 7: 最终合成

#### 弹窗设计

**合成中状态:**
```
┌─────────────────────────────────────────────────────┐
│  步骤 7/7: 最终合成                         [━━━━━━━━━━━━━━●] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🎬 正在合成最终视频...                              │
│                                                     │
│  进度:                                              │
│  ┌─────────────────────────────────────────┐       │
│  │ ✅ 视频片段拼接                          │       │
│  │ ⏳ 添加转场特效          ████████░░  80% │       │
│  │ ⏸️  混音背景音乐                          │       │
│  │ ⏸️  最终渲染                              │       │
│  └─────────────────────────────────────────┘       │
│                                                     │
│  预计剩余时间: 约 1 分钟                             │
│                                                     │
│  💡 提示: 正在处理转场特效,请稍候...                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**合成完成状态:**
```
┌─────────────────────────────────────────────────────┐
│  🎉 视频生成完成!                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────┐     │
│  │                                           │     │
│  │                                           │     │
│  │         [最终视频预览播放器]               │     │
│  │                                           │     │
│  │                                           │     │
│  └───────────────────────────────────────────┘     │
│                                                     │
│  视频信息:                                          │
│  • 时长: 45 秒                                      │
│  • 分辨率: 1080p                                    │
│  • 文件大小: 12.5 MB                                │
│  • 格式: MP4                                        │
│                                                     │
│  ┌───────────────────────────────────────────┐     │
│  │  📊 生成统计                               │     │
│  │  • 分镜数量: 6 个                          │     │
│  │  • 人物数量: 2 个                          │     │
│  │  • 使用风格: 写实                          │     │
│  │  • 总耗时: 约 5 分钟                       │     │
│  └───────────────────────────────────────────┘     │
│                                                     │
│          [保存草稿]      [下载视频]    [返回编辑]   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 合成流程

```python
async def compose_final_video(
    video_clips: list,
    transition_effect: dict,
    music_url: str,
    output_path: str
) -> str:
    """
    使用 FFmpeg 合成最终视频
    """
    # 步骤 1: 下载背景音乐
    background_music = await download_file(music_url)

    # 步骤 2: 创建视频拼接列表
    concat_list = create_concat_list(video_clips)

    # 步骤 3: 拼接视频片段
    temp_concat = "temp_concat.mp4"
    await ffmpeg_concat_videos(concat_list, temp_concat)

    # 步骤 4: 添加转场特效
    temp_with_transitions = "temp_transitions.mp4"
    await ffmpeg_add_transitions(
        input_video=temp_concat,
        output_video=temp_with_transitions,
        transition_type=transition_effect['ffmpeg_filter'],
        transition_duration=transition_effect['duration']
    )

    # 步骤 5: 混音背景音乐
    await ffmpeg_add_audio(
        input_video=temp_with_transitions,
        input_audio=background_music,
        output_video=output_path
    )

    # 步骤 6: 清理临时文件
    cleanup_temp_files([concat_list, temp_concat, temp_with_transitions, background_music])

    return output_path
```

#### FFmpeg 转场实现示例

```bash
# 淡入淡出转场
ffmpeg -i clip1.mp4 -i clip2.mp4 \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=6.5[vout]" \
  -map "[vout]" output.mp4

# 交叉溶解转场
ffmpeg -i clip1.mp4 -i clip2.mp4 \
  -filter_complex "[0:v][1:v]xfade=transition=dissolve:duration=0.8:offset=6.2[vout]" \
  -map "[vout]" output.mp4

# 滑动转场
ffmpeg -i clip1.mp4 -i clip2.mp4 \
  -filter_complex "[0:v][1:v]xfade=transition=slideleft:duration=0.6:offset=6.4[vout]" \
  -map "[vout]" output.mp4
```

#### 用户操作
1. 等待视频合成完成
2. 预览最终视频
3. 选择操作:
   - 下载视频 → 保存到本地
   - 保存草稿 → 保存项目,稍后继续编辑
   - 返回编辑 → 回到某个步骤重新调整

#### 后端处理
- 调用 FFmpeg 进行视频合成
- 实时更新合成进度
- 生成最终视频文件
- 保存到 CDN
- 记录生成统计数据

---

## 💾 数据模型设计

### 项目数据结构

```typescript
interface VideoAgentProject {
  // 基础信息
  project_id: string;
  user_id: string;
  created_at: timestamp;
  updated_at: timestamp;
  status: 'draft' | 'processing' | 'completed' | 'failed';

  // 步骤 0: 用户输入
  input: {
    duration: 15 | 30 | 45 | 60;  // 秒
    story_style: 'auto' | '搞笑' | '猎奇' | '警世' | '反转' | '悬疑' | '温情' | '励志';  // 剧情风格
    original_script: string;
  };

  // 步骤 1: 脚本分析
  script_analysis: {
    shot_count: number;
    characters: string[];
    shots: Shot[];
    story_style: string;  // 应用的剧情风格
  };

  // 步骤 2: 人物配置
  character_config: {
    [character_name: string]: {
      source: 'template' | 'upload' | 'ai_generate';
      reference_images: string[];  // URLs
      template_id?: string;
    };
  };

  // 步骤 3: 图片风格
  image_style_config: {
    style_id: string;
    style_name: string;  // 如: "写实", "动漫", "电影感"
    prompt_enhancement: string[];
    negative_prompt: string[];
  };

  // 步骤 4: 分镜图
  storyboards: {
    [shot_number: number]: {
      image_url: string;
      generation_attempts: number;
      status: 'success' | 'failed';
    };
  };
  regenerate_quota_remaining: number;

  // 步骤 5: 视频片段
  video_clips: {
    [shot_number: number]: {
      video_url: string;
      duration: number;
      retry_count: number;
      status: 'success' | 'failed' | 'generating';
    };
  };

  // 步骤 6: 音乐和特效
  post_production: {
    music: {
      source: 'template' | 'suno_ai';
      music_id?: string;
      music_url: string;
      style: string;
    };
    transition: {
      effect_type: 'fade' | 'dissolve' | 'slide_left' | 'zoom';
      duration: number;
    };
  };

  // 步骤 7: 最终视频
  final_video: {
    video_url: string;
    file_size: number;
    resolution: string;
    total_generation_time: number;
  };
}

interface Shot {
  shot_number: number;
  time_range: string;  // "0-7s"
  description: string;
  camera_angle: string;
  character_action: string;
  characters: string[];  // 该分镜涉及的人物
  mood: string;
}
```

### 数据库表设计

```sql
-- 项目主表
CREATE TABLE video_agent_projects (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  duration INT,
  original_script TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);

-- 脚本分析表
CREATE TABLE project_script_analysis (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36),
  shot_count INT,
  characters JSON,
  shots JSON,
  FOREIGN KEY (project_id) REFERENCES video_agent_projects(id) ON DELETE CASCADE
);

-- 人物配置表
CREATE TABLE project_character_config (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36),
  character_name VARCHAR(100),
  source VARCHAR(20),
  reference_images JSON,
  template_id VARCHAR(36),
  FOREIGN KEY (project_id) REFERENCES video_agent_projects(id) ON DELETE CASCADE
);

-- 分镜图表
CREATE TABLE project_storyboards (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36),
  shot_number INT,
  image_url VARCHAR(500),
  generation_attempts INT DEFAULT 1,
  status VARCHAR(20),
  FOREIGN KEY (project_id) REFERENCES video_agent_projects(id) ON DELETE CASCADE
);

-- 视频片段表
CREATE TABLE project_video_clips (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36),
  shot_number INT,
  video_url VARCHAR(500),
  duration FLOAT,
  retry_count INT DEFAULT 0,
  status VARCHAR(20),
  FOREIGN KEY (project_id) REFERENCES video_agent_projects(id) ON DELETE CASCADE
);

-- 最终视频表
CREATE TABLE project_final_videos (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36),
  video_url VARCHAR(500),
  file_size BIGINT,
  resolution VARCHAR(20),
  total_generation_time INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES video_agent_projects(id) ON DELETE CASCADE
);
```

---

## 🎨 前端技术栈

### 技术选型
```
前端框架: Next.js 15 (App Router)
UI 库: React 19
样式方案: Tailwind CSS
组件库: shadcn/ui
状态管理: Zustand
表单处理: React Hook Form
文件上传: react-dropzone
视频播放: video.js
进度显示: react-circular-progressbar
弹窗管理: Dialog (Radix UI)
```

### 核心组件结构

```
src/app/studio/video-agent-beta/
├── page.tsx                    # 主页面
├── components/
│   ├── InputStage.tsx          # 阶段 0: 用户输入
│   ├── StepDialog.tsx          # 弹窗容器组件
│   ├── ProgressBar.tsx         # 步骤进度条
│   │
│   ├── Step1_ScriptAnalysis/
│   │   ├── AnalyzingView.tsx   # 分析中视图
│   │   └── ResultView.tsx      # 分析结果视图
│   │
│   ├── Step2_CharacterConfig/
│   │   ├── CharacterCard.tsx   # 人物卡片
│   │   ├── TemplateSelector.tsx
│   │   ├── ImageUploader.tsx
│   │   └── AIGenerator.tsx
│   │
│   ├── Step3_ImageStyleSelect/
│   │   └── ImageStyleGallery.tsx
│   │
│   ├── Step4_StoryboardGen/
│   │   ├── GeneratingView.tsx
│   │   └── StoryboardGrid.tsx
│   │
│   ├── Step5_VideoGen/
│   │   ├── GeneratingView.tsx
│   │   └── VideoClipGrid.tsx
│   │
│   ├── Step6_MusicEffect/
│   │   ├── MusicSelector.tsx
│   │   └── TransitionSelector.tsx
│   │
│   └── Step7_FinalCompose/
│       ├── ComposingView.tsx
│       └── CompletedView.tsx
│
├── hooks/
│   ├── useVideoAgentProject.ts # 项目状态管理
│   ├── useStepNavigation.ts    # 步骤导航逻辑
│   └── useAPICall.ts           # API 调用封装
│
└── utils/
    ├── apiClient.ts
    ├── fileUpload.ts
    └── validation.ts
```

---

## 🔧 后端技术栈

### 技术选型
```
后端框架: FastAPI (Python)
数据库: PostgreSQL
缓存: Redis
任务队列: Celery
视频处理: FFmpeg
文件存储: AWS S3 / Cloudflare R2
日志: Python logging + File output
```

### API 端点设计

```python
# 项目管理
POST   /api/v1/video-agent/projects          # 创建新项目
GET    /api/v1/video-agent/projects/{id}     # 获取项目详情
PUT    /api/v1/video-agent/projects/{id}     # 更新项目
DELETE /api/v1/video-agent/projects/{id}     # 删除项目

# 步骤 1: 脚本分析
POST   /api/v1/video-agent/projects/{id}/analyze-script

# 步骤 2: 人物配置
POST   /api/v1/video-agent/projects/{id}/characters
POST   /api/v1/video-agent/projects/{id}/characters/upload
POST   /api/v1/video-agent/projects/{id}/characters/generate

# 步骤 3: 图片风格选择
POST   /api/v1/video-agent/projects/{id}/image-style

# 步骤 4: 分镜生成
POST   /api/v1/video-agent/projects/{id}/storyboards/generate
POST   /api/v1/video-agent/projects/{id}/storyboards/{shot_num}/regenerate

# 步骤 5: 视频生成
POST   /api/v1/video-agent/projects/{id}/videos/generate
POST   /api/v1/video-agent/projects/{id}/videos/{shot_num}/retry
GET    /api/v1/video-agent/projects/{id}/videos/status

# 步骤 6: 音乐和特效
POST   /api/v1/video-agent/projects/{id}/music
POST   /api/v1/video-agent/projects/{id}/transition

# 步骤 7: 最终合成
POST   /api/v1/video-agent/projects/{id}/compose
GET    /api/v1/video-agent/projects/{id}/compose/status

# 草稿管理
POST   /api/v1/video-agent/projects/{id}/save-draft
GET    /api/v1/video-agent/projects/{id}/restore-draft
```

### 核心服务模块

```
src/api/video_agent/
├── __init__.py
├── router.py              # 路由定义
├── models.py              # 数据模型
├── schemas.py             # Pydantic schemas
├── dependencies.py        # 依赖注入
│
├── services/
│   ├── script_analyzer.py      # 脚本分析服务(含剧情风格处理)
│   ├── character_manager.py    # 人物配置服务
│   ├── image_style_processor.py # 图片风格处理服务
│   ├── storyboard_generator.py # 分镜生成服务
│   ├── video_generator.py      # 视频生成服务
│   ├── music_generator.py      # 音乐生成服务
│   └── video_composer.py       # 视频合成服务
│
├── tasks/                 # Celery 异步任务
│   ├── generate_storyboards.py
│   ├── generate_videos.py
│   └── compose_final_video.py
│
└── utils/
    ├── llm_client.py      # LLM API 客户端
    ├── image_gen_client.py # 图像生成客户端
    ├── video_gen_client.py # 视频生成客户端
    ├── ffmpeg_wrapper.py   # FFmpeg 封装
    └── storage_client.py   # 文件存储客户端
```

---

## 💰 成本估算

### 单个 45 秒视频成本 (6 个分镜)

| 环节 | 服务 | 数量 | 单价 | 小计 | 备注 |
|------|------|------|------|------|------|
| 脚本分析 | GPT-OSS-120B | 1 次 | $0.001 | $0.001 | |
| 人物生成 (如需) | Seedream 4.5 | 0-2 次 | $0.03 | $0-0.06 | 可选 |
| 分镜生成 | Seedream 4.5 | 6 张 | $0.03 | $0.18 | |
| 分镜重生成 | Seedream 4.5 | 0-3 次 | $0.03 | $0-0.09 | 可选 |
| 视频生成 | Seedance 1.0 Pro | 6 片段 | $0.10 | $0.60 | |
| 视频重试 | Seedance 1.0 Pro | 0-2 次 | $0.10 | $0-0.20 | 可选 |
| 背景音乐 | Suno AI (Kie.ai) | 1 首 | $0.05 | $0.05 | 如用模板库则 $0 |
| FFmpeg 处理 | 自建 | - | - | $0.02 | 服务器成本 |
| **总计 (最低)** | | | | **$0.86** | 无重生成,用模板音乐 |
| **总计 (平均)** | | | | **$1.05** | 1-2 次重生成 |
| **总计 (最高)** | | | | **$1.21** | 最大重生成次数 |

### 批量成本 (1000 个视频)

```
预期单价: $0.90-1.00 (考虑批量折扣)
总成本: $900-1000
```

---

## ⚠️ 风险评估与缓解

### 风险矩阵

| 风险 | 概率 | 影响 | 等级 | 缓解措施 |
|------|------|------|------|---------|
| **API 限流导致生成失败** | 中 | 高 | ⚠️⚠️⚠️ | 1. 实现重试机制<br>2. 分批处理<br>3. 申请企业配额 |
| **视频生成时间过长** | 高 | 中 | ⚠️⚠️ | 1. 显示预计等待时间<br>2. 支持后台生成+邮件通知 |
| **重新生成配额不足** | 低 | 低 | ⚠️ | 1. 清晰提示剩余次数<br>2. 提供付费增加配额选项 |
| **音乐版权问题** | 中 | 高 | ⚠️⚠️⚠️ | 1. 使用 Suno AI 生成<br>2. 模板库使用免版权音乐<br>3. 添加版权声明 |
| **用户流失 (流程太长)** | 高 | 高 | ⚠️⚠️⚠️ | 1. 草稿自动保存<br>2. 优化每步操作时间<br>3. 提供跳过某些步骤的选项 |
| **成本超预算** | 低 | 中 | ⚠️⚠️ | 1. 严格限制重生成次数<br>2. 批量优化<br>3. 缓存常用资源 |

### 关键验证点

```
上线前必须验证:

1. LLM 脚本分析准确性 ⭐️⭐️⭐️⭐️⭐️
   测试方法: 20 个不同格式的脚本测试
   成功标准: 90% 以上正确识别人物和分镜

2. 人物一致性 ⭐️⭐️⭐️⭐️⭐️
   测试方法: 6 张连续分镜,同一人物
   成功标准: 面部一致性 ≥ 85%

3. 视频生成成功率 ⭐️⭐️⭐️⭐️
   测试方法: 100 个视频片段生成
   成功标准: 成功率 ≥ 95%

4. 用户体验流畅度 ⭐️⭐️⭐️⭐️
   测试方法: 10 个用户完整流程测试
   成功标准: 完成率 ≥ 80%, 平均完成时间 < 10 分钟
```

---

## 📅 实施计划

### Phase 1: 设计评审 (1 周, 12月9-15日)

```
Week 1:
├─ 产品设计评审会
├─ 技术方案评审会
├─ UI/UX 设计稿评审
├─ 确定最终方案
└─ 完成技术选型
```

### Phase 2: 前端开发 (2 周, 12月16-29日)

```
Week 2 (12月16-22日):
├─ 搭建项目框架
├─ 实现阶段 0: 用户输入界面(含剧情风格选择)
├─ 实现步骤 1-3: 脚本分析、人物配置、图片风格选择
└─ 组件开发和状态管理

Week 3 (12月23-29日):
├─ 实现步骤 4-7: 分镜生成、视频生成、音乐特效、合成
├─ 实现弹窗和步骤导航
├─ 实现草稿保存功能
└─ 前端单元测试
```

### Phase 3: 后端开发 (2 周, 12月16-29日, 与前端并行)

```
Week 2 (12月16-22日):
├─ 搭建 FastAPI 项目
├─ 设计数据库 schema
├─ 实现 LLM 脚本分析服务(含剧情风格处理)
├─ 实现人物配置服务
└─ 实现图片风格处理服务

Week 3 (12月23-29日):
├─ 实现分镜生成服务 (对接 Seedream 4.5)
├─ 实现视频生成服务 (对接 Seedance 1.0 Pro)
├─ 实现音乐生成服务 (对接 Kie.ai Suno)
├─ 实现 FFmpeg 视频合成服务
└─ 后端单元测试
```

### Phase 4: 集成测试 (1 周, 12月30日-1月5日)

```
Week 4:
├─ 前后端集成
├─ 端到端测试
├─ 性能优化
├─ Bug 修复
└─ 准备 Beta 测试
```

### Phase 5: Beta 测试 (2 周, 1月6-19日)

```
Week 5-6:
├─ 邀请 10-20 个内测用户
├─ 收集用户反馈
├─ 迭代优化
├─ 修复关键 Bug
└─ 准备正式上线
```

### Phase 6: 正式上线 (1月20日+)

```
上线准备:
├─ 服务器部署
├─ 监控系统配置
├─ 文档完善
└─ 用户引导教程

持续迭代:
├─ 用户反馈收集
├─ 功能优化
├─ 成本优化
└─ 新功能开发
```

---

## 📊 成功指标 (KPI)

### 功能指标
- **生成成功率:** ≥ 90%
- **平均生成时间:** ≤ 8 分钟 (45 秒视频)
- **人物一致性:** ≥ 85%
- **用户满意度:** ≥ 4.0/5.0

### 业务指标
- **Beta 期间完成视频数:** ≥ 100 个
- **用户留存率 (D7):** ≥ 40%
- **功能完成率:** ≥ 80% (用户从输入到下载的完成率)
- **平均单视频成本:** ≤ $1.10

---

## 📝 待讨论事项

### 产品设计层面
1. ❓ 是否需要提供"快速模式"(跳过某些确认步骤)?
2. ❓ 重新生成配额是否可以付费增加?
3. ❓ 是否允许用户在步骤 6 之前预览拼接后的视频 (无音乐)?
4. ❓ 是否需要提供模板工作流 (预设的人物+风格组合)?

### 技术实现层面
1. ❓ 视频生成失败后,是否需要降级方案 (例如切换到其他模型)?
2. ❓ 草稿保存的有效期是多久?
3. ❓ 是否需要支持导出项目配置 (JSON),方便用户复用?
4. ❓ 是否需要实现 Webhook 通知 (视频生成完成后通知用户)?

### 成本优化层面
1. ❓ 是否可以缓存常用人物的 LoRA 权重?
2. ❓ 是否可以复用相似场景的分镜图?
3. ❓ 是否需要与 BytePlus 谈判批量折扣?

---

## 📚 参考资料

### 技术文档
1. **BytePlus ModelArk 文档**
   - https://docs.byteplus.com/en/docs/ModelArk/1159178

2. **Kie.ai Suno API 文档**
   - https://kie.ai/suno-api

3. **FFmpeg 官方文档**
   - https://ffmpeg.org/documentation.html

### 竞品参考
1. **LTX Studio** - 步进式交互设计
2. **Runway Gen-3** - 视频生成 UX
3. **Pika Labs** - 简化版视频生成流程

---

## ✅ 下一步行动

### 本周必须完成 (12月9-15日):

- [ ] 产品设计评审会
  - [ ] 确认所有流程细节
  - [ ] 确认 UI/UX 设计方向
  - [ ] 解决待讨论事项

- [ ] 技术准备
  - [ ] 注册/配置 BytePlus API
  - [ ] 注册/配置 Kie.ai API
  - [ ] 搭建开发环境

- [ ] 原型验证
  - [ ] 测试 Seedream 4.5 人物一致性
  - [ ] 测试 Seedance 1.0 Pro 视频生成
  - [ ] 测试 Suno AI 音乐生成

---

**文档结束**
