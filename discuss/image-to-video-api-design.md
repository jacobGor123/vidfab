# Image-to-Video API 代理实现方案

## 1. 架构分析和设计原则

基于现有text-to-video架构分析，设计遵循以下原则：

### 1.1 现有架构特点
- **API路由**：使用Next.js API Routes (`/app/api/video/`)
- **认证机制**：统一的session认证（`auth()`）
- **错误处理**：标准化的`WavespeedAPIError`类
- **重试机制**：指数退避重试策略
- **参数验证**：专门的验证函数
- **类型安全**：完整的TypeScript类型定义
- **轮询机制**：统一的status API复用

### 1.2 设计原则
1. **完全复用现有架构模式**
2. **保持API接口一致性**
3. **参数映射和验证复用**
4. **错误处理机制统一**
5. **安全性和权限验证一致**

## 2. API端点设计

### 2.1 新增端点
```typescript
POST /api/video/generate-image-to-video
```

### 2.2 请求格式
```typescript
interface ImageToVideoRequest {
  prompt: string          // 视频描述prompt
  image: string          // 图片base64或URL
  duration: number       // 持续时间: 5 或 10 秒
  camera_fixed?: boolean // 镜头固定 (默认false)
  seed?: number         // 随机种子 (默认-1)
}
```

### 2.3 响应格式（与text-to-video完全一致）
```typescript
// 成功响应
{
  "success": true,
  "data": {
    "requestId": "string",      // 外部API的requestId
    "localId": "string",        // 本地生成的ID
    "userId": "string",         // 用户UUID
    "estimatedTime": "string"   // 预估时间
  }
}

// 错误响应（与现有完全一致）
{
  "error": "string",
  "code": "string",
  "status": number
}
```

### 2.4 轮询状态API（完全复用现有）
```typescript
GET /api/video/status/${requestId}
```

## 3. 参数映射策略

### 3.1 前端到后端映射
```typescript
// 前端输入
{
  prompt: "描述文本",
  image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
  duration: 5,
  camera_fixed: true,
  seed: 12345
}

// 后端处理
{
  prompt: "描述文本",
  image: "处理后的图片（base64或上传到临时存储）",
  duration: 5,
  camera_fixed: true,
  seed: 12345
}
```

### 3.2 后端到外部API映射
```typescript
// 发送到 Wavespeed API
POST https://api.wavespeed.ai/api/v3/bytedance/seedance-v1-pro-i2v-480p
{
  "prompt": "描述文本",
  "image": "处理后的图片数据",
  "duration": 5,
  "camera_fixed": true,
  "seed": 12345
}
```

### 3.3 图片处理策略
```typescript
// 支持的图片格式
- base64编码的图片（data:image/*)
- 图片URL（http/https）
- 文件上传（multipart/form-data）

// 处理流程
1. 验证图片格式和大小
2. 转换为统一格式（base64或临时URL）
3. 传递给外部API
```

## 4. 错误处理机制

### 4.1 参数验证错误
```typescript
// 图片相关验证
- 图片格式验证（支持jpg、png、webp等）
- 图片大小限制（如10MB以内）
- base64格式验证
- URL可访问性验证

// 其他参数验证（复用现有逻辑）
- prompt必填且长度限制
- duration取值验证（5或10）
- seed范围验证
```

### 4.2 网络错误处理
```typescript
// 完全复用现有的重试机制
- 指数退避重试
- 最大重试次数：3次
- 5xx错误重试，4xx错误不重试
- 超时处理
```

### 4.3 外部API错误处理
```typescript
// 映射外部API错误到统一格式
- 401: 认证失败
- 400: 参数错误
- 429: 限流错误
- 500+: 服务器错误
```

## 5. 与现有架构集成方案

### 5.1 类型系统扩展
```typescript
// 扩展现有video.ts类型文件
export interface ImageToVideoRequest {
  prompt: string
  image: string
  duration: number
  camera_fixed?: boolean
  seed?: number
}

// 复用现有响应类型
export type ImageToVideoResponse = VideoGenerationResponse
export type ImageToVideoStatusResponse = VideoStatusResponse
```

