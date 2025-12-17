# Phase 2: 统一时长和淡入淡出实施

## 目标

1. **统一分镜时长为 5 秒** - 所有视频片段使用相同时长，节奏统一
2. **添加 0.5 秒淡入淡出** - 使用 FFmpeg xfade 滤镜实现交叉淡化

**优先级：** P1（高优先级）
**预估时间：** 3-4 小时
**前置条件：** Phase 1 完成

---

## Part A: 统一分镜时长为 5 秒

### A1: 修改脚本分析逻辑

**文件：** `lib/services/video-agent/script-analyzer.ts`

#### 查找脚本分析函数

找到 LLM 分析后处理 shots 的部分：

```typescript
// 示例位置（根据实际代码调整）
const shots = rawShots.map((shot, index) => ({
  shot_number: index + 1,
  time_range: shot.time_range,
  description: shot.description,
  camera_angle: shot.camera_angle,
  character_action: shot.character_action,
  characters: shot.characters,
  mood: shot.mood,
  duration_seconds: shot.duration_seconds  // ❌ 这是 LLM 生成的不统一时长
}))
```

#### 替换为统一时长

```typescript
// 🔥 统一所有分镜时长为 5 秒
const UNIFIED_SEGMENT_DURATION = 5

const shots = rawShots.map((shot, index) => ({
  shot_number: index + 1,
  time_range: `${index * UNIFIED_SEGMENT_DURATION}-${(index + 1) * UNIFIED_SEGMENT_DURATION}s`,  // 🔥 重新计算时间范围
  description: shot.description,
  camera_angle: shot.camera_angle,
  character_action: shot.character_action,
  characters: shot.characters,
  mood: shot.mood,
  duration_seconds: UNIFIED_SEGMENT_DURATION  // 🔥 强制统一为 5 秒
}))

console.log(`[ScriptAnalyzer] 统一分镜时长为 ${UNIFIED_SEGMENT_DURATION} 秒`, {
  totalShots: shots.length,
  totalDuration: shots.length * UNIFIED_SEGMENT_DURATION
})
```

#### 添加配置选项（可选）

如果希望支持用户自定义时长：

**文件：** `lib/services/video-agent/script-analyzer.ts`

```typescript
export interface ScriptAnalysisOptions {
  segmentDuration?: number  // 可选，默认 5 秒
}

export async function analyzeScript(
  script: string,
  totalDuration: number,
  storyStyle: string,
  options?: ScriptAnalysisOptions
): Promise<ScriptAnalysisResult> {
  const segmentDuration = options?.segmentDuration || 5  // 默认 5 秒

  // ... LLM 分析逻辑

  const shots = rawShots.map((shot, index) => ({
    // ...
    duration_seconds: segmentDuration  // 🔥 使用配置值
  }))

  return {
    shots,
    characters,
    shot_count: shots.length,
    total_duration: shots.length * segmentDuration  // 🔥 实际总时长
  }
}
```

### A2: 更新前端 UI（可选）

如果添加了配置选项，更新前端：

**文件：** `components/create/create-sidebar.tsx`

```tsx
// 新增：分镜时长选择
<div className="space-y-2">
  <Label>Segment Duration</Label>
  <Select
    value={segmentDuration.toString()}
    onValueChange={(value) => setSegmentDuration(Number(value))}
  >
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="3">3 seconds (Fast-paced)</SelectItem>
      <SelectItem value="5">5 seconds (Recommended)</SelectItem>
      <SelectItem value="7">7 seconds (Detailed)</SelectItem>
    </SelectContent>
  </Select>
  <p className="text-sm text-muted-foreground">
    All video clips will use this duration
  </p>
</div>
```

### A3: 测试验证

```typescript
// 测试脚本
const result = await analyzeScript(
  'A prince saves a princess from a dragon.',
  30,  // 总时长 30 秒
  'adventure'
)

// 验证：
console.assert(result.shots.every(s => s.duration_seconds === 5), '所有分镜应为 5 秒')
console.assert(result.total_duration === result.shots.length * 5, '总时长应为片段数 × 5')
```

---

## Part B: 添加 0.5 秒淡入淡出

### B1: 创建 FFmpeg xfade 拼接函数

