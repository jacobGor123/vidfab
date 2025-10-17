# 视频 CDN 集成方案

## 📊 为什么需要视频 CDN？

### 当前问题

**现状**: 视频直接从静态服务器 `https://static.vidfab.ai/` 加载

**挑战**:
- ❌ 固定视频质量 (1080p) - 移动端浪费带宽
- ❌ 无自适应码率 (ABR) - 网络波动时卡顿
- ❌ 单一源服务器 - 全球用户延迟高
- ❌ 下载整个视频文件 - 启动延迟长

**影响**:
- LCP: 2.8s (仍略高于目标 2.5s)
- 移动端流量消耗: 每页 6-8MB
- 用户体验: 慢速网络下卡顿

---

## 🎯 视频 CDN 方案对比

### 方案 1: Cloudflare Stream (推荐)

**优点**:
- ✅ 自适应码率 (ABR)
- ✅ 全球 CDN (200+ 数据中心)
- ✅ HLS/DASH 流媒体
- ✅ 自动生成 Poster
- ✅ 视频分析 (观看次数、完成率)
- ✅ 简单集成

**定价**: $1/1000 分钟观看 + $5/1000 分钟存储

**估算成本** (月):
- 存储: 100 个视频 × 平均 30s = 50分钟 → **$0.25**
- 观看: 10,000 次访问 × 平均 5 个视频 × 30s = 25,000分钟 → **$25**
- **总计**: ~$25/月

---

### 方案 2: Mux Video

**优点**:
- ✅ 极佳的开发者体验
- ✅ React 组件 (@mux/mux-player-react)
- ✅ 高级视频分析
- ✅ 低延迟直播 (如需要)
- ✅ 自动生成缩略图

**定价**: $0.005/分钟编码 + $0.01/GB 流量

**估算成本** (月):
- 编码: 100 视频 × 30s = $0.25
- 流量: 10,000 访问 × 5 视频 × 5MB = 250GB → **$2.50**
- **总计**: ~$3/月

**推荐**: 如果视频流量较大，Mux 更便宜 ⭐⭐⭐⭐⭐

---

### 方案 3: AWS CloudFront + S3

**优点**:
- ✅ 灵活配置
- ✅ 整合 AWS 生态
- ✅ 可自建 HLS 转码

**缺点**:
- ❌ 需要自行配置 HLS 转码
- ❌ 复杂度高
- ❌ 开发成本高

**定价**: 变量较多，需自行计算

---

### 方案 4: Vercel Blob (新方案)

**优点**:
- ✅ 与 Next.js 深度集成
- ✅ 简单易用
- ✅ 免费额度 (5GB 存储 + 10GB 流量)

**缺点**:
- ❌ 不支持自适应码率
- ❌ 仍是直接下载,非流媒体
- ❌ 主要用于静态资产

**推荐**: 不适合视频优化

---

## 🏆 推荐方案: Cloudflare Stream

### 理由

1. **性价比**: 中等流量下成本合理
2. **简单集成**: 无需复杂配置
3. **全球 CDN**: Cloudflare 网络遍布全球
4. **自动优化**: ABR + Poster 自动生成
5. **分析工具**: 内置视频分析

---

## 🚀 Cloudflare Stream 集成步骤

### 步骤 1: 创建 Cloudflare 账号并启用 Stream

```bash
# 1. 访问 https://dash.cloudflare.com/
# 2. 导航到 Stream → 启用服务
# 3. 获取 API Token
```

### 步骤 2: 上传视频

#### 方法 A: Web 界面上传

Dashboard → Stream → Upload

#### 方法 B: API 上传

```bash
# 安装依赖
npm install cloudflare

# 上传脚本
curl -X POST \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -F "file=@/path/to/video.mp4" \
  https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/stream
```

#### 方法 C: 批量上传脚本

创建 `scripts/upload-to-cloudflare-stream.js`:
```javascript
const fetch = require('node-fetch')
const fs = require('fs')
const FormData = require('form-data')

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN

async function uploadVideo(filePath) {
  const form = new FormData()
  form.append('file', fs.createReadStream(filePath))

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
      },
      body: form,
    }
  )

  const data = await response.json()
  console.log('Uploaded:', data.result.uid)
  return data.result.uid
}

// 使用
uploadVideo('./public/video/home-step-01.mp4')
```

