# BytePlus API 迁移调研报告

> 完成时间: 2025-11-27
> 目标: 从 WaveSpeed AI 迁移到 BytePlus ModelArk
> 涉及服务: Seedance (Video) + Seedream 4.0 (Image)

---

## 📊 一、核心发现总结

### ✅ 好消息
1. **统一认证**: BytePlus 使用相同的 API Key 认证方式
2. **统一 Base URL**: 所有服务使用同一个基础URL
3. **支持 Callback**: 提供 webhook 机制,可替代轮询
4. **官方文档完善**: API 文档清晰,有完整的示例代码

### ⚠️ 关键差异
1. **参数格式完全不同**: BytePlus 使用"文本命令"格式,不是结构化参数
2. **Image API 也不同**: Seedream 4.0 使用结构化参数(不是文本命令)
3. **任务状态字段变化**: 状态值和响应结构有差异

---

## 🎯 二、Video API 详细对比

### 2.1 API 端点对比

| 功能 | WaveSpeed | BytePlus |
|------|-----------|----------|
| **创建任务** | `POST /bytedance/seedance-v1-pro-*` | `POST /api/v3/contents/generations/tasks` |
| **查询状态** | `GET /predictions/{id}/result` | `GET /api/v3/contents/generations/tasks/{id}` |
| **Base URL** | `https://api.wavespeed.ai/api/v3` | `https://ark.ap-southeast.bytepluses.com/api/v3` |

### 2.2 请求参数格式对比

#### WaveSpeed 格式 (结构化参数):
```typescript
{
  "prompt": "A detective enters a room",
  "duration": 5,
  "camera_fixed": false,
  "seed": -1,
  "aspect_ratio": "16:9",
  "image": "https://..." // I2V 需要
}
```

#### BytePlus 格式 (文本命令):
```typescript
{
  "model": "seedance-1-0-pro-250528",
  "content": [
    {
      "type": "text",
      "text": "A detective enters a room --resolution 1080p --duration 5 --ratio 16:9 --camerafixed false --seed -1"
    }
  ]
}
```

**🔥 关键发现**: 所有参数都要嵌入到 prompt 文本中!

### 2.3 Image-to-Video 请求格式

```typescript
{
  "model": "seedance-1-0-pro-250528",
  "content": [
    {
      "type": "text",
      "text": "A detective --resolution 1080p --duration 5"
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "https://...",
        "role": "first_frame"  // 或 "last_frame"
      }
    }
  ]
}
```

### 2.4 支持的文本命令参数

| 参数 | 命令格式 | 说明 | 默认值 |
|------|----------|------|--------|
| **resolution** | `--resolution 720p` | 480p/720p/1080p | Pro: 1080p, Lite: 720p |
| **ratio** | `--ratio 16:9` | 16:9/9:16/1:1/3:4/4:3/21:9/adaptive | T2V: 16:9, I2V: adaptive |
| **duration** | `--duration 5` | 2-12秒 | 5 |
| **frames** | `--frames 57` | 29-289 (特定值) | - |
| **framepersecond** | `--fps 24` | 24 | 24 |
| **seed** | `--seed 123` | -1 或 [0, 2^32-1] | -1 |
| **camerafixed** | `--camerafixed true` | true/false | false |
| **watermark** | `--watermark false` | true/false | false |

### 2.5 响应格式对比

#### WaveSpeed 响应:
```json
{
  "data": {
    "id": "req_xxx",
    "status": "processing",
    "outputs": ["https://video.url"],
    "progress": 50
  }
}
```

#### BytePlus 响应:
```json
{
  "id": "cgt-2025******-****",
  "model": "seedance-1-0-pro-250528",
  "status": "succeeded",
  "content": {
    "video_url": "https://...",
    "last_frame_url": "https://..."  // 如果设置了 return_last_frame
  },
  "seed": 10,
  "resolution": "720p",
  "duration": 5,
  "ratio": "16:9",
  "framespersecond": 24,
  "usage": {
    "completion_tokens": 108900,
    "total_tokens": 108900
  },
  "created_at": 1743414619,
  "updated_at": 1743414673
}
```

### 2.6 状态值对比

| WaveSpeed | BytePlus |
|-----------|----------|
| `queued` | `queued` ✅ |
| `processing` | `running` ⚠️ |
| `completed` | `succeeded` ⚠️ |
| `failed` | `failed` ✅ |
| - | `cancelled` 🆕 |

---

## 🎨 三、Image API 详细对比

### 3.1 API 端点

| 功能 | WaveSpeed | BytePlus |
|------|-----------|----------|
| **生成图片** | `POST /bytedance/seedream-v4` | `POST /api/v3/images/generations` |
| **查询状态** | `GET /predictions/{id}/result` | **同步返回,无需查询** |

### 3.2 请求参数格式

#### WaveSpeed 格式:
```typescript
{
  "prompt": "A cat",
  "size": "1024*1024",
  "enable_sync_mode": false,
  "enable_base64_output": false,
  "images": ["https://..."]  // I2I 需要
}
```

