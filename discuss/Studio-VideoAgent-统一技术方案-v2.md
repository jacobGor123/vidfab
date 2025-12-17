# Studio Video Agent - 统一技术方案 v2.0

**文档版本:** v2.0
**创建日期:** 2025-12-09
**最后更新:** 2025-12-09
**状态:** 技术评审
**项目:** VidFab Studio - Video Agent Beta 功能
**位置:** `/studio/video-agent-beta`

---

## 📋 执行摘要

本文档整合了**产品设计方案**和**技术方案**,基于现有 VidFab 架构,详细说明 Studio 路径下 Video Agent Beta 功能的完整技术实现方案。

### 核心定位

- **产品形态:** `/studio` 路径下的 Beta 功能模块（非独立平台）
- **用户群体:** VidFab 现有用户 + 新用户（海外英文为主）
- **核心价值:** 从脚本到成片的全流程 AI 自动化视频生成
- **技术栈:** 基于现有 VidFab 技术栈扩展

### 与现有 Studio 的区别

```
现有 Studio 功能:
├─ Text-to-Video / Image-to-Video
├─ 单个视频片段生成
├─ 用户手动配置参数
└─ 适合单一场景视频

Video Agent Beta:
├─ 脚本自动分镜 (LLM)
├─ 批量生成分镜图 (Seedream 4.5)
├─ 批量生成视频片段 (Seedance 1.0 Pro)
├─ 自动合成完整视频 (FFmpeg)
└─ 适合多场景叙事视频 (30-60秒)
```

---

## 🏗️ 技术架构概览

### 整体技术栈（基于现有系统）

```yaml
┌─────────────────────────────────────────────────────────┐
│             VidFab Studio Video Agent 技术栈              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  前端层 (复用现有)                                        │
│  ├─ Next.js 15 (App Router)                            │
│  ├─ React 19                                           │
│  ├─ Tailwind CSS + shadcn/ui                          │
│  ├─ Zustand (状态管理)                                  │
│  └─ NextAuth 4.x (认证)                                │
│                                                         │
│  API 层 (扩展现有)                                        │
│  ├─ Next.js API Routes                                 │
│  ├─ /api/video-agent/* (新增)                          │
│  └─ /api/video/* (复用)                                │
│                                                         │
│  业务逻辑层 (新增)                                        │
│  ├─ 脚本分析服务 (GPT-OSS-120B)                         │
│  ├─ 分镜生成服务 (Seedream 4.5)                         │
│  ├─ 视频生成服务 (Seedance 1.0 Pro) ✅ 已有             │
│  ├─ 音乐生成服务 (Suno AI via Kie.ai)                  │
│  └─ 视频合成服务 (FFmpeg)                               │
│                                                         │
│  数据层 (扩展现有)                                        │
│  ├─ Supabase (PostgreSQL) ✅ 已有                       │
│  ├─ 新增表: video_agent_projects                        │
│  ├─ 新增表: project_characters                         │
│  ├─ 新增表: project_shots                              │
│  └─ 新增表: project_storyboards                        │
│                                                         │
│  外部服务 (BytePlus 全家桶)                               │
│  ├─ GPT-OSS-120B (脚本分析)                            │
│  ├─ Seedream 4.5 (分镜图生成)                          │
│  ├─ Seedance 1.0 Pro (视频生成) ✅ 已接入                │
│  └─ Kie.ai Suno API (配乐生成)                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 与现有系统的集成点

| 现有系统模块 | Video Agent 复用方式 | 新增/修改 |
|------------|-------------------|---------|
| **用户认证** | 完全复用 NextAuth 4.x | 无需修改 |
| **积分系统** | 复用 `checkUserCredits` + `deductUserCredits` | 新增积分计算规则 |
| **订阅管理** | 复用 Stripe 订阅表 | 无需修改 |
| **视频生成** | 复用 Seedance API 调用逻辑 | ✅ 已有,无需修改 |
| **存储服务** | 复用 Supabase Storage | 扩展 bucket 配置 |
| **水印控制** | 复用现有水印逻辑 | ✅ 已有,无需修改 |

---

## 🔄 完整产品流程与技术实现

### 流程总览

```
阶段 0: 用户输入
  ├─ 时长选择 (15s/30s/45s/60s)
  ├─ 剧情风格 (Auto/搞笑/猎奇/警世/反转/悬疑/温情/励志)
  └─ 脚本输入 (任意格式)
    ↓
步骤 1: 脚本分析与优化 (GPT-OSS-120B)
  ├─ 识别脚本格式
  ├─ 根据剧情风格优化延伸
  ├─ 提取人物角色
  └─ 生成结构化分镜数据
    ↓