### 5.2 API服务扩展
```typescript
// 扩展现有wavespeed-api.ts
export async function submitImageToVideoGeneration(
  request: ImageToVideoRequest
): Promise<VideoGenerationResponse>

export function validateImageToVideoRequest(
  request: ImageToVideoRequest
): string[]
```

### 5.3 路由结构保持一致
```
/app/api/video/
├── generate/                    # 现有text-to-video
├── generate-image-to-video/     # 新增image-to-video
├── status/[requestId]/         # 共用状态查询
└── store/                      # 共用存储逻辑
```

## 6. 安全性考虑

### 6.1 API密钥管理
```typescript
// 复用现有的环境变量管理
const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY

// 考虑为image-to-video使用独立密钥
const WAVESPEED_I2V_API_KEY = process.env.WAVESPEED_I2V_API_KEY || WAVESPEED_API_KEY
```

### 6.2 请求验证
```typescript
// 复用现有认证机制
const session = await auth()
if (!session?.user) {
  return NextResponse.json(
    { error: "Authentication required", code: "AUTH_REQUIRED" },
    { status: 401 }
  )
}
```

### 6.3 限流策略
```typescript
// 图片大小限制
const MAX_IMAGE_SIZE = 10 * 1024 * 1024  // 10MB

// 用户请求频率限制（可考虑Redis实现）
const RATE_LIMIT_PER_USER = 10  // 每小时10次

// 图片内容安全检查
const CONTENT_SAFETY_CHECK = true
```

### 6.4 数据安全
```typescript
// 图片临时存储安全
- 使用临时目录存储上传图片
- 定期清理临时文件
- 避免在日志中记录敏感图片数据

// 请求日志安全
console.log(`🎬 User ${session.user.email} requesting image-to-video:`, {
  prompt: body.prompt.substring(0, 50) + "...",
  hasImage: !!body.image,
  imageSize: body.image?.length,
  duration: body.duration
})
```

## 7. 实现优先级

### Phase 1: 核心功能实现
1. 扩展类型定义（`lib/types/video.ts`）
2. 扩展API服务（`lib/services/wavespeed-api.ts`）
3. 实现API端点（`app/api/video/generate-image-to-video/route.ts`）

### Phase 2: 图片处理优化
1. 图片格式转换和压缩
2. 图片内容安全检查
3. 临时存储优化

### Phase 3: 监控和优化
1. 添加详细的错误监控
2. 性能优化和缓存策略
3. 用户体验优化

## 8. 测试策略

### 8.1 单元测试
- 参数验证函数测试
- 图片处理函数测试
- 错误处理逻辑测试

### 8.2 集成测试
- 完整API流程测试
- 与外部API的集成测试
- 错误场景模拟测试

### 8.3 性能测试
- 大图片处理性能
- 并发请求处理能力
- 内存使用监控

## 9. 部署和监控

### 9.1 环境配置
```bash
# 新增环境变量
WAVESPEED_I2V_API_KEY=your_image_to_video_api_key
MAX_IMAGE_SIZE=10485760
ENABLE_CONTENT_SAFETY=true
```

### 9.2 日志监控
```typescript
// 关键指标监控
- API调用成功率
- 图片处理时间
- 外部API响应时间
- 错误率分类统计
```

### 9.3 告警策略
```typescript
// 告警阈值
- API错误率 > 5%
- 响应时间 > 30秒
- 图片处理失败率 > 2%
```

## 10. 总结

这个设计方案完全基于现有text-to-video架构，保持了：

1. **架构一致性**：复用所有现有的错误处理、认证、重试机制
2. **接口统一性**：相同的请求/响应格式，复用轮询API
3. **类型安全**：完整的TypeScript类型定义
4. **安全性**：统一的认证和权限验证
5. **可维护性**：清晰的代码结构和模块划分

实施时建议按照Phase划分逐步实现，确保每个阶段都能完整测试后再进入下一阶段。