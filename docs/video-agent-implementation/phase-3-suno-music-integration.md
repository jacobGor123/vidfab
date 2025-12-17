# Phase 3: Suno 背景音乐集成

## 实施状态
✅ **已完成** - 2025-01-XX

## 概述
在 Video Agent 工作流中集成 Suno AI 音乐生成，实现以下功能：
1. 使用 LLM（GPT-4o-mini）根据脚本内容自动生成音乐提示词
2. 在分镜图生成阶段并行启动 Suno 音乐生成（不阻塞主流程）
3. 在视频合成阶段检查音乐生成状态并添加到最终视频

## 技术架构

### 工作流程
```
步骤 1: 脚本分析
  ├─> LLM 分析脚本 (analyzeScript)
  ├─> LLM 生成音乐 prompt (generateMusicPrompt)
  └─> 保存 music_generation_prompt 到数据库

步骤 3: 分镜图生成
  ├─> 并行启动分镜图生成 (generateStoryboardsAsync)
  └─> 🔥 并行启动 Suno 音乐生成 (sunoAPI.generate)
      └─> 保存 suno_task_id 到数据库

步骤 6: 视频合成
  ├─> 拼接视频片段
  ├─> 🔥 检查 Suno 状态 (sunoAPI.getStatus)
  │   ├─> 如果未完成，等待（最多 3 分钟）
  │   └─> 如果完成，获取 audio_url
  ├─> 添加背景音乐到视频 (addBackgroundMusic)
  └─> 上传最终视频
```

## 核心实现

### 1. 数据库 Schema 更新

**迁移文件**: `lib/database/video-agent-schema-update-music.sql`

新增字段：
- `music_generation_prompt TEXT` - LLM 生成的音乐描述
- `suno_task_id VARCHAR(255)` - Suno API 返回的任务 ID

**执行方式**: 在 Supabase SQL Editor 中手动执行此脚本

### 2. LLM 音乐 Prompt 生成

**文件**: `lib/services/video-agent/script-analyzer.ts`

新增函数 `generateMusicPrompt()`:
- 输入：脚本文本、剧情风格、分镜列表
- 处理：提取场景描述和情绪基调，使用 GPT-4o-mini 生成音乐描述
- 输出：最多 200 字符的英文音乐描述（符合 Suno 推荐长度）

示例输出：
```
Cinematic suspense music with orchestral strings,
moderate tempo, building tension, mysterious atmosphere
```

### 3. 脚本分析 API 更新

**文件**: `app/api/video-agent/projects/[id]/analyze-script/route.ts`

关键变更：
```typescript
// 在脚本分析完成后生成音乐 prompt
const musicPrompt = await generateMusicPrompt(
  project.original_script,
  project.story_style,
  analysis.shots
)

// 保存到数据库
await supabaseAdmin
  .from('video_agent_projects')
  .update({
    script_analysis: analysis,
    music_generation_prompt: musicPrompt  // 🔥 新字段
  })
```

### 4. 分镜图生成 API 更新

**文件**: `app/api/video-agent/projects/[id]/storyboards/generate/route.ts`

关键变更：
```typescript
// 在分镜图生成时并行启动 Suno
if (project.music_generation_prompt) {
  Promise.resolve().then(async () => {
    const generateResponse = await sunoAPI.generate({
      prompt: project.music_generation_prompt,
      make_instrumental: true,  // 🔥 纯音乐（无歌词）
      wait_audio: false         // 🔥 异步生成
    })

    // 保存 task ID
    await supabaseAdmin
      .from('video_agent_projects')
      .update({ suno_task_id: generateResponse.id })
      .eq('id', projectId)
  })
}
```

### 5. 视频合成 API 更新

**文件**: `app/api/video-agent/projects/[id]/compose/route.ts`

关键变更：
```typescript
// 在合成前检查 Suno 状态
if (project.suno_task_id && !project.music_url) {
  const sunoStatus = await sunoAPI.getStatus(project.suno_task_id)

  if (sunoStatus.status === 'completed') {
    musicUrl = sunoStatus.audio_url
  } else {
    // 等待完成（最多 3 分钟）
    const completed = await sunoAPI.waitForCompletion(
      project.suno_task_id,
      { maxAttempts: 36, intervalMs: 5000 }
    )
    musicUrl = completed.audio_url
  }
}

// 使用音乐 URL 添加背景音乐
if (musicUrl) {
  await addBackgroundMusic(videoPath, musicPath, outputPath, musicConfig, videoDuration)
}
```

## API 依赖

### Suno API（KIE 封装）
**SDK**: `lib/services/suno/suno-api.ts`

关键方法：
- `generate(request)` - 启动音乐生成
- `getStatus(id)` - 查询生成状态
- `waitForCompletion(id, options)` - 轮询直到完成

### LLM API（Replicate）
**SDK**: `replicate` npm package
**模型**: `openai/gpt-4o-mini`

用途：生成音乐 prompt

## 错误处理

### 非阻塞设计
- 音乐 prompt 生成失败 → 继续脚本分析，使用默认 prompt
- Suno 启动失败 → 继续分镜图生成，无背景音乐
- Suno 超时 → 继续视频合成，无背景音乐

### 日志级别
- `console.log` - 正常流程（带 🎵 emoji）
- `console.warn` - 非关键错误（带 ⚠️ emoji）
- `console.error` - 严重错误

## 性能优化

### 并行执行
- 分镜图生成 + Suno 音乐生成 **同时进行**
- 典型时间线：
  - 分镜图生成：60-120 秒（6 张 × 10-20 秒）
  - Suno 音乐生成：90-180 秒
  - 并行执行后：总时长 = max(分镜图, 音乐) ≈ 120-180 秒

### Suno 超时策略
- 合成时检查：立即返回（如果已完成）
- 合成时等待：最多 3 分钟（36 × 5 秒）
- 总等待时间预算：≤ 5 分钟（分镜图阶段 + 合成阶段）

## 测试验证

### 端到端测试流程
1. 创建新项目（15/30/45/60 秒任意时长）
2. 分析脚本 → 检查 `music_generation_prompt` 是否生成
3. 生成分镜图 → 检查 `suno_task_id` 是否保存
4. 等待 2-3 分钟 → 检查 Suno 状态（应为 `completed`）
5. 合成视频 → 检查最终视频是否包含背景音乐

### 验证要点
- [ ] 音乐 prompt 质量（长度 ≤ 200 字符，英文）
- [ ] Suno 任务成功启动（task ID 非空）
- [ ] 音乐生成完成（audio_url 可访问）
- [ ] 视频包含音乐（音量 30%，淡入 1 秒，淡出 2 秒）

## 已知限制

1. **Suno 免费配额**: KIE API 免费额度有限，需监控使用量
2. **音乐时长**: Suno 默认生成 30-60 秒音乐，可能短于视频时长（FFmpeg 自动循环）
3. **LLM 成本**: 每次脚本分析调用 2 次 GPT-4o-mini（脚本分析 + 音乐 prompt）

## Git Commit
```bash
git add -A
git commit -m "feat(video-agent): implement Phase 3 - Suno music integration

- Add LLM-based music prompt generation (GPT-4o-mini)
- Parallel Suno music generation during storyboard creation
- Music status check and integration during video composition
- Database schema update: music_generation_prompt, suno_task_id
- Non-blocking error handling for music generation failures

Phase 3 完成 ✓"
```

## 下一步：Phase 4
- Veo 3.1 旁白配置
- Doubao TTS 旁白生成
- 字幕文件生成（SRT 格式）
- 音频混音（旁白 + 背景音乐）
