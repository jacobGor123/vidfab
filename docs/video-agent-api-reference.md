# Video Agent API 参考文档

## 概述

Video Agent API 提供了从脚本到成片的全流程 AI 自动化视频生成功能。

## 基础信息

- **Base URL**: `/api/video-agent`
- **认证方式**: NextAuth Session (Cookie-based)
- **响应格式**: JSON

---

## API 端点

### 1. 创建项目

创建一个新的 Video Agent 项目。

**端点**: `POST /api/video-agent/projects`

**请求体**:
```json
{
  "duration": 45,
  "storyStyle": "twist",
  "originalScript": "A prince rescues a princess from a dragon, but there's a surprising twist..."
}
```

**参数说明**:
- `duration` (number, 必需): 视频时长,可选值: 15, 30, 45, 60 (秒)
- `storyStyle` (string, 必需): 剧情风格,可选值:
  - `auto`: 自动根据脚本内容延伸
  - `comedy`: 搞笑
  - `mystery`: 猎奇
  - `moral`: 警世
  - `twist`: 反转
  - `suspense`: 悬疑
  - `warmth`: 温情
  - `inspiration`: 励志
- `originalScript` (string, 必需): 原始脚本内容

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "draft",
    "currentStep": 0,
    "createdAt": "2025-12-09T10:00:00Z"
  }
}
```

**错误响应**:
- `401`: 未认证
- `400`: 参数验证失败
- `500`: 服务器内部错误

---

### 2. 获取项目列表

获取当前用户的所有项目。

**端点**: `GET /api/video-agent/projects`

**成功响应** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "duration": 45,
      "story_style": "twist",
      "status": "completed",
      "current_step": 7,
      "created_at": "2025-12-09T10:00:00Z"
    }
  ]
}
```

---

### 3. 脚本分析

使用 GPT-OSS-120B 分析脚本并生成结构化分镜数据。

**端点**: `POST /api/video-agent/projects/{id}/analyze-script`

**请求体**: 无需参数 (使用项目中保存的脚本)

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "duration": 45,
    "shot_count": 6,
    "story_style": "twist",
    "characters": ["Prince", "Princess", "Dragon"],
    "shots": [
      {
        "shot_number": 1,
        "time_range": "0-7s",
        "description": "A prince riding towards a castle on a white horse",
        "camera_angle": "Wide shot, low angle",
        "character_action": "Riding with determination",
        "characters": ["Prince"],
        "mood": "Heroic and determined",
        "duration_seconds": 7
      }
    ]
  }
}
```

**错误响应**:
- `404`: 项目不存在或无权访问
- `500`: 脚本分析失败

---

### 4. 配置人物

配置项目中的人物角色和参考图。

**端点**: `POST /api/video-agent/projects/{id}/characters`

**请求体**:
```json
{
  "characters": [
    {
      "name": "Prince",
      "source": "upload",
      "referenceImages": [
        "https://example.com/prince-1.jpg",
        "https://example.com/prince-2.jpg",
        "https://example.com/prince-3.jpg"
      ]
    },
    {
      "name": "Dragon",
      "source": "template",
      "templateId": "dragon-medieval-001"
    }
  ]
}
```

**参数说明**:
- `characters` (array, 必需): 人物配置数组
  - `name` (string, 必需): 人物名称
  - `source` (string, 必需): 来源类型,可选值:
    - `template`: 从模板库选择
    - `upload`: 上传参考图
    - `ai_generate`: AI 生成
  - `templateId` (string, 可选): 模板 ID (当 source = template 时)
  - `referenceImages` (array, 可选): 参考图 URL 数组 (当 source = upload 时,3-5张)
  - `generationPrompt` (string, 可选): 生成提示词 (当 source = ai_generate 时)

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "characters": [
      {
        "id": "...",
        "character_name": "Prince",
        "source": "upload"
      }
    ]
  }
}
```

---

### 5. 获取人物配置

**端点**: `GET /api/video-agent/projects/{id}/characters`

**成功响应** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "character_name": "Prince",
      "source": "upload",
      "character_reference_images": [
        {
          "image_url": "https://...",
          "image_order": 1
        }
      ]
    }
  ]
}
```

---

### 6. 批量生成分镜图

使用 Seedream 4.5 批量生成所有分镜图。

**端点**: `POST /api/video-agent/projects/{id}/storyboards/generate`

**请求体**:
```json
{
  "styleId": "cinematic"
}
```

**参数说明**:
- `styleId` (string, 必需): 图片风格 ID,可选值:
  - `realistic`: 写实风格
  - `anime`: 动漫风格
  - `cinematic`: 电影感
  - `cyberpunk`: 赛博朋克

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "total": 6,
    "success": 6,
    "failed": 0,
    "results": [
      {
        "shot_number": 1,
        "image_url": "https://...",
        "status": "success"
      }
    ]
  }
}
```

---

### 7. 获取分镜图生成状态

**端点**: `GET /api/video-agent/projects/{id}/storyboards/generate`

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "total": 6,
    "success": 6,
    "failed": 0,
    "storyboards": [
      {
        "shot_number": 1,
        "image_url": "https://...",
        "status": "success",
        "generation_attempts": 1
      }
    ]
  }
}
```

---

## 完整工作流示例

```javascript
// 1. 创建项目
const createResponse = await fetch('/api/video-agent/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    duration: 45,
    storyStyle: 'twist',
    originalScript: 'Your script here...'
  })
})
const { data: project } = await createResponse.json()

// 2. 分析脚本
const analysisResponse = await fetch(
  `/api/video-agent/projects/${project.id}/analyze-script`,
  { method: 'POST' }
)
const { data: analysis } = await analysisResponse.json()

// 3. 配置人物
await fetch(`/api/video-agent/projects/${project.id}/characters`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    characters: [
      {
        name: 'Prince',
        source: 'upload',
        referenceImages: ['url1', 'url2', 'url3']
      }
    ]
  })
})

// 4. 生成分镜图
const storyboardResponse = await fetch(
  `/api/video-agent/projects/${project.id}/storyboards/generate`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ styleId: 'cinematic' })
  }
)
const { data: storyboards } = await storyboardResponse.json()

// 5. 查询生成状态
const statusResponse = await fetch(
  `/api/video-agent/projects/${project.id}/storyboards/generate`
)
const { data: status } = await statusResponse.json()
```

---

## 错误处理

所有 API 端点返回统一的错误格式:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details"
}
```

**常见错误码**:
- `AUTH_REQUIRED`: 需要认证
- `INVALID_PARAMS`: 参数验证失败
- `NOT_FOUND`: 资源不存在
- `PERMISSION_DENIED`: 权限不足
- `INTERNAL_ERROR`: 服务器内部错误

---

## 注意事项

1. **脚本分析**: 必须先完成脚本分析才能进行后续步骤
2. **人物配置**: 上传参考图时建议提供 3-5 张不同角度的图片
3. **分镜图生成**: 生成过程是异步的,可能需要几分钟
4. **错误重试**: 如果分镜图生成失败,可以单独重新生成(需要消耗重新生成配额)

---

**最后更新**: 2025-12-09
**版本**: v1.0
