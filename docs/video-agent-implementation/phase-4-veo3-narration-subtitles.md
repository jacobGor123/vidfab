# Phase 4: Veo3.1 配置和字幕实施

## 目标

1. 修改 Veo3.1 配置，关闭内置音频（generate_audio = false）
2. 添加英文字幕功能（仅旁白模式）

**优先级：** P2
**预估时间：** 3-4 小时
**前置条件：** Phase 1-3 完成

---

## Part A: Veo3.1 关闭内置音频

### A1: 修改 Veo3.1 生成器

**文件：** `lib/services/video-agent/veo3-video-generator.ts`

**查找：**
```typescript
const veo3Request = {
  image: firstFrameUrl,
  prompt: videoPrompt,
  duration: mappedDuration,
  aspect_ratio: aspectRatio
}
```

**替换为：**
```typescript
const veo3Request = {
  image: firstFrameUrl,
  prompt: videoPrompt,
  duration: mappedDuration,
  aspect_ratio: aspectRatio,
  generate_audio: false  // 🔥 关闭 Veo3.1 内置音频
}
```

### A2: 验证

```typescript
// 测试 Veo3.1 生成（旁白模式）
const result = await generateVeo3Video(
  storyboard.image_url,
  shot,
  { aspectRatio: '16:9' }
)

// 验证生成的视频没有音频轨道
// 使用 ffprobe 检查
ffprobe -v error -show_streams result.video_url
// 应该只有 video stream，没有 audio stream
```

---

## Part B: 添加英文字幕

### B1: 创建字幕生成服务

**文件：** `lib/services/video-agent/subtitle-generator.ts`（新建）

```typescript
import { Voiceover } from '@/lib/types/video'
import fs from 'fs/promises'

/**
 * 生成 SRT 字幕文件
 */
export async function generateSRT(
  voiceovers: Voiceover[],
  outputPath: string
): Promise<void> {
  let srtContent = ''
  let startTime = 0

  for (let i = 0; i < voiceovers.length; i++) {
    const vo = voiceovers[i]
    const endTime = startTime + (vo.duration || 5)

    srtContent += `${i + 1}\n`
    srtContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`
    srtContent += `${vo.voiceover_text}\n\n`

    startTime = endTime
  }

  await fs.writeFile(outputPath, srtContent, 'utf-8')
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}
```

### B2: FFmpeg 添加字幕

```typescript
/**
 * 为视频添加字幕
 */
export async function addSubtitles(
  videoPath: string,
  srtPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .outputOptions([
        `-vf subtitles=${srtPath}:force_style='FontName=Arial,FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2'`
      ])
      .videoCodec('libx264')
      .audioCodec('copy')
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run()
  })
}
```

### B3: 更新合成流程

```typescript
export async function composeVideoWithNarration(
  projectId: string,
  videoClips: VideoClip[],
  voiceovers: Voiceover[]
): Promise<{ finalVideoUrl: string }> {
  const workDir = path.join('/tmp', 'video-agent', projectId)

  // 1-3. 下载、添加旁白、拼接（同 Phase 3）

  // 4. 🔥 生成字幕
  const srtPath = path.join(workDir, 'subtitles.srt')
  await generateSRT(voiceovers, srtPath)

  // 5. 🔥 添加字幕到视频
  const finalWithSubsPath = path.join(workDir, 'final_with_subs.mp4')
  await addSubtitles(concatenatedPath, srtPath, finalWithSubsPath)

  // 6. 上传
  return { finalVideoUrl: await uploadToStorage(projectId, finalWithSubsPath) }
}
```

---

## 验收标准

✅ Veo3.1 生成的视频无音频轨道
✅ SRT 字幕文件格式正确
✅ 视频正确显示英文字幕
✅ 字幕与旁白同步

---

完成所有阶段后，进行完整测试：[testing-guide.md](./testing-guide.md)
