# 图片和视频自动压缩功能

## 概述

为了优化存储成本和加快内容加载速度，我们为 Discover 视频上传功能添加了自动压缩机制：

- **图片**：自动转换为 webp 格式，压缩到 100KB 以下
- **视频**：超过 1MB 的视频自动压缩到 1MB 以下

## 功能特性

### 图片压缩

#### 压缩策略
- **格式转换**：自动转换为 webp 格式（体积更小，质量更好）
- **尺寸限制**：最大宽度 1920px，保持宽高比
- **目标大小**：100KB
- **质量控制**：初始质量 80%，如果超过目标大小，逐步降低到 60%

#### 压缩效果
```
原始图片: 2.5MB (4K PNG)
压缩后:   85KB (1920px webp)
压缩率:   96.6%
```

#### 技术实现
- 使用 `sharp` 库进行图片处理
- 支持智能质量调整，在大小和质量之间自动平衡
- 代码位置：`lib/discover/compress-image.ts`

### 视频压缩

#### 压缩策略
- **触发条件**：视频大小超过 1MB
- **目标大小**：1MB
- **分辨率限制**：最大 1920x1080 (1080p)
- **帧率**：30fps
- **编码器**：H.264 (libx264)
- **码率计算**：根据视频时长动态计算
- **最低码率**：500kbps（保证基本质量）

#### 压缩效果
```
10秒视频示例:
原始视频: 15MB (1080p 60fps)
压缩后:   980KB (1080p 30fps)
压缩率:   93.5%
```

#### 警告机制
如果视频时长过长，压缩到 1MB 可能导致画质严重下降：
```
60秒视频 → 压缩到 1MB → 码率仅 136kbps ⚠️
系统会在日志中输出警告，建议用户：
- 增加目标文件大小
- 缩短视频时长
- 降低视频分辨率
```

#### 技术实现
- 使用 `ffmpeg` 进行视频处理
- 自动检测视频信息（时长、分辨率、码率）
- 智能计算目标码率
- 代码位置：`lib/discover/compress-video.ts`

## 部署指南

### 1. 本地开发环境

#### 安装依赖
```bash
# 已在部署时自动安装
pnpm install

# 如需重新安装 sharp
pnpm add sharp
```

#### 安装 ffmpeg（视频压缩必需）
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# 或使用项目脚本（推荐）
./scripts/install-ffmpeg.sh
```

### 2. 生产环境（EC2）

#### 步骤 1：安装 ffmpeg

连接到 EC2 服务器，运行安装脚本：

```bash
cd /path/to/vidfab
./scripts/install-ffmpeg.sh
```

脚本会自动检测操作系统并安装 ffmpeg。支持的系统：
- Ubuntu/Debian
- Amazon Linux 2
- CentOS/RHEL
- Fedora

#### 步骤 2：验证安装

```bash
ffmpeg -version
```

应该看到类似输出：
```
ffmpeg version 4.x.x
```

#### 步骤 3：重启应用

```bash
# 使用项目启动脚本
./scripts/start.sh
```

### 3. 验证功能

#### 检查日志

上传图片或视频后，查看控制台日志：

```bash
# 图片压缩日志
原始图片大小: 1250.45KB
压缩图片并转换为 webp 格式...
压缩后图片大小: 95.23KB

# 视频压缩日志
原始视频大小: 5.23MB
视频超过 1MB，开始压缩...
执行 ffmpeg 压缩: { 时长: '12.5s', 原始尺寸: '1920x1080', ... }
压缩后视频大小: 0.98MB
```

## API 集成

### 上传接口

**POST** `/api/admin/discover`

#### 请求示例
```typescript
const formData = new FormData()
formData.append('prompt', 'A beautiful sunset')
formData.append('videoFile', videoFile) // 自动压缩
formData.append('imageFile', imageFile) // 自动压缩
formData.append('category', 'Nature')
formData.append('status', 'active')

const response = await fetch('/api/admin/discover', {
  method: 'POST',
  body: formData
})
```

#### 处理流程
1. 接收上传文件
2. **自动压缩**（新增）
   - 图片：转 webp + 压缩到 100KB
   - 视频：如果 > 1MB，压缩到 1MB
3. 上传到 S3
4. 保存元数据到数据库

#### 错误处理

如果 ffmpeg 未安装，返回错误：
```json
{
  "success": false,
  "error": "视频压缩失败: ffmpeg 未安装，无法压缩视频。请运行 scripts/install-ffmpeg.sh 安装。"
}
```

## 文件结构

```
lib/discover/
├── compress-image.ts       # 图片压缩模块
├── compress-video.ts       # 视频压缩模块
├── upload.ts              # S3 上传（已有）
├── categorize.ts          # 自动分类（已有）
└── transform.ts           # 数据转换（已有）

app/api/admin/discover/
└── route.ts               # 上传 API（已集成压缩）

scripts/
└── install-ffmpeg.sh      # ffmpeg 安装脚本
```

## 配置选项

### 图片压缩配置

```typescript
// lib/discover/compress-image.ts
const DEFAULT_OPTIONS = {
  maxWidth: 1920,        // 最大宽度
  maxHeight: 0,          // 最大高度（0 = 不限制）
  targetSizeKB: 100,     // 目标大小
  quality: 80,           // 初始质量
  minQuality: 60,        // 最低质量
  format: 'webp'         // 输出格式
}
```

### 视频压缩配置

```typescript
// lib/discover/compress-video.ts
const DEFAULT_OPTIONS = {
  targetSizeMB: 1,       // 目标大小
  maxWidth: 1920,        // 最大宽度
  maxHeight: 1080,       // 最大高度
  minBitrate: 500,       // 最低码率（kbps）
  fps: 30,               // 目标帧率
  audioCodec: 'aac',     // 音频编码器
  audioBitrate: '128k'   // 音频码率
}
```

### 修改配置

如需调整压缩参数，修改 API 调用：

```typescript
// app/api/admin/discover/route.ts

// 图片压缩
const compressResult = await compressImage(buffer, {
  targetSizeKB: 150,  // 改为 150KB
  quality: 85         // 改为 85% 质量
})

// 视频压缩
const compressResult = await compressVideo(buffer, {
  targetSizeMB: 2,    // 改为 2MB
  minBitrate: 800     // 改为 800kbps
})
```

## 性能考虑

### 图片压缩
- **处理时间**：100-500ms（取决于原图大小）
- **CPU 使用**：中等
- **内存使用**：~50-100MB

### 视频压缩
- **处理时间**：2-10 秒（取决于视频时长）
- **CPU 使用**：高（ffmpeg 编码）
- **内存使用**：~200-500MB
- **建议**：
  - 使用异步队列处理大量上传
  - 限制并发压缩任务数
  - 设置合理的超时时间（当前 5 分钟）

## 监控和调试

### 日志位置

按照项目规范，所有日志应输出到 `logs/` 目录：

```bash
tail -f logs/app.log | grep "压缩"
```

### 性能监控

建议监控以下指标：
- 压缩成功率
- 平均压缩时间
- CPU/内存使用
- 上传失败率

### 常见问题

#### Q1: 图片压缩后质量下降明显
**A:** 调整 `targetSizeKB` 和 `minQuality` 参数，或禁用自动压缩

#### Q2: 视频压缩时间过长
**A:** 考虑：
- 限制最大视频时长
- 使用更快的 ffmpeg 预设（fast → ultrafast）
- 前端预压缩

#### Q3: ffmpeg 安装失败
**A:**
- 检查系统版本
- 手动安装：`sudo yum install epel-release && sudo yum install ffmpeg`
- 联系运维团队

#### Q4: 压缩失败但不影响上传
**A:** 当前设计为：压缩失败 = 上传失败，保证一致性。如需改变此行为，修改 API 错误处理逻辑

## 未来优化

### 短期（1-2 周）
- [ ] 添加压缩进度反馈
- [ ] 支持批量压缩
- [ ] 添加压缩质量预览

### 中期（1-2 月）
- [ ] 使用队列系统异步处理
- [ ] 支持更多格式（GIF、AV1）
- [ ] 添加压缩统计面板

### 长期（3+ 月）
- [ ] CDN 层面自动压缩
- [ ] AI 驱动的智能压缩
- [ ] 多设备自适应压缩

## 相关文档

- [Admin Dashboard 实现文档](./admin-dashboard-implementation.md)
- [视频 CDN 集成](./video-cdn-integration.md)
- [S3 配置指南](./admin-configuration.md)

## 更新日志

### 2025-11-04
- ✅ 实现图片自动压缩（webp + 100KB）
- ✅ 实现视频自动压缩（1MB）
- ✅ 集成到 Discover 上传 API
- ✅ 提供 ffmpeg 安装脚本
- ✅ 编写部署和使用文档