**文件：** `lib/services/video-agent/ffmpeg-executor.ts`

#### 找到现有的视频拼接函数

```typescript
// 现有的简单拼接（直接 concat，无过渡）
export async function concatenateVideos(
  videoPaths: string[],
  outputPath: string
): Promise<void> {
  // ... concat 逻辑
}
```

#### 新增 xfade 交叉淡化函数

在同一文件中添加：

```typescript
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'

/**
 * 使用 xfade 滤镜拼接视频（带交叉淡化）
 *
 * @param videoPaths 视频文件路径列表
 * @param outputPath 输出文件路径
 * @param transitionDuration 过渡时长（秒），默认 0.5
 * @param segmentDuration 每个片段时长（秒），默认 5（用于计算偏移）
 */
export async function concatenateWithCrossfade(
  videoPaths: string[],
  outputPath: string,
  transitionDuration: number = 0.5,
  segmentDuration: number = 5
): Promise<void> {
  if (videoPaths.length === 0) {
    throw new Error('视频列表为空')
  }

  // 单个视频直接复制
  if (videoPaths.length === 1) {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(videoPaths[0])
        .videoCodec('copy')
        .audioCodec('copy')
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run()
    })
  }

  // 🔥 构建 xfade 滤镜链
  let filterComplex = ''
  let previousOutput = '[0:v]'

  for (let i = 1; i < videoPaths.length; i++) {
    const currentInput = `[${i}:v]`
    const currentOutput = i === videoPaths.length - 1 ? '[outv]' : `[v${i}]`

    // 计算偏移时间（上一个视频的时长 - 过渡时长）
    // 例如：5 秒片段，0.5 秒过渡 → offset = 4.5
    const offset = (segmentDuration - transitionDuration) * i - transitionDuration * (i - 1)

    // xfade 滤镜
    filterComplex += `${previousOutput}${currentInput}xfade=transition=fade:duration=${transitionDuration}:offset=${offset}${currentOutput};`

    previousOutput = currentOutput
  }

  // 去掉最后的分号
  filterComplex = filterComplex.slice(0, -1)

  console.log('[FFmpeg] xfade 滤镜链:', filterComplex)

  return new Promise((resolve, reject) => {
    let command = ffmpeg()

    // 添加所有输入文件
    videoPaths.forEach(videoPath => {
      command = command.input(videoPath)
    })

    command
      .complexFilter(filterComplex)
      .map('[outv]')  // 使用滤镜输出的视频流
      .videoCodec('libx264')
      .outputOptions([
        '-preset medium',
        '-crf 23',
        '-pix_fmt yuv420p'
      ])
      .output(outputPath)
      .on('start', (cmd) => {
        console.log('[FFmpeg] 开始拼接（交叉淡化）:', cmd)
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`[FFmpeg] 进度: ${progress.percent.toFixed(1)}%`)
        }
      })
      .on('end', () => {
        console.log('[FFmpeg] 拼接完成 ✓')
        resolve()
      })
      .on('error', (err) => {
        console.error('[FFmpeg] 拼接失败:', err)
        reject(err)
      })
      .run()
  })
}
```

### B2: 处理音频流

xfade 只处理视频流，需要单独处理音频：