#### BytePlus Seedream 4.0 格式:
```typescript
{
  "model": "seedream-4-0-250828",
  "prompt": "A cat",
  "size": "2048x2048",  // 或 "2K", "4K"
  "sequential_image_generation": "disabled",  // 或 "auto" (批量生成)
  "response_format": "url",  // 或 "b64_json"
  "stream": false,  // 是否流式输出
  "watermark": true,
  "image": "https://..."  // I2I 需要 (单张或数组)
}
```

### 3.3 Size 参数详解

**方法 1: 指定分辨率** (让模型决定宽高):
- `"1K"`, `"2K"`, `"4K"`

**方法 2: 指定像素宽高**:
- 格式: `"2048x2048"`
- 范围: [1280x720, 4096x4096]
- 宽高比: [1/16, 16]

**推荐尺寸表**:
| 宽高比 | 像素值 |
|--------|--------|
| 1:1 | 2048x2048 |
| 4:3 | 2304x1728 |
| 3:4 | 1728x2304 |
| 16:9 | 2560x1440 |
| 9:16 | 1440x2560 |
| 3:2 | 2496x1664 |
| 2:3 | 1664x2496 |
| 21:9 | 3024x1296 |

### 3.4 批量生成功能 🆕

BytePlus Seedream 4.0 支持批量生成相关图片:

```typescript
{
  "sequential_image_generation": "auto",
  "sequential_image_generation_options": {
    "max_images": 15  // 最多15张
  }
}
```

### 3.5 流式输出功能 🆕

```typescript
{
  "stream": true
}
```

- 每生成一张图片立即返回
- 适用于单张和批量生成

### 3.6 响应格式

#### 非流式响应:
```json
{
  "model": "seedream-4-0-250828",
  "created": 1757323224,
  "data": [
    {
      "url": "https://...",
      "size": "1760x2368"
    }
  ],
  "usage": {
    "generated_images": 1,
    "output_tokens": 16280,
    "total_tokens": 16280
  }
}
```

---

## 🔄 四、Callback URL 机制

### 4.1 Video Generation Callback

在创建视频任务时配置:

```typescript
{
  "model": "seedance-1-0-pro-250528",
  "content": [...],
  "callback_url": "https://your-domain.com/webhook/video"
}
```

**Callback 触发时机**:
- `queued`: 任务进入队列
- `running`: 任务开始运行
- `succeeded`: 任务成功完成 (失败时重试3次)
- `failed`: 任务失败 (失败时重试3次)

**Callback Payload**:
与查询任务状态的响应格式完全一致

**重试机制**:
- 如果5秒内未收到成功响应,会重试
- 最多重试3次

### 4.2 优势

| 轮询 (Polling) | Callback (Webhook) |
|---------------|-------------------|
| ❌ 需要定时请求 | ✅ 被动接收通知 |
| ❌ 消耗服务器资源 | ✅ 节省资源 |
| ❌ 延迟较高 | ✅ 实时通知 |
| ✅ 实现简单 | ⚠️ 需要公网URL |

---

## 🏃 五、模型对比: Seedance Pro vs Pro-Fast

### 5.1 核心差异

| 维度 | Seedance-1.0-Pro | Seedance-1.0-Pro-Fast |
|------|------------------|----------------------|
| **生成速度** | 基准 | **3倍更快** 🚀 |
| **价格** | 基准 | **72% 更低** 💰 |
| **质量** | 最高质量 | 与 Pro 相近 |
| **适用场景** | 追求极致质量 | 平衡质量与速度 |

### 5.2 能力支持

两个模型都支持:
- ✅ Text-to-Video
- ✅ Image-to-Video (首帧)
- ✅ Image-to-Video (首尾帧) - **仅 Pro 支持**

### 5.3 选择建议

**使用 Pro 的场景**:
- 需要最高画质
- 需要首尾帧控制
- 预算充足

**使用 Pro-Fast 的场景**:
- 需要快速生成
- 成本敏感
- 质量要求不是极致

**🎯 建议**: 默认使用 **Pro-Fast**,仅在用户明确要求高质量时使用 Pro

---

## 📋 六、迁移检查清单

### ✅ 已确认的问题

1. ✅ **API 认证方式**: Bearer Token,与 WaveSpeed 相同
2. ✅ **Base URL**: `https://ark.ap-southeast.bytepluses.com/api/v3`
3. ✅ **Video 任务查询**: `GET /api/v3/contents/generations/tasks/{id}`
4. ✅ **Image 同步返回**: 无需轮询
5. ✅ **Callback 机制**: 支持 webhook
6. ✅ **模型选择**: Pro-Fast 性价比更高

### ⚠️ 需要注意的问题

1. **参数转换逻辑**:
   - Video: 所有参数嵌入 prompt
   - Image: 使用结构化参数

