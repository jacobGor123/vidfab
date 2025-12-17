# Phase 3: Doubao TTS 集成实施

## 目标

集成 Doubao TTS API，支持两种模式：
1. **旁白模式**（enable_narration = true）：为每个分镜生成英文旁白
2. **背景音乐模式**（enable_narration = false）：生成整体背景音

**优先级：** P1
**预估时间：** 4-5 小时
**前置条件：** Phase 1、Phase 2 完成

---

## 重要说明

**Doubao TTS 是语音合成服务**，不是音乐生成服务。因此：
- ✅ **旁白模式**：使用 Doubao TTS 生成旁白（推荐）
- ⚠️ **背景音乐模式**：需要使用其他服务（如预设音乐库或音乐生成 API）

**本文档仅实现旁白模式。** 背景音乐模式建议使用免费音乐库或其他音乐生成服务。

---

## 实施步骤

### Step 1: 配置环境变量

**.env.local:**
```bash
# Doubao TTS API 配置
DOUBAO_TTS_APP_ID=your_app_id_here
DOUBAO_TTS_ACCESS_TOKEN=your_access_token_here
DOUBAO_TTS_BASE_URL=https://openspeech.bytedance.com/api/v1
```

### Step 2: 创建 Doubao TTS 服务

**文件：** `lib/services/doubao/types.ts`（新建）

```typescript
export interface DoubaoTTSRequest {
  app: {
    appid: string
    token: string
    cluster: string
  }
  user: {
    uid: string
  }
  audio: {
    voice_type: string  // 音色 ID
    encoding: 'mp3' | 'wav'
    speed_ratio: number  // 语速 0.5-2.0
    volume_ratio: number  // 音量 0.0-2.0
    pitch_ratio: number  // 音调 0.5-2.0
  }
  request: {
    reqid: string
    text: string
    text_type: 'plain' | 'ssml'
    operation: 'query' | 'submit'
  }
}

export interface DoubaoTTSResponse {
  code: number
  message: string
  reqid: string
  data?: {
    audio_url?: string
    duration?: number
  }
}
```

**文件：** `lib/services/doubao/tts-api.ts`（新建）

```typescript
import { DoubaoTTSRequest, DoubaoTTSResponse } from './types'

const APP_ID = process.env.DOUBAO_TTS_APP_ID!
const ACCESS_TOKEN = process.env.DOUBAO_TTS_ACCESS_TOKEN!
const BASE_URL = process.env.DOUBAO_TTS_BASE_URL || 'https://openspeech.bytedance.com/api/v1'

export async function generateEnglishVoiceover(
  text: string,
  voiceType: string = 'en_us_male_narration_professional'
): Promise<{ audio_url: string; duration: number }> {
  const request: DoubaoTTSRequest = {
    app: {
      appid: APP_ID,
      token: ACCESS_TOKEN,
      cluster: 'volcano_tts'
    },
    user: {
      uid: 'video-agent-user'
    },
    audio: {
      voice_type: voiceType,
      encoding: 'mp3',
      speed_ratio: 1.0,
      volume_ratio: 1.0,
      pitch_ratio: 1.0
    },
    request: {
      reqid: `va_${Date.now()}`,
      text,
      text_type: 'plain',
      operation: 'submit'
    }
  }

  const response = await fetch(`${BASE_URL}/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })

  const data: DoubaoTTSResponse = await response.json()

  if (data.code !== 0 || !data.data?.audio_url) {
    throw new Error(`Doubao TTS failed: ${data.message}`)
  }

  return {
    audio_url: data.data.audio_url,
    duration: data.data.duration || 0
  }
}
```

### Step 3: 数据库 Schema 更新

```sql
-- project_voiceovers 表（新建）
CREATE TABLE project_voiceovers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES video_agent_projects(id) ON DELETE CASCADE,
  shot_number INTEGER NOT NULL,
  audio_url TEXT NOT NULL,
  duration NUMERIC,
  voiceover_text TEXT NOT NULL,
  voice_type TEXT DEFAULT 'en_us_male_narration_professional',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, shot_number)
);

CREATE INDEX idx_project_voiceovers_project ON project_voiceovers(project_id);
```

### Step 4: 创建音频生成 API

**文件：** `app/api/video-agent/projects/[id]/audio/generate/route.ts`（新建）

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEnglishVoiceover } from '@/lib/services/doubao/tts-api'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const projectId = params.id
  const { voiceType } = await request.json()

  const supabase = await createClient()

  // 获取项目和分镜
  const { data: project } = await supabase
    .from('video_agent_projects')
    .select('*, project_shots(*)')
    .eq('id', projectId)
    .single()

  const shots = project.project_shots

  // 为每个分镜生成旁白
  for (const shot of shots) {
    const voiceoverText = `${shot.description}. ${shot.character_action}`

    const audio = await generateEnglishVoiceover(voiceoverText, voiceType)

    await supabase.from('project_voiceovers').upsert({
      project_id: projectId,
      shot_number: shot.shot_number,
      audio_url: audio.audio_url,
      duration: audio.duration,
      voiceover_text: voiceoverText,
      voice_type: voiceType
    })
  }

  return NextResponse.json({ success: true })
}
```

### Step 5: 更新视频合成（添加旁白）

**文件：** `lib/services/video-agent/video-composer.ts`

```typescript
// 新增函数：为视频片段添加旁白
async function addVoiceoverToClip(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
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
}

// 更新 composeVideo 函数
export async function composeVideoWithVoiceover(
  projectId: string,
  videoClips: VideoClip[],
  voiceovers: Voiceover[]
): Promise<{ finalVideoUrl: string }> {
  const workDir = path.join('/tmp', 'video-agent', projectId)

  // 1. 下载视频和音频
  const videoPaths = await downloadVideoClips(projectId, videoClips, workDir)
  const audioPaths = await downloadAudioFiles(projectId, voiceovers, workDir)

  // 2. 为每个视频添加旁白
  const clipsWithVoice = await Promise.all(
    videoPaths.map((videoPath, i) =>
      addVoiceoverToClip(videoPath, audioPaths[i], videoPath.replace('.mp4', '_voice.mp4'))
    )
  )

  // 3. 拼接（带淡入淡出）
  const finalPath = path.join(workDir, 'final.mp4')
  await concatenateWithCrossfadeAndAudio(clipsWithVoice, finalPath, 0.5, 5)

  // 4. 上传
  return { finalVideoUrl: await uploadToStorage(projectId, finalPath) }
}
```

---

## 验收标准

✅ Doubao TTS API 调用成功
✅ 旁白音频正确保存到数据库
✅ 视频片段成功添加旁白
✅ 最终视频包含清晰的英文旁白

---

## 下一步

完成 Phase 3 后，进入 [Phase 4: Veo3.1 配置和字幕](./phase-4-veo3-narration-subtitles.md)