---

### 步骤 3: 获取视频 UID

上传后会得到:
```json
{
  "uid": "5d5bc37ffcf54c9b82e996823bffbb81",
  "thumbnail": "https://videodelivery.net/5d5bc37ffcf54c9b82e996823bffbb81/thumbnails/thumbnail.jpg",
  "playback": {
    "hls": "https://videodelivery.net/5d5bc37ffcf54c9b82e996823bffbb81/manifest/video.m3u8",
    "dash": "https://videodelivery.net/5d5bc37ffcf54c9b82e996823bffbb81/manifest/video.mpd"
  }
}
```

---

### 步骤 4: 创建视频配置文件

创建 `lib/config/cloudflare-stream.ts`:
```typescript
// 视频 UID 映射
export const STREAM_VIDEOS = {
  'home-step-01': '5d5bc37ffcf54c9b82e996823bffbb81',
  'home-step-02': 'f5aa91e8f7d14c0983b11e9a65fa2a0a',
  'home-step-03': '9c2b6d0e3f8a4a1b8e7d6c5f4e3d2c1b',
  // ... 其他视频
} as const

export function getStreamUrl(videoKey: keyof typeof STREAM_VIDEOS): string {
  const uid = STREAM_VIDEOS[videoKey]
  return `https://videodelivery.net/${uid}/manifest/video.m3u8`
}

export function getStreamPoster(videoKey: keyof typeof STREAM_VIDEOS): string {
  const uid = STREAM_VIDEOS[videoKey]
  return `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`
}
```

---

### 步骤 5: 更新组件使用 HLS

#### 安装 HLS.js

```bash
npm install hls.js
```

#### 创建 StreamVideo 组件

创建 `components/common/stream-video.tsx`:
```tsx
"use client"

import { useEffect, useRef } from 'react'
import Hls from 'hls.js'
import { cn } from '@/lib/utils'

interface StreamVideoProps {
  src: string  // HLS manifest URL
  poster?: string
  className?: string
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  playsInline?: boolean
}

export function StreamVideo({
  src,
  poster,
  className,
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
}: StreamVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Safari 原生支持 HLS
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      return
    }

    // 其他浏览器使用 HLS.js
    if (Hls.isSupported()) {
      const hls = new Hls({
        startLevel: -1, // 自适应码率
        maxBufferLength: 30,
        maxBufferSize: 60 * 1000 * 1000, // 60MB
      })

      hls.loadSource(src)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) {
          video.play().catch(console.error)
        }
      })

      return () => {
        hls.destroy()
      }
    }
  }, [src, autoPlay])

  return (
    <video
      ref={videoRef}
      className={cn("w-full h-full object-cover", className)}
      poster={poster}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      preload="metadata"
    />
  )
}
```

---

### 步骤 6: 更新现有组件

#### FeatureShowcase

```tsx
// 原来
<LazyVideo
  src="https://static.vidfab.ai/public/video/home-step-01.mp4"
  autoPlay loop muted
/>

// 更新为
import { StreamVideo } from "@/components/common/stream-video"
import { getStreamUrl, getStreamPoster } from "@/lib/config/cloudflare-stream"

<StreamVideo
  src={getStreamUrl('home-step-01')}
  poster={getStreamPoster('home-step-01')}
  autoPlay loop muted
