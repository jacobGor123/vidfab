# Video Agent Beta - 快速开始指南

**快速参考文档 - 开发前必读**

---

## 🚀 10 分钟快速上手

### 第一步:创建数据库表 (5 分钟)

```bash
# 1. 打开 Supabase SQL Editor
# 2. 执行以下 SQL 文件:
/lib/database/video-agent-schema.sql

# 3. 验证表创建成功
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'video_agent%'
OR table_name LIKE 'project_%';
```

**预期结果:**应该看到 7 个新表:
- `video_agent_projects`
- `project_characters`
- `character_reference_images`
- `project_shots`
- `shot_characters`
- `project_storyboards`
- `project_video_clips`

---

### 第二步:配置环境变量 (2 分钟)

```bash
# .env.local
# 已有的变量 ✅
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
USE_BYTEPLUS=true

# 需要新增的变量 🔥
KIE_API_KEY=xxx  # Suno AI 音乐生成 (https://kie.ai)
```

---

### 第三步:验证现有功能 (3 分钟)

#### ✅ 验证 Seedance 是否正常工作

```bash
# 1. 启动开发服务器
npm run dev

# 2. 访问 http://localhost:3000/studio
# 3. 测试 Text-to-Video 或 Image-to-Video
# 4. 确认视频生成成功
```

#### ✅ 验证积分系统

```typescript
// 在浏览器控制台测试
const response = await fetch('/api/subscription/credits/check');
const data = await response.json();
console.log('用户积分:', data);
```

---

## 📋 开发检查清单

### 本周必须完成 (12/9-12/15)

#### 数据库

- [ ] 执行 `video-agent-schema.sql`
- [ ] 测试 RLS 策略是否生效
- [ ] 验证外键约束
- [ ] 测试 `get_project_stats()` 函数

#### API 验证

- [ ] 联系 BytePlus 确认 Seedream 4.5 发布时间
- [ ] 测试 `cameraFixed=true` 参数效果
- [ ] 测试 GPT-OSS-120B JSON 输出
- [ ] 申请 BytePlus 企业配额

#### 技术原型

- [ ] GPT-OSS-120B 脚本分析 Demo
- [ ] Seedream 单张分镜图测试
- [ ] Seedance Image-to-Video 测试
- [ ] FFmpeg 视频拼接测试 (本地)

---

## 🔧 关键代码片段

### 1. 创建新项目

```typescript
// app/api/video-agent/projects/route.ts
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorized()

  const { duration, storyStyle, originalScript } = await request.json()

  const { data, error } = await supabaseAdmin
    .from('video_agent_projects')
    .insert({
      user_id: session.user.uuid,
      duration,
      story_style: storyStyle,
      original_script: originalScript,
      status: 'draft',
      current_step: 0
    })
    .select()
    .single()

  return NextResponse.json({ success: true, data })
}
```

### 2. 调用 GPT-OSS-120B 分析脚本

```typescript
// lib/services/video-agent/script-analyzer.ts
import { BytePlusClient } from '@/lib/services/byteplus/core/client'

const client = new BytePlusClient()

export async function analyzeScript(
  script: string,
  duration: number,
  storyStyle: string
) {
  const response = await client.request('/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: 'gpt-oss-120b',
      messages: [
        { role: 'system', content: SCRIPT_ANALYSIS_PROMPT },
        { role: 'user', content: buildPrompt(script, duration, storyStyle) }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
  })

  return JSON.parse(response.choices[0].message.content)
}
```

### 3. 复用现有 Seedance API

```typescript
// 完全复用现有的视频生成逻辑 ✅
import { submitVideoGeneration } from '@/lib/services/byteplus/video/seedance-api'

async function generateVideoFromStoryboard(
  storyboardUrl: string,
  shot: Shot
) {
  const request: VideoGenerationRequest = {
    image: storyboardUrl,  // Image-to-Video
    prompt: shot.character_action,
    model: 'vidfab-q1',
    duration: shot.duration_seconds,
    resolution: '1080p',
    aspectRatio: '16:9',
    cameraFixed: true,  // 🔥 单镜头模式
    watermark: false
  }

  return await submitVideoGeneration(request)
}
```

### 4. 查询视频生成状态