步骤 2: 人物配置
  ├─ 方式1: 从模板库选择
  ├─ 方式2: 上传参考图 (3-5张)
  └─ 方式3: AI 生成人物 (Seedream 4.5)
    ↓
步骤 3: 图片风格选择
  └─ 选择分镜图风格 (写实/动漫/电影感/赛博朋克等)
    ↓
步骤 4: 分镜图批量生成 (Seedream 4.5)
  ├─ 并行生成所有分镜图
  ├─ 支持单独重新生成 (全局限制3次)
  └─ 保持角色一致性
    ↓
步骤 5: 视频片段批量生成 (Seedance 1.0 Pro)
  ├─ Image-to-Video 模式
  ├─ 并行生成所有片段
  └─ 支持单独重试
    ↓
步骤 6: 音乐和特效选择
  ├─ 音乐: 模板库 或 Suno AI 生成
  └─ 转场: 淡入淡出/交叉溶解/滑动/缩放
    ↓
步骤 7: 最终合成 (FFmpeg)
  ├─ 视频片段拼接
  ├─ 添加转场特效
  ├─ 混音背景音乐
  └─ 输出最终视频
```

---

## 🧩 核心模块详细设计

### 模块 1: 脚本分析与优化

#### 技术选型: **GPT-OSS-120B** (BytePlus ModelArk)

**选择理由:**
- ✅ 成本极低: $0.04/M tokens (GPT-4o 的 1/60)
- ✅ 英文性能优秀: MMLU 90% (接近 GPT-4o 的 93%)
- ✅ 已接入 BytePlus,零额外集成成本
- ✅ 128K 上下文窗口,足够处理长脚本

#### LLM Prompt 设计

```python
SCRIPT_ANALYSIS_PROMPT = """
你是一个专业的视频分镜脚本编剧。请分析以下用户输入的脚本,并完成以下任务:

1. **识别脚本格式**: 判断是纯文字描述、结构化分镜、还是故事大纲
2. **剧情风格处理**: 根据用户选择的剧情风格 `{story_style}` 优化和延伸脚本:
   - **Auto**: 根据脚本内容自然延伸,不刻意强化特定风格
   - **搞笑**: 增加笑点、夸张表现、喜剧冲突
   - **猎奇**: 加入不寻常元素、反常规设定
   - **警世**: 强化道德寓意、社会批判
   - **反转**: 设置悬念、埋伏笔、安排反转结局
   - **悬疑**: 营造悬念、设置谜团
   - **温情**: 强化情感、人物关系、温馨氛围
   - **励志**: 突出挑战、成长、正面价值观

3. **人物提取**: 提取所有出现的人物角色,列出人物名称
4. **分镜拆分**: 根据视频时长 `{duration}` 秒,将脚本拆分为 N 个分镜
   - 15s = 3 个分镜
   - 30s = 5 个分镜
   - 45s = 6-7 个分镜
   - 60s = 8 个分镜

5. **分镜描述**: 为每个分镜生成详细描述,包括:
   - 时间段 (例如: "0-7s")
   - 场景视觉描述 (具体细节)
   - 角色动作
   - 镜头类型 (Wide shot, Close-up, Medium shot 等)
   - 摄像机角度 (eye level, high angle, low angle 等)
   - 情绪氛围

**用户输入:**
- 脚本: {user_script}
- 时长: {duration} 秒
- 剧情风格: {story_style}

**输出格式 (严格JSON):**
{
  "duration": 45,
  "shot_count": 6,
  "story_style": "反转",
  "characters": ["Prince", "Princess/Dragon", "Real Princess"],
  "shots": [
    {
      "shot_number": 1,
      "time_range": "0-7s",
      "description": "Prince riding towards castle confidently on a white horse",
      "camera_angle": "Wide shot, low angle",
      "character_action": "Riding with determination, sword gleaming in sunlight",
      "characters": ["Prince"],
      "mood": "Heroic and determined"
    },
    ...
  ]
}
"""
```

#### API 实现

```typescript
// /app/api/video-agent/projects/[id]/analyze-script/route.ts
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorized()

  const { projectId, script, duration, storyStyle } = await request.json()

  // 调用 GPT-OSS-120B
  const prompt = buildScriptAnalysisPrompt(script, duration, storyStyle)

  const response = await bytePlusClient.request('/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: 'gpt-oss-120b',
      messages: [
        { role: 'system', content: SCRIPT_ANALYSIS_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })
  })

  // 解析和验证 JSON
  const analysis = JSON.parse(response.choices[0].message.content)

  // 保存到数据库
  await supabaseAdmin
    .from('video_agent_projects')
    .update({
      script_analysis: analysis,
      current_step: 2,
      step_1_status: 'completed'
    })
    .eq('id', projectId)

  return NextResponse.json({ success: true, data: analysis })
}
```

---

### 模块 2: 分镜图生成 (角色一致性)

#### 技术选型: **Seedream 4.5** (BytePlus ModelArk)

**核心优势:**
- ⭐⭐⭐⭐⭐ **角色一致性**: "显著减少身份漂移"
- ✅ 原生 4K 分辨率
- ✅ 支持 6-10 张参考图
- ✅ 批量生成最多 9 张/次
- ✅ 电影级渲染质量

#### 关键问题: **Seedream 4.5 发布时间待确认**

```
⚠️ 风险评估:
├─ 概率: 中
├─ 影响: 高
└─ 缓解措施:
    ├─ Plan A: 等待 Seedream 4.5 正式发布 (优先)
    ├─ Plan B: 先用 Seedream 4.0 开发原型
    └─ Plan C: 切换到 Nano Banana Pro (已验证87%一致性)