```typescript
/**
 * 拼接视频和音频（支持 xfade 过渡）
 */
export async function concatenateWithCrossfadeAndAudio(
  videoPaths: string[],
  outputPath: string,
  transitionDuration: number = 0.5,
  segmentDuration: number = 5
): Promise<void> {
  if (videoPaths.length === 0) {
    throw new Error('视频列表为空')
  }

  if (videoPaths.length === 1) {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(videoPaths[0])
        .videoCodec('copy')
        .audioCodec('copy')
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run()
    })
  }

  // 🔥 构建视频 xfade 滤镜链
  let videoFilterComplex = ''
  let previousVideoOutput = '[0:v]'

  for (let i = 1; i < videoPaths.length; i++) {
    const currentVideoInput = `[${i}:v]`
    const currentVideoOutput = i === videoPaths.length - 1 ? '[outv]' : `[v${i}]`
    const offset = (segmentDuration - transitionDuration) * i - transitionDuration * (i - 1)

    videoFilterComplex += `${previousVideoOutput}${currentVideoInput}xfade=transition=fade:duration=${transitionDuration}:offset=${offset}${currentVideoOutput};`
    previousVideoOutput = currentVideoOutput
  }

  // 🔥 构建音频 concat 滤镜（简单拼接）
  let audioFilterComplex = ''
  for (let i = 0; i < videoPaths.length; i++) {
    audioFilterComplex += `[${i}:a]`
  }
  audioFilterComplex += `concat=n=${videoPaths.length}:v=0:a=1[outa]`

  // 组合视频和音频滤镜
  const filterComplex = videoFilterComplex.slice(0, -1) + ';' + audioFilterComplex

  console.log('[FFmpeg] 完整滤镜链:', filterComplex)

  return new Promise((resolve, reject) => {
    let command = ffmpeg()

    videoPaths.forEach(videoPath => {
      command = command.input(videoPath)
    })

    command
      .complexFilter(filterComplex)
      .map('[outv]')   // 视频流
      .map('[outa]')   // 音频流
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset medium',
        '-crf 23',
        '-pix_fmt yuv420p'
      ])
      .output(outputPath)
      .on('start', (cmd) => {
        console.log('[FFmpeg] 开始拼接（视频+音频）:', cmd)
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`[FFmpeg] 进度: ${progress.percent.toFixed(1)}%`)
        }
      })
      .on('end', () => {
        console.log('[FFmpeg] 拼接完成 ✓')
        resolve()
      })
      .on('error', (err) => {
        console.error('[FFmpeg] 拼接失败:', err)
        reject(err)
      })
      .run()
  })
}
```

### B3: 更新视频合成服务

**文件：** `lib/services/video-agent/video-composer.ts`

#### 查找现有的拼接调用

```typescript
// 现有逻辑
await concatenateVideos(localVideoPaths, concatenatedPath)
```

#### 替换为 xfade 拼接

```typescript
// 🔥 使用交叉淡化拼接
await concatenateWithCrossfadeAndAudio(
  localVideoPaths,
  concatenatedPath,
  0.5,  // 0.5 秒过渡
  5     // 5 秒片段时长
)
```

#### 完整的 composeVideo 函数示例

```typescript
export async function composeVideo(
  projectId: string,
  videoClips: VideoClip[],
  musicConfig?: MusicConfig
): Promise<{ finalVideoUrl: string; fileSize: number }> {
  const workDir = path.join('/tmp', 'video-agent', projectId)
  await fs.mkdir(workDir, { recursive: true })

  try {
    // 1. 下载所有视频片段
    console.log('[VideoComposer] 下载视频片段...')
    const localPaths = await downloadVideoClips(projectId, videoClips, workDir)

    // 2. 🔥 使用交叉淡化拼接视频
    console.log('[VideoComposer] 拼接视频片段（交叉淡化）...')
    const concatenatedPath = path.join(workDir, 'concatenated.mp4')
    await concatenateWithCrossfadeAndAudio(
      localPaths,
      concatenatedPath,
      0.5,  // 过渡时长
      5     // 片段时长
    )

    // 3. 添加背景音乐（如有）
    let finalPath = concatenatedPath
    if (musicConfig && musicConfig.url) {
      console.log('[VideoComposer] 添加背景音乐...')
      finalPath = path.join(workDir, 'final_with_music.mp4')
      await addBackgroundMusic(concatenatedPath, musicConfig, finalPath)
    }

    // 4. 上传到 Supabase Storage
    console.log('[VideoComposer] 上传最终视频...')
    const finalVideoUrl = await uploadToStorage(projectId, finalPath)

    // 5. 获取文件大小
    const stats = await fs.stat(finalPath)
    const fileSize = stats.size

    console.log('[VideoComposer] 视频合成完成 ✓', {
      finalVideoUrl,
      fileSize: (fileSize / 1024 / 1024).toFixed(2) + ' MB'
    })

    return {
      finalVideoUrl,
      fileSize
    }
  } finally {
    // 6. 清理临时文件
    await cleanupTempFiles(workDir)
  }
}
```

---

## Part C: 测试验证

### C1: 单元测试 xfade 函数

