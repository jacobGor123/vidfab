# Video Agent - Suno AI 音乐生成集成文档

## 功能概述

Video Agent 集成了 Suno AI 音乐生成功能，用户可以通过自然语言描述自动生成背景音乐。

## 环境配置

### 1. 获取 Suno API Key

访问 [Suno AI API](https://www.sunoaiapi.com/) 注册并获取 API Key。

### 2. 配置环境变量

在 `.env.local` 文件中添加以下环境变量：

```bash
# Suno AI 音乐生成
SUNO_API_KEY=your_api_key_here
SUNO_API_BASE_URL=https://api.sunoaiapi.com/api/v1  # 可选，默认值
```

## 数据库更新

执行以下 SQL 脚本更新数据库表结构：

```bash
# 在 Supabase SQL Editor 中执行
lib/database/video-agent-schema-update-music.sql
```

或手动执行：

```sql
ALTER TABLE video_agent_projects
ADD COLUMN IF NOT EXISTS music_generation_prompt TEXT;

ALTER TABLE video_agent_projects
ADD COLUMN IF NOT EXISTS suno_task_id VARCHAR(255);
```

## 使用流程

### 1. 用户交互

在 Video Agent 第五步（Music & Transitions）：
- 用户选择 "AI Generate" 选项
- 输入音乐描述（prompt）
- 例如："Epic orchestral music with dramatic strings and brass, building tension throughout"

### 2. 后端处理

```typescript
// API 调用流程
POST /api/video-agent/projects/{id}/music
{
  "source": "suno_ai",
  "generationPrompt": "Epic orchestral music..."
}

// 后端流程
1. 调用 Suno API 生成音乐
2. 轮询等待生成完成（最多 2 分钟）
3. 获取音乐 URL
4. 保存到数据库
```

### 3. 数据存储

生成的音乐信息保存在 `video_agent_projects` 表：

| 字段 | 类型 | 说明 |
|------|------|------|
| music_source | VARCHAR(20) | 音乐来源：'suno_ai' |
| music_url | TEXT | Suno 返回的音乐 URL |
| music_generation_prompt | TEXT | 用户输入的音乐描述 |
| suno_task_id | VARCHAR(255) | Suno API 任务 ID |

## API 说明

### Suno API Service

位置：`lib/services/suno/suno-api.ts`

#### 主要方法

**生成音乐**
```typescript
await sunoAPI.generate({
  prompt: "Epic orchestral music...",
  make_instrumental: false,  // 是否纯音乐（无人声）
  wait_audio: false          // 是否等待音频生成完成
})
```

**查询状态**
```typescript
await sunoAPI.getStatus(taskId)
```

**等待完成**
```typescript
await sunoAPI.waitForCompletion(taskId, {
  maxAttempts: 24,           // 最多尝试次数
  intervalMs: 5000,          // 每次间隔（毫秒）
  onProgress: (status) => {  // 进度回调
    console.log(status)
  }
})
```

## 错误处理

### 常见错误

1. **API Key 未配置**
   ```
   Error: Suno API key not configured
   ```
   解决：检查 `.env.local` 中的 `SUNO_API_KEY`

2. **生成超时**
   ```
   Error: Music generation timeout
   ```
   解决：音乐生成通常需要 1-2 分钟，已设置 2 分钟超时

3. **生成失败**
   ```
   Error: Music generation failed: [详细错误信息]
   ```
   解决：检查 prompt 是否符合要求，或检查 Suno API 服务状态

## 性能优化建议

### 1. 异步处理（未来优化）

当前实现是同步等待音乐生成完成。未来可以优化为：
- 立即返回，后台异步生成
- 使用 webhook 接收生成完成通知
- 前端轮询查询生成状态

### 2. 缓存策略

对于相同的 prompt，可以缓存生成结果：
- 使用 prompt 的 hash 作为缓存 key
- 减少 API 调用次数
- 降低成本

### 3. Prompt 优化

引导用户提供更详细的描述：
- 音乐类型（orchestral, electronic, jazz）
- 乐器（piano, strings, drums）
- 情绪（uplifting, dark, peaceful）
- 节奏（fast-paced, slow, moderate）

## 成本控制

### Suno API 定价

请参考 [Suno AI 定价页面](https://www.sunoaiapi.com/pricing) 了解最新价格。

### 建议

1. 限制每个用户的音乐生成配额
2. 监控 API 使用量
3. 实现重新生成次数限制
4. 对于 "No Music" 选项不调用 API

## 测试

### 手动测试

1. 启动开发服务器
2. 创建新的 Video Agent 项目
3. 进入第五步选择 "AI Generate"
4. 输入测试 prompt：
   ```
   Uplifting background music with gentle piano and soft strings, peaceful and inspiring
   ```
5. 等待生成完成（1-2 分钟）
6. 检查控制台日志和数据库记录

### 日志追踪

```bash
# 服务端日志
[Video Agent] Generating music with Suno AI
[Suno API] Generating music
[Suno API] Generation started
[Video Agent] Music generation progress
[Video Agent] Music generated successfully
```

## 后续优化

- [ ] 实现异步生成 + 轮询机制
- [ ] 添加音乐预览功能
- [ ] 支持音乐编辑（剪辑、淡入淡出）
- [ ] 实现音乐风格模板
- [ ] 添加音乐质量评估