🔥 下一步行动:
- 立即联系 BytePlus 技术支持确认发布时间
- 如果 > 2 周,考虑 Plan B/C
```

#### 批量生成实现

```typescript
// lib/services/video-agent/storyboard-generator.ts
async function batchGenerateStoryboards(
  shots: Shot[],
  characters: CharacterConfig[],
  style: ImageStyle
): Promise<StoryboardResult[]> {

  const tasks = shots.map(async (shot, index) => {
    // 构建 Prompt
    const prompt = buildStoryboardPrompt(shot, style)

    // 获取涉及的人物参考图
    const characterRefs = shot.characters
      .flatMap(charName => {
        const char = characters.find(c => c.name === charName)
        return char?.reference_images || []
      })

    // 调用 Seedream 4.5 API
    try {
      const result = await generateSeedreamImage({
        model: 'seedream-4.5',
        prompt: prompt,
        negative_prompt: style.negative_prompt.join(', '),
        reference_images: characterRefs,
        resolution: '2K',
        aspect_ratio: '16:9',
        seed: 42 + index // 固定种子增强一致性
      })

      return {
        shot_number: shot.shot_number,
        image_url: result.image_url,
        status: 'success'
      }
    } catch (error) {
      return {
        shot_number: shot.shot_number,
        status: 'failed',
        error: error.message
      }
    }
  })

  // 并行执行,允许部分失败
  const results = await Promise.allSettled(tasks)

  return results.map(r =>
    r.status === 'fulfilled' ? r.value : r.reason
  )
}
```

#### 重新生成配额控制

```typescript
// lib/services/video-agent/regenerate-quota.ts
const GLOBAL_REGENERATE_QUOTA = 3

class RegenerateQuotaManager {
  async checkQuota(projectId: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('video_agent_projects')
      .select('regenerate_quota_remaining')
      .eq('id', projectId)
      .single()

    return (data?.regenerate_quota_remaining || 0) > 0
  }

  async deductQuota(projectId: string): Promise<void> {
    await supabaseAdmin.rpc('deduct_regenerate_quota', {
      project_id: projectId
    })
  }
}
```

---

### 模块 3: 视频生成 (多镜头叙事)

#### 技术选型: **Seedance 1.0 Pro** ✅ 已在项目中使用

**现有实现梳理:**

```typescript
// 从现有代码中提取的关键信息
模型: 'seedance-1-0-pro-250528'
模式: Image-to-Video (✅ 完美匹配需求)
参数支持:
  ├─ resolution: 480p / 720p / 1080p
  ├─ duration: 5s / 8s / 10s
  ├─ aspectRatio: 16:9 / 9:16 / 1:1
  ├─ cameraFixed: boolean ✅ 关键参数!
  ├─ seed: number
  └─ watermark: boolean ✅ 已实现

关键发现:
✅ cameraFixed 参数存在 → 可以控制"单镜头模式"
✅ 水印控制已实现 → 付费用户关闭,免费用户开启
✅ 积分系统已完善 → 预扣+失败返还机制
```

#### 单镜头模式验证

```typescript
// 验证 cameraFixed 是否等同于"禁用多镜头"
const videoRequest: VideoGenerationRequest = {
  image: storyboardImageUrl,  // 从分镜图生成
  prompt: shot.character_action,
  model: 'vidfab-q1',
  duration: shot.duration,  // 5 or 10
  resolution: '1080p',
  aspectRatio: '16:9',
  cameraFixed: true,  // 🔥 关键: 固定镜头
  watermark: false,  // 付费用户
  seed: shot.seed
}