```typescript
// 复用现有的状态查询 ✅
import { checkVideoStatus } from '@/lib/services/byteplus/video/seedance-api'

async function pollVideoStatus(taskId: string) {
  const maxAttempts = 60

  for (let i = 0; i < maxAttempts; i++) {
    const status = await checkVideoStatus(taskId)

    if (status.data.status === 'completed') {
      return status.data.outputs[0]  // 视频 URL
    }

    if (status.data.status === 'failed') {
      throw new Error(status.data.error)
    }

    await sleep(5000)  // 每 5 秒轮询一次
  }

  throw new Error('Timeout')
}
```

---

## ⚠️ 已知问题和解决方案

### 问题 1: Seedream 4.5 尚未发布

**状态:** ⚠️ 待确认

**临时方案:**
```typescript
// 使用 Seedream 4.0 或 Nano Banana 作为 Plan B
const model = process.env.SEEDREAM_45_AVAILABLE === 'true'
  ? 'seedream-4.5'
  : 'seedream-4.0'  // 或 'nano-banana-pro'
```

### 问题 2: cameraFixed 参数待验证

**状态:** ⚠️ 待测试

**验证方法:**
```typescript
// 生成一个简单测试视频
const testRequest = {
  image: 'test-image-url',
  prompt: 'A person standing still',
  cameraFixed: true,
  duration: 5
}

// 检查输出视频是否有镜头切换
```

### 问题 3: FFmpeg 服务器资源

**状态:** ⚠️ 待规划

**解决方案:**
- **方案 A (推荐):** Vercel/AWS Lambda 云函数 (限制 512MB 内存)
- **方案 B:** 独立 EC2/VPS 服务器
- **方案 C:** Docker 容器部署

---

## 📚 相关文档

| 文档 | 路径 | 用途 |
|------|------|------|
| **统一技术方案** | `/discuss/Studio-VideoAgent-统一技术方案-v2.md` | 完整技术设计 |
| **数据库 Schema** | `/lib/database/video-agent-schema.sql` | 数据库表结构 |
| **原产品设计** | `/discuss/Studio-VideoAgent-Beta版产品设计方案.md` | 原始产品设计 |
| **原技术方案** | `/discuss/短视频AI生成技术方案-BytePlus全家桶.md` | 原始技术方案 |

---

## 🎯 核心复用点

### ✅ 完全复用 (无需修改)

1. **用户认证:** NextAuth 4.x
2. **积分系统:** `checkUserCredits` + `deductUserCredits`
3. **视频生成:** Seedance API (`submitVideoGeneration`)
4. **存储服务:** Supabase Storage
5. **水印控制:** 已有逻辑

### 🔨 扩展现有 (需要添加)

1. **数据库表:** 7 个新表 (已设计)
2. **API Routes:** `/api/video-agent/*`
3. **前端页面:** `/app/studio/video-agent-beta/page.tsx`
4. **服务模块:**
   - `script-analyzer.ts` (GPT-OSS-120B)
   - `storyboard-generator.ts` (Seedream 4.5)
   - `music-generator.ts` (Suno AI)
   - `video-composer.ts` (FFmpeg)

---

## 🚦 下一步行动优先级

### P0 (本周必须完成)

1. 数据库表创建 ✅
2. Seedream 4.5 发布时间确认 ⚠️
3. `cameraFixed` 参数验证 ⚠️
4. GPT-OSS-120B 测试 ⚠️

### P1 (下周开始)

5. API Routes 框架搭建
6. 脚本分析服务实现
7. 分镜生成服务实现 (先用 4.0)
8. 视频生成服务集成 (复用现有)

### P2 (两周后)

9. FFmpeg 合成服务
10. 前端界面开发
11. 状态管理 (Zustand)
12. 端到端测试

---

## 💡 快速决策参考

### Q: Seedream 4.5 如果2周内不发布怎么办?

**A:** 使用 Seedream 4.0 开发原型 → 后续一行代码切换到 4.5

### Q: FFmpeg 部署到哪里?

**A:** 先用 Vercel Edge Functions 测试 → 如果内存不够再用独立服务器

### Q: 是否需要"快速模式"?

**A:** Beta 版先不做 → 根据用户反馈决定是否添加

### Q: 人物模板库何时建立?

**A:** Beta 版先用"上传图片" → 收集用户上传数据后再建模板库

---

**文档版本:** v1.0
**最后更新:** 2025-12-09