2. **状态映射**:
   - `processing` → `running`
   - `completed` → `succeeded`

3. **响应结构变化**:
   - Video: `outputs` → `content.video_url`
   - Image: 直接返回结果

4. **积分计算**:
   - BytePlus 使用 token 计费
   - 需要重新调整积分换算

5. **URL 有效期**:
   - 生成的视频/图片 URL **仅24小时有效**
   - 必须及时保存到 Supabase

---

## 🔧 七、技术实现要点

### 7.1 Video 参数构建函数

```typescript
function buildBytePlusVideoPrompt(request: VideoGenerationRequest): string {
  let prompt = request.prompt

  // 添加参数命令
  prompt += ` --resolution ${request.resolution}`
  prompt += ` --duration ${request.duration}`
  prompt += ` --ratio ${request.aspectRatio}`

  if (request.cameraFixed !== undefined) {
    prompt += ` --camerafixed ${request.cameraFixed}`
  }

  if (request.seed !== undefined && request.seed !== -1) {
    prompt += ` --seed ${request.seed}`
  }

  return prompt
}
```

### 7.2 状态映射函数

```typescript
function mapBytePlusStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'queued': 'pending',
    'running': 'generating',
    'succeeded': 'completed',
    'failed': 'failed',
    'cancelled': 'failed'
  }
  return statusMap[status] || 'pending'
}
```

### 7.3 Image Size 转换

```typescript
function convertAspectRatioToSize(aspectRatio: string): string {
  const sizeMap: Record<string, string> = {
    "1:1": "2048x2048",
    "16:9": "2560x1440",
    "9:16": "1440x2560",
    "3:2": "2496x1664",
    "2:3": "1664x2496",
    "3:4": "1728x2304",
    "4:3": "2304x1728",
    "4:5": "1728x2160",
    "5:4": "2160x1728",
    "21:9": "3024x1296"
  }
  return sizeMap[aspectRatio] || "2048x2048"
}
```

---

## 🎯 八、推荐迁移方案

### 方案: 统一架构 + 分阶段迁移

#### 阶段 0: 基础设施 (1-2天)
```
lib/services/byteplus/
├── core/
│   ├── client.ts          # 统一API客户端
│   ├── errors.ts          # 错误类型
│   └── retry.ts           # 重试逻辑
```

#### 阶段 1: Video 迁移 (2-3天)
```
lib/services/byteplus/
└── video/
    ├── seedance-api.ts    # Video API实现
    ├── types.ts           # 类型定义
    └── utils.ts           # 工具函数
```

**关键任务**:
1. 实现 `buildPromptWithCommands()` 参数转换
2. 实现任务创建和查询
3. 配置 Callback URL (可选)
4. 更新路由层

#### 阶段 2: Image 迁移 (2-3天)
```
lib/services/byteplus/
└── image/
    ├── seedream-api.ts    # Image API实现
    ├── types.ts           # 类型定义
    └── utils.ts           # 工具函数
```

**关键任务**:
1. 实现 size 参数转换
2. 处理同步响应(无需轮询)
3. 更新路由层

#### 阶段 3: 测试与部署 (2-3天)
- 本地测试所有功能
- 更新积分计算逻辑
- 灰度发布
- 监控和回滚准备

**总计**: 7-11天

---

## 📌 九、关键API配置

### 环境变量
```bash
# BytePlus API Key
BYTEPLUS_ARK_API_KEY=45c2287a-b066-4269-a115-077e0108084c

# Base URL
BYTEPLUS_ARK_BASE_URL=https://ark.ap-southeast.bytepluses.com/api/v3

# Callback URL (可选)
BYTEPLUS_CALLBACK_URL=https://vidfab.ai/api/webhook/byteplus
```

### 推荐模型
```typescript
const MODELS = {
  video: {
    pro: "seedance-1-0-pro-250528",
    proFast: "seedance-1-0-pro-fast-250528",  // 推荐
    lite: "seedance-1-0-lite-i2v-250428"
  },
  image: {
    seedream4: "seedream-4-0-250828",  // 推荐
    seedream3: "seedream-3-0-t2i-250415"
  }
}
```

---

## ✅ 十、结论

### 核心发现
1. ✅ BytePlus API 结构清晰,文档完善
2. ✅ 支持 Callback,可优化性能
3. ⚠️ 参数格式差异大,需要仔细转换
4. ✅ Pro-Fast 模型性价比高,建议优先使用
5. ⚠️ URL 24小时过期,必须及时保存

### 下一步行动
1. **立即开始**: 创建 BytePlus 统一客户端基础设施
2. **优先迁移**: Video API (Seedance Pro-Fast)
3. **然后迁移**: Image API (Seedream 4.0)
4. **配置监控**: 设置错误告警和性能监控
5. **灰度发布**: 小流量测试后全量上线

---

**文档版本**: v1.0
**最后更新**: 2025-11-27
**负责人**: Claude
**审核人**: Jacob