// 复用现有 API
const result = await submitBytePlusVideoGeneration(videoRequest)
```

**🔥 需要验证的问题:**
```
问题: cameraFixed=true 是否等同于"禁用自动多镜头切换"?
验证方法:
  1. 生成一个简单的 image-to-video
  2. 设置 cameraFixed=true
  3. 检查输出视频是否有镜头切换

如果不等同:
  └─ 联系 BytePlus 技术支持,询问如何禁用多镜头模式
```

#### 批量视频生成

```typescript
// lib/services/video-agent/video-generator.ts
async function batchGenerateVideos(
  storyboards: Storyboard[],
  shots: Shot[],
  userId: string
): Promise<VideoClipResult[]> {

  const tasks = storyboards.map(async (storyboard, index) => {
    const shot = shots[index]

    try {
      // 复用现有的视频生成逻辑
      const videoRequest: VideoGenerationRequest = {
        image: storyboard.image_url,
        prompt: shot.character_action,
        model: 'vidfab-q1',
        duration: shot.duration_seconds,
        resolution: '1080p',
        aspectRatio: '16:9',
        cameraFixed: true,  // 单镜头模式
        watermark: isFreeUser(userId),
        seed: shot.seed
      }

      // 调用现有 API (已有积分扣除逻辑)
      const result = await submitBytePlusVideoGeneration(videoRequest)

      return {
        shot_number: shot.shot_number,
        task_id: result.data.id,
        status: 'generating'
      }
    } catch (error) {
      return {
        shot_number: shot.shot_number,
        status: 'failed',
        error: error.message
      }
    }
  })

  const results = await Promise.allSettled(tasks)
  return results.map(r =>
    r.status === 'fulfilled' ? r.value : { status: 'failed', error: r.reason }
  )
}
```

#### 视频状态轮询

```typescript
// 复用现有的 /api/video/status/[requestId]/route.ts
async function pollVideoStatus(taskId: string): Promise<VideoClip> {
  const maxAttempts = 60  // 5 分钟 (每 5 秒轮询一次)

  for (let i = 0; i < maxAttempts; i++) {
    const status = await fetch(`/api/video/status/${taskId}`)
    const data = await status.json()

    if (data.data.status === 'completed') {
      return {
        video_url: data.data.outputs[0],
        status: 'completed'
      }
    }

    if (data.data.status === 'failed') {
      throw new Error(data.data.error)
    }

    await sleep(5000)
  }

  throw new Error('Video generation timeout')
}
```

---

### 模块 4: 音乐生成与视频合成

#### 音乐生成: **Suno AI** via Kie.ai API

```typescript
// lib/services/video-agent/music-generator.ts
async function generateBackgroundMusic(
  moodDescription: string,
  durationSeconds: number,
  style: string = 'cinematic'
): Promise<string> {

  const response = await fetch('https://api.kie.ai/v1/suno/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KIE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'suno-v4.5-plus',
      prompt: `${style} instrumental background music, ${moodDescription}, ${durationSeconds} seconds`,
      make_instrumental: true,
      duration: durationSeconds,
      wait_audio: true
    })
  })

  const data = await response.json()
  return data.data.audio_url
}
```

#### 视频合成: **FFmpeg** (服务器端)

```typescript
// lib/services/video-agent/video-composer.ts
import ffmpeg from 'fluent-ffmpeg'