```typescript
import { concatenateWithCrossfadeAndAudio } from '../ffmpeg-executor'

describe('concatenateWithCrossfadeAndAudio', () => {
  it('should concatenate videos with crossfade', async () => {
    const testVideos = [
      '/path/to/clip1.mp4',
      '/path/to/clip2.mp4',
      '/path/to/clip3.mp4'
    ]
    const output = '/tmp/test_output.mp4'

    await concatenateWithCrossfadeAndAudio(testVideos, output, 0.5, 5)

    // 验证输出文件存在
    const exists = await fs.access(output).then(() => true).catch(() => false)
    expect(exists).toBe(true)

    // 验证视频时长（3个片段 × 5秒 - 2个过渡 × 0.5秒 = 14秒）
    // 使用 ffprobe 获取时长
    const duration = await getVideoDuration(output)
    expect(duration).toBeCloseTo(14, 1)  // 允许 1 秒误差
  })
})
```

### C2: 集成测试（完整流程）

```bash
# 创建测试脚本
node scripts/test-crossfade.js
```

**scripts/test-crossfade.js:**

```javascript
const { batchGenerateVideosWithTransition } = require('../lib/services/video-agent/video-generator')
const { composeVideo } = require('../lib/services/video-agent/video-composer')

async function testCrossfade() {
  // 1. 生成 2-3 个视频片段
  const videoClips = await batchGenerateVideosWithTransition(
    testStoryboards,
    testShots,
    { userId: 'test', resolution: '720p' }
  )

  // 2. 合成视频（带交叉淡化）
  const result = await composeVideo(
    'test-project-id',
    videoClips.filter(c => c.status === 'completed')
  )

  console.log('测试完成:', result.finalVideoUrl)

  // 3. 下载并手动检查视频
  // - 片段之间是否有淡入淡出
  // - 过渡是否自然
}

testCrossfade()
```

### C3: 视觉验证

手动检查生成的视频：

1. **下载最终视频**
2. **在视频播放器中查看片段过渡处**
3. **验证是否有 0.5 秒的淡入淡出效果**

```bash
# 使用 FFplay 播放并慢放
ffplay -i final_video.mp4 -vf "setpts=2*PTS"  # 2倍慢放

# 或使用 VLC 播放器，减速到 0.5x 查看过渡细节
```

---

## 常见问题

### Q1: xfade 滤镜报错怎么办？

**错误示例：**
```
Error: Filtergraph 'xfade' was not supported
```

**解决方案：**
```bash
# 检查 FFmpeg 版本（需要 >= 4.3）
ffmpeg -version

# 检查是否支持 xfade 滤镜
ffmpeg -filters | grep xfade

# 如果不支持，升级 FFmpeg
brew upgrade ffmpeg  # macOS
apt-get upgrade ffmpeg  # Ubuntu
```

### Q2: 过渡处出现黑屏怎么办？

**原因：** offset 计算错误

**解决方案：**
```typescript
// 检查 offset 计算逻辑
// 对于 5 秒片段，0.5 秒过渡：
// 片段 1 → 片段 2: offset = 4.5 (5 - 0.5)
// 片段 2 → 片段 3: offset = 9.5 (4.5 + 5)

// 正确公式：
const offset = (segmentDuration - transitionDuration) * i - transitionDuration * (i - 1)
```

### Q3: 音频和视频不同步怎么办？

**原因：** 音频没有应用过渡，导致总时长不匹配

**解决方案：**
```typescript
// 确保音频使用 concat 滤镜（简单拼接）
// 而不是尝试对音频应用 xfade（xfade 仅支持视频）

const audioFilter = `[0:a][1:a][2:a]concat=n=3:v=0:a=1[outa]`
```

---

## 验收标准

✅ **所有分镜时长为 5 秒**：脚本分析结果中所有 shot.duration_seconds === 5
✅ **xfade 滤镜链正确**：filterComplex 包含正确的 offset 计算
✅ **视频拼接成功**：输出视频时长 = (片段数 × 5) - ((片段数 - 1) × 0.5)
✅ **过渡效果自然**：视觉检查片段之间有明显的淡入淡出
✅ **音视频同步**：音频和视频时长一致，无明显延迟

---

## 下一步

完成 Phase 2 后，进入 [Phase 3: Doubao TTS 集成](./phase-3-doubao-tts-integration.md)

---

**预估完成时间：3-4 小时**