/>
```

#### 渐进式迁移策略

```tsx
// 创建通用组件，自动选择 Stream 或直接视频
function VideoPlayer({ videoKey, fallbackSrc }: Props) {
  const streamUrl = getStreamUrl(videoKey)

  // 如果有 Stream URL，优先使用
  if (streamUrl) {
    return <StreamVideo src={streamUrl} ... />
  }

  // Fallback 到直接视频
  return <LazyVideo src={fallbackSrc} ... />
}
```

---

## 📊 性能提升预估

### Cloudflare Stream 集成后

| 指标 | 当前 (直接视频) | Stream 集成后 | 改善 |
|-----|--------------|-------------|------|
| **LCP** | 2.8s | **1.8-2.2s** | **-21-36%** ✅ |
| **首帧时间** | 2-4s | **0.5-1s** | **-75%** |
| **移动端流量** | 8MB/页 | **2-3MB/页** | **-63%** |
| **码率适应** | 固定 1080p | 240p-1080p 自适应 | ⭐⭐⭐⭐⭐ |
| **全球延迟** | 变化大 | 一致性高 | +100% |
| **Lighthouse** | 75-80 | **90-95** 🚀 | +15-20 分 |

---

## 💰 成本分析

### 月度估算 (10,000 访问)

| 方案 | 存储 | 流量/观看 | 总计 |
|-----|------|----------|------|
| **当前** (静态) | $0 | $0 (自建) | $0* |
| **Cloudflare Stream** | $0.25 | $25 | **$25** |
| **Mux** | $0.25 | $2.50 | **$3** ⭐ |
| **AWS CloudFront** | $1 | $5-10 | **$6-11** |

*注: 当前方案需自行承担服务器和带宽成本

---

## 🎯 实施建议

### 阶段 1: 试点 (1-2 周)

1. **选择 1-2 个关键视频迁移**
   - 首页 Hero 视频
   - Text-to-Video Hero 视频

2. **A/B 测试**
   - 50% 用户使用 Stream
   - 50% 用户使用直接视频
   - 监控 LCP、带宽、用户体验

3. **评估效果**
   - Lighthouse 分数
   - Web Vitals 数据
   - 用户反馈

### 阶段 2: 全量迁移 (2-3 周)

1. **批量上传所有视频**
2. **更新所有视频组件**
3. **监控成本和性能**

### 阶段 3: 优化 (持续)

1. **调整码率档位**
2. **优化 Poster 生成**
3. **分析用户行为数据**

---

## 🔧 开发环境配置

### .env.local

```bash
# Cloudflare Stream
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# 启用 Stream (开发环境可选禁用)
NEXT_PUBLIC_USE_STREAM=true
```

### 条件加载

```tsx
const USE_STREAM = process.env.NEXT_PUBLIC_USE_STREAM === 'true'

function VideoPlayer({ videoKey, fallbackSrc }: Props) {
  if (USE_STREAM) {
    return <StreamVideo src={getStreamUrl(videoKey)} ... />
  }
  return <LazyVideo src={fallbackSrc} ... />
}
```

---

## ⚠️ 注意事项

### 1. 浏览器兼容性

HLS.js 支持:
- ✅ Chrome
- ✅ Firefox
- ✅ Edge
- ✅ Safari (原生 HLS)
- ✅ 移动端浏览器

### 2. 备份策略

始终保留原始视频文件作为 fallback:
```tsx
<StreamVideo
  src={streamUrl}
  onError={() => setUseFallback(true)}
/>
{useFallback && <LazyVideo src={fallbackUrl} />}
```

### 3. 监控成本

设置 Cloudflare 成本告警:
- Dashboard → Stream → Settings → Cost Alerts
- 月度预算: $30-50

---

## 📚 相关资源

- [Cloudflare Stream 文档](https://developers.cloudflare.com/stream/)
- [HLS.js GitHub](https://github.com/video-dev/hls.js/)
- [Mux 文档](https://docs.mux.com/)
- [视频优化最佳实践](https://web.dev/fast/#optimize-your-videos)

---

## 🎯 决策建议

### 立即实施 (ROI 高)

- [x] Poster 图优化 (免费,  LCP -30%)
- [x] 代码分割 (免费, TBT -20%)
- [x] 字体预加载 (免费, FCP -10%)

### 短期考虑 (1-2 月内)

- [ ] Cloudflare Stream 试点 (LCP -21-36%, 成本 ~$25/月)
- [ ] 条件: 月访问量 > 10,000

### 长期规划 (3-6 月内)

- [ ] 全量迁移到 Stream
- [ ] 视频分析和优化
- [ ] 考虑直播功能 (如需要)

---

**文档创建**: 2025-10-16
**维护者**: VidFab 开发团队
**推荐方案**: Cloudflare Stream (性价比)
**状态**: 方案评估中 - 待业务决策