async function composeFinalVideo(
  videoClips: VideoClip[],
  musicUrl: string,
  transitionConfig: TransitionConfig,
  outputPath: string
): Promise<string> {

  // 步骤 1: 下载背景音乐
  const musicPath = await downloadFile(musicUrl, '/tmp/music.mp3')

  // 步骤 2: 创建拼接列表
  const concatListPath = '/tmp/concat_list.txt'
  const concatContent = videoClips
    .map(clip => `file '${clip.local_path}'`)
    .join('\n')

  fs.writeFileSync(concatListPath, concatContent)

  // 步骤 3: 拼接视频 + 添加转场
  const tempVideoPath = '/tmp/temp_concat.mp4'

  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatListPath)
      .inputOptions(['-f concat', '-safe 0'])
      .videoFilters([
        `fade=t=in:st=0:d=${transitionConfig.duration}`,
        `fade=t=out:st=${totalDuration - transitionConfig.duration}:d=${transitionConfig.duration}`
      ])
      .outputOptions([
        '-c:v libx264',
        '-preset medium',
        '-crf 23'
      ])
      .output(tempVideoPath)
      .on('end', resolve)
      .on('error', reject)
      .run()
  })

  // 步骤 4: 混音
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(tempVideoPath)
      .input(musicPath)
      .outputOptions([
        '-c:v copy',
        '-c:a aac',
        '-map 0:v:0',
        '-map 1:a:0',
        '-shortest'
      ])
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run()
  })

  // 步骤 5: 上传到 Supabase Storage
  const { data, error } = await supabaseAdmin.storage
    .from('user-videos')
    .upload(`video-agent/${Date.now()}.mp4`, fs.readFileSync(outputPath))

  if (error) throw error

  return data.path
}
```

---

## 💾 数据库设计

### 核心表设计 (扩展现有 schema)

```sql
-- ==================================================
-- Video Agent Projects 主表
-- ==================================================
CREATE TABLE IF NOT EXISTS video_agent_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,

  -- 基本信息
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
    'draft', 'processing', 'completed', 'failed'
  )),
  current_step INT DEFAULT 0 CHECK (current_step BETWEEN 0 AND 7),

  -- 步骤状态追踪
  step_1_status VARCHAR(20), -- 脚本分析
  step_2_status VARCHAR(20), -- 人物配置
  step_3_status VARCHAR(20), -- 风格选择
  step_4_status VARCHAR(20), -- 分镜生成
  step_5_status VARCHAR(20), -- 视频生成
  step_6_status VARCHAR(20), -- 音乐特效
  step_7_status VARCHAR(20), -- 最终合成

  -- 阶段 0: 用户输入
  duration INT NOT NULL CHECK (duration IN (15, 30, 45, 60)),
  story_style VARCHAR(20) NOT NULL CHECK (story_style IN (
    'auto', 'comedy', 'mystery', 'moral', 'twist',
    'suspense', 'warmth', 'inspiration'
  )),
  original_script TEXT NOT NULL,

  -- 步骤 1: 脚本分析结果
  script_analysis JSONB,  -- 存储 LLM 分析结果

  -- 步骤 3: 图片风格
  image_style_id VARCHAR(50),

  -- 步骤 4: 重新生成配额
  regenerate_quota_remaining INT DEFAULT 3,

  -- 步骤 6: 音乐和特效
  music_source VARCHAR(20),  -- 'template' | 'suno_ai'
  music_url TEXT,
  transition_effect VARCHAR(20),
  transition_duration DECIMAL(3,1),

  -- 步骤 7: 最终视频
  final_video_url TEXT,
  final_video_storage_path TEXT,
  final_video_file_size BIGINT,
  final_video_resolution VARCHAR(10),
  total_generation_time INT,  -- 秒

  -- 积分追踪
  credits_used INT DEFAULT 0,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- 索引
  INDEX idx_user_status (user_id, status),
  INDEX idx_created_at (created_at DESC)
);

-- ==================================================
-- Project Characters 人物配置表
-- ==================================================
CREATE TABLE IF NOT EXISTS project_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES video_agent_projects(id) ON DELETE CASCADE,

  character_name VARCHAR(100) NOT NULL,
  source VARCHAR(20) NOT NULL CHECK (source IN (
    'template', 'upload', 'ai_generate'
  )),

  -- 模板库
  template_id VARCHAR(50),

  -- AI 生成
  generation_prompt TEXT,
  generation_model VARCHAR(50),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (project_id, character_name),
  INDEX idx_project_id (project_id)
);

-- ==================================================
-- Character Reference Images 人物参考图表
-- ==================================================
CREATE TABLE IF NOT EXISTS character_reference_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES project_characters(id) ON DELETE CASCADE,

  image_url TEXT NOT NULL,
  image_storage_path TEXT,
  image_order INT NOT NULL,  -- 参考图顺序 (1, 2, 3...)

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_character_id (character_id),
  UNIQUE (character_id, image_order)
);

-- ==================================================
-- Project Shots 分镜表 (结构化存储)
-- ==================================================
CREATE TABLE IF NOT EXISTS project_shots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES video_agent_projects(id) ON DELETE CASCADE,

  shot_number INT NOT NULL,
  time_range VARCHAR(20),  -- "0-7s"

  -- 分镜描述
  description TEXT NOT NULL,
  camera_angle VARCHAR(100),
  character_action TEXT,
  mood VARCHAR(100),

  -- 时长分配
  duration_seconds INT,

  -- 随机种子 (确保可重现)
  seed INT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (project_id, shot_number),
  INDEX idx_project_id (project_id)
);

-- ==================================================
-- Shot Characters 分镜-人物关联表
-- ==================================================
CREATE TABLE IF NOT EXISTS shot_characters (
  shot_id UUID NOT NULL REFERENCES project_shots(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES project_characters(id) ON DELETE CASCADE,

  PRIMARY KEY (shot_id, character_id),
  INDEX idx_shot_id (shot_id),
  INDEX idx_character_id (character_id)
);

-- ==================================================
-- Project Storyboards 分镜图表
-- ==================================================
CREATE TABLE IF NOT EXISTS project_storyboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES video_agent_projects(id) ON DELETE CASCADE,
  shot_number INT NOT NULL,

  -- 图片信息
  image_url TEXT,
  image_storage_path TEXT,

  -- 生成信息
  generation_attempts INT DEFAULT 1,
  status VARCHAR(20) DEFAULT 'generating' CHECK (status IN (
    'generating', 'success', 'failed'
  )),
  error_message TEXT,

  -- Seedream 任务 ID
  seedream_task_id VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (project_id, shot_number),
  INDEX idx_project_id (project_id),
  INDEX idx_status (status)
);

-- ==================================================
-- Project Video Clips 视频片段表
-- ==================================================
CREATE TABLE IF NOT EXISTS project_video_clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES video_agent_projects(id) ON DELETE CASCADE,
  shot_number INT NOT NULL,

  -- 视频信息
  video_url TEXT,
  video_storage_path TEXT,
  duration DECIMAL(4,1),

  -- 生成信息
  retry_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'generating' CHECK (status IN (
    'generating', 'success', 'failed'
  )),
  error_message TEXT,

  -- Seedance 任务 ID
  seedance_task_id VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (project_id, shot_number),
  INDEX idx_project_id (project_id),
  INDEX idx_status (status)
);

-- ==================================================
-- Triggers
-- ==================================================
CREATE TRIGGER update_video_agent_projects_updated_at
BEFORE UPDATE ON video_agent_projects
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_project_storyboards_updated_at
BEFORE UPDATE ON project_storyboards
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_project_video_clips_updated_at
BEFORE UPDATE ON project_video_clips
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==================================================
-- RLS Policies
-- ==================================================
ALTER TABLE video_agent_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_reference_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE shot_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_storyboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_video_clips ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的项目
CREATE POLICY video_agent_projects_policy ON video_agent_projects
FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY project_characters_policy ON project_characters
FOR ALL USING (
  auth.uid()::text = (
    SELECT user_id::text FROM video_agent_projects
    WHERE id = project_id
  )
);

CREATE POLICY character_reference_images_policy ON character_reference_images
FOR ALL USING (
  auth.uid()::text = (
    SELECT vap.user_id::text
    FROM video_agent_projects vap
    JOIN project_characters pc ON pc.project_id = vap.id
    WHERE pc.id = character_id
  )
);

CREATE POLICY project_shots_policy ON project_shots
FOR ALL USING (
  auth.uid()::text = (
    SELECT user_id::text FROM video_agent_projects
    WHERE id = project_id
  )
);

CREATE POLICY shot_characters_policy ON shot_characters
FOR ALL USING (
  auth.uid()::text = (
    SELECT vap.user_id::text
    FROM video_agent_projects vap
    JOIN project_shots ps ON ps.project_id = vap.id
    WHERE ps.id = shot_id
  )
);

CREATE POLICY project_storyboards_policy ON project_storyboards
FOR ALL USING (
  auth.uid()::text = (
    SELECT user_id::text FROM video_agent_projects
    WHERE id = project_id
  )
);

CREATE POLICY project_video_clips_policy ON project_video_clips
FOR ALL USING (
  auth.uid()::text = (
    SELECT user_id::text FROM video_agent_projects
    WHERE id = project_id
  )
);

-- ==================================================
-- Helper Functions
-- ==================================================

-- 扣除重新生成配额
CREATE OR REPLACE FUNCTION deduct_regenerate_quota(project_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE video_agent_projects
  SET regenerate_quota_remaining = GREATEST(regenerate_quota_remaining - 1, 0)
  WHERE id = project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取项目统计信息
CREATE OR REPLACE FUNCTION get_project_stats(project_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_shots', COUNT(DISTINCT ps.id),
    'completed_storyboards', COUNT(DISTINCT psb.id) FILTER (WHERE psb.status = 'success'),
    'completed_videos', COUNT(DISTINCT pvc.id) FILTER (WHERE pvc.status = 'success'),
    'total_characters', COUNT(DISTINCT pc.id),
    'regenerate_quota_remaining', vap.regenerate_quota_remaining
  )
  INTO result
  FROM video_agent_projects vap
  LEFT JOIN project_shots ps ON ps.project_id = vap.id
  LEFT JOIN project_storyboards psb ON psb.project_id = vap.id
  LEFT JOIN project_video_clips pvc ON pvc.project_id = vap.id
  LEFT JOIN project_characters pc ON pc.project_id = vap.id
  WHERE vap.id = $1
  GROUP BY vap.id, vap.regenerate_quota_remaining;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📊 成本估算

### 单个 45 秒视频 (6 个分镜)

| 环节 | 服务 | 数量 | 单价 | 最低成本 | 平均成本 | 最高成本 |
|------|------|------|------|---------|---------|---------|
| 脚本分析 | GPT-OSS-120B | 1次 | $0.001 | $0.001 | $0.001 | $0.001 |
| 人物生成(可选) | Seedream 4.5 | 0-2次 | $0.03 | $0 | $0.03 | $0.06 |
| 分镜生成 | Seedream 4.5 | 6张 | $0.03 | $0.18 | $0.18 | $0.18 |
| 分镜重生成(可选) | Seedream 4.5 | 0-3张 | $0.03 | $0 | $0.045 | $0.09 |
| **视频生成** | **Seedance 1.0 Pro** | **6片段** | **$0.10** | **$0.60** | **$0.60** | **$0.60** |
| 视频重试(可选) | Seedance 1.0 Pro | 0-2片段 | $0.10 | $0 | $0.10 | $0.20 |
| 背景音乐 | Suno AI | 1首 | $0.05 | $0 | $0.05 | $0.05 |
| FFmpeg处理 | 自建 | - | - | $0.02 | $0.02 | $0.02 |
| **总计** | | | | **$0.81** | **$1.04** | **$1.21** |

### 不同时长成本对比

| 时长 | 分镜数 | 视频生成成本 | 总成本(平均) | VidFab 积分消耗 |
|------|--------|-------------|-------------|---------------|
| 15秒 | 3 | $0.30 | $0.56 | 待定 |
| 30秒 | 5 | $0.50 | $0.86 | 待定 |
| 45秒 | 6-7 | $0.60-0.70 | $1.04-1.14 | 待定 |
| 60秒 | 8 | $0.80 | $1.30 | 待定 |

### 积分定价策略建议

```typescript
// lib/subscription/video-agent-pricing.ts
export const VIDEO_AGENT_CREDITS = {
  '15s': {
    script_analysis: 1,
    storyboard_generation: 15,  // 3 张 × 5 积分
    video_generation: 90,  // 3 片段 × 30 积分
    total: 106
  },
  '30s': {
    script_analysis: 1,
    storyboard_generation: 25,  // 5 张 × 5 积分
    video_generation: 150,  // 5 片段 × 30 积分
    total: 176
  },
  '45s': {
    script_analysis: 1,
    storyboard_generation: 30,  // 6 张 × 5 积分
    video_generation: 180,  // 6 片段 × 30 积分
    total: 211
  },
  '60s': {
    script_analysis: 1,
    storyboard_generation: 40,  // 8 张 × 5 积分
    video_generation: 240,  // 8 片段 × 30 积分
    total: 281
  },

  // 额外操作
  regenerate_storyboard: 5,  // 重新生成单张分镜图
  retry_video: 30,  // 重试单个视频片段
  ai_generate_character: 10,  // AI 生成人物
  suno_music: 5  // Suno AI 音乐生成 (可选,模板免费)
}
```

---

## 🔧 API 端点设计

### 项目管理

```typescript
POST   /api/video-agent/projects
       创建新项目

GET    /api/video-agent/projects
       获取用户的所有项目列表

GET    /api/video-agent/projects/[id]
       获取项目详情

PUT    /api/video-agent/projects/[id]
       更新项目

DELETE /api/video-agent/projects/[id]
       删除项目
```

### 步骤 API

```typescript
POST   /api/video-agent/projects/[id]/analyze-script
       步骤 1: 脚本分析

POST   /api/video-agent/projects/[id]/characters
       步骤 2: 配置人物

POST   /api/video-agent/projects/[id]/characters/upload
       步骤 2: 上传人物参考图

POST   /api/video-agent/projects/[id]/characters/generate
       步骤 2: AI 生成人物

POST   /api/video-agent/projects/[id]/image-style
       步骤 3: 选择图片风格

POST   /api/video-agent/projects/[id]/storyboards/generate
       步骤 4: 批量生成分镜图

POST   /api/video-agent/projects/[id]/storyboards/[shotNumber]/regenerate
       步骤 4: 重新生成单张分镜图

GET    /api/video-agent/projects/[id]/storyboards/status
       步骤 4: 查询分镜图生成状态

POST   /api/video-agent/projects/[id]/videos/generate
       步骤 5: 批量生成视频片段

POST   /api/video-agent/projects/[id]/videos/[shotNumber]/retry
       步骤 5: 重试单个视频片段

GET    /api/video-agent/projects/[id]/videos/status
       步骤 5: 查询视频生成状态

POST   /api/video-agent/projects/[id]/music
       步骤 6: 配置音乐

POST   /api/video-agent/projects/[id]/transition
       步骤 6: 配置转场特效

POST   /api/video-agent/projects/[id]/compose
       步骤 7: 开始最终合成

GET    /api/video-agent/projects/[id]/compose/status
       步骤 7: 查询合成状态
```

### 草稿管理

```typescript
POST   /api/video-agent/projects/[id]/save-draft
       保存草稿

GET    /api/video-agent/projects/drafts
       获取所有草稿列表

DELETE /api/video-agent/projects/[id]/draft
       删除草稿
```

---

## ⚠️ 风险评估与缓解

### 风险矩阵

| 风险 | 概率 | 影响 | 等级 | 缓解措施 |
|------|------|------|------|---------|
| **Seedream 4.5 延迟发布** | 中 | 高 | ⚠️⚠️⚠️ | Plan A: 等待<br>Plan B: 用 4.0 原型<br>Plan C: 切换 Nano Banana |
| **角色一致性不达预期** | 低-中 | 高 | ⚠️⚠️⚠️ | 严格测试 + Plan C 备用 |
| **cameraFixed ≠ 单镜头** | 低 | 中 | ⚠️⚠️ | 立即验证 + 联系技术支持 |
| **API 限流/配额不足** | 低 | 中 | ⚠️⚠️ | 提前申请企业配额 + 任务队列 |
| **FFmpeg 服务器资源** | 中 | 中 | ⚠️⚠️ | 云函数部署 or 独立服务器 |
| **用户流失(流程太长)** | 高 | 高 | ⚠️⚠️⚠️ | 草稿自动保存 + 优化 UX |
| **成本超预算** | 低 | 低 | ⚠️ | 严格配额控制 + 批量折扣 |

---

## 📅 实施计划

### Phase 1: 基础设施 (1 周, 12/9-12/15)

```
✅ 已完成:
├─ Seedance 视频生成 API
├─ 积分系统
├─ 用户认证
└─ 存储服务

🔨 本周完成:
├─ 数据库 Schema 创建 (video_agent_* 表)
├─ GPT-OSS-120B API 测试
├─ Seedream 4.5 发布时间确认
├─ cameraFixed 参数验证
└─ FFmpeg 环境搭建
```

### Phase 2: 后端开发 (2 周, 12/16-12/29)

```
Week 1:
├─ API Routes 框架搭建
├─ 脚本分析服务 (GPT-OSS-120B)
├─ 人物配置服务 (上传/模板)
├─ 分镜生成服务 (Seedream 4.5)
└─ 单元测试

Week 2:
├─ 视频生成服务 (Seedance - 复用现有)
├─ 音乐生成服务 (Suno AI)
├─ FFmpeg 合成服务
├─ 草稿保存功能
└─ 集成测试
```

### Phase 3: 前端开发 (2 周, 12/16-12/29, 并行)

```
Week 1:
├─ /studio/video-agent-beta 路由
├─ 阶段 0: 用户输入界面
├─ 步骤 1-3: 脚本/人物/风格
└─ 状态管理 (Zustand)

Week 2:
├─ 步骤 4-7: 生成/合成流程
├─ 弹窗组件库
├─ 进度追踪 UI
└─ 草稿列表页面
```

### Phase 4: 测试与优化 (1 周, 12/30-1/5)

```
├─ 端到端测试
├─ 性能优化
├─ 错误处理完善
└─ 用户体验优化
```

### Phase 5: Beta 发布 (2 周, 1/6-1/19)

```
├─ 内测用户邀请 (10-20 人)
├─ 收集反馈
├─ Bug 修复
└─ 迭代优化
```

---

## 📝 下一步行动

### 本周必须完成 (12/9-12/15)

- [ ] **数据库 Schema**
  - [ ] 在 Supabase SQL Editor 中创建所有表
  - [ ] 测试 RLS 策略
  - [ ] 验证外键约束

- [ ] **API 验证**
  - [ ] 联系 BytePlus 确认 Seedream 4.5 发布时间
  - [ ] 测试 Seedance `cameraFixed=true` 是否等同单镜头模式
  - [ ] 测试 GPT-OSS-120B JSON 输出稳定性
  - [ ] 申请 BytePlus 企业配额

- [ ] **技术原型**
  - [ ] 简单的脚本分析 Demo (GPT-OSS-120B)
  - [ ] 单张分镜图生成测试 (Seedream 4.5 or 4.0)
  - [ ] 验证 image-to-video 流程 (Seedance)
  - [ ] FFmpeg 本地测试 (拼接 2-3 个视频)

---

**文档结束**
