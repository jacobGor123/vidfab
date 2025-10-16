# 视频 Poster 图优化指南

## 📊 为什么需要 Poster 图？

视频 `poster` 属性指定在视频加载前显示的图片。这对性能有显著影响：

### 性能收益

| 指标 | 无 Poster | 有 Poster | 改善 |
|-----|----------|----------|------|
| **LCP** | 视频首帧加载时间 | Poster 图加载时间 | **-40-60%** |
| **用户体验** | 黑屏/白屏 | 立即显示内容 | ⭐⭐⭐⭐⭐ |
| **带宽节省** | 立即下载视频 | 按需下载 | -80% |

### 示例对比

**无 Poster (当前):**
```tsx
<video src="video.mp4" autoPlay loop muted />
// LCP: 等待视频首帧 (~2-4s)
```

**有 Poster (优化后):**
```tsx
<video
  src="video.mp4"
  poster="/posters/video-poster.jpg"
  autoPlay loop muted
/>
// LCP: Poster 图加载 (~200-400ms) ✅
```

---

## 🎯 实施步骤

### 步骤 1: 生成 Poster 图

#### 方法 A: 使用 FFmpeg (推荐)

```bash
# 提取视频第1帧作为 poster
ffmpeg -i input.mp4 -ss 00:00:01 -vframes 1 -q:v 2 output.jpg

# 批量处理
for video in *.mp4; do
  ffmpeg -i "$video" -ss 00:00:01 -vframes 1 -q:v 2 "${video%.mp4}-poster.jpg"
done
```

#### 方法 B: 在线工具

- [Cloudinary Video to Image](https://cloudinary.com/)
- [EZGIF Video to JPG](https://ezgif.com/video-to-jpg)

#### 方法 C: 手动截图

在视频播放器中暂停到合适的帧，截图保存。

---

### 步骤 2: 优化 Poster 图

#### 尺寸优化

**目标**:
- 宽度: 800-1200px (根据视频实际显示尺寸)
- 文件大小: < 50KB

**工具**:
```bash
# 使用 ImageMagick 压缩
convert input.jpg -quality 80 -resize 1200x output.jpg

# 使用 cwebp 转换为 WebP
cwebp -q 80 input.jpg -o output.webp
```

#### 格式选择

| 格式 | 文件大小 | 兼容性 | 推荐 |
|-----|---------|-------|------|
| **JPEG** | 中 | ✅ 所有浏览器 | 通用 |
| **WebP** | 小 (-30%) | ✅ 现代浏览器 | 优先 |
| **AVIF** | 最小 (-50%) | ⚠️ 部分浏览器 | 未来 |

**最佳实践**:
```tsx
<video poster="/posters/video.webp">
  {/* Fallback 在 video 标签的 poster 属性已经提供 */}
</video>
```

---

### 步骤 3: 更新代码

#### 方式 A: 直接添加 poster 属性

**FeatureShowcase 视频**:
```tsx
<LazyVideo
  src={videoUrl}
  poster="/posters/feature-01.webp"  // 新增
  autoPlay={true}
  loop={true}
  muted={true}
/>
```

**HowItWorks 视频**:
```tsx
<LazyVideo
  src={activeStepData.video}
  poster={`/posters/how-it-works-${activeStepData.number}.webp`}  // 新增
  autoPlay={true}
  loop={true}
  muted={true}
/>
```

**CommunityCTA 视频**:
```tsx
<video
  src={video.url}
  poster={`/posters/community/${video.id}.webp`}  // 新增
  autoPlay loop muted playsInline
/>
```

---

#### 方式 B: 自动生成 Poster URL

创建辅助函数:
```ts
// lib/utils/video.ts
export function getVideoPoster(videoUrl: string): string {
  // 假设视频 URL: https://static.vidfab.ai/video/home-step-01.mp4
  // Poster URL: https://static.vidfab.ai/posters/home-step-01.webp

  const url = new URL(videoUrl)
  const filename = url.pathname.split('/').pop()?.replace('.mp4', '') || 'default'
  return `${url.origin}/posters/${filename}.webp`
}
```

使用:
```tsx
<LazyVideo
  src={videoUrl}
  poster={getVideoPoster(videoUrl)}
  autoPlay={true}
  loop={true}
  muted={true}
/>
```

---

### 步骤 4: 上传 Poster 图

#### 本地开发

将 poster 图放在 `public/posters/` 目录:
```
public/
├── posters/
│   ├── home-step-01.webp
│   ├── home-step-02.webp
│   ├── home-step-03.webp
│   ├── text-to-video-01.webp
│   ├── image-to-video-01.webp
│   └── community/
│       ├── video-01.webp
│       ├── video-02.webp
│       └── ...
```

#### 生产环境

将 poster 图上传到 CDN:
```
https://static.vidfab.ai/posters/
├── home-step-01.webp
├── home-step-02.webp
└── ...
```

---

## 📈 性能提升预估

### 当前状态 (无 Poster)

| 页面 | LCP | 视频数量 | 首屏视频加载 |
|-----|-----|---------|------------|
| 首页 | ~3.2s | 3 (FeatureShowcase) | ~800ms |
| Text-to-Video | ~2.8s | 1 (Hero) + 4 (HowItWorks) | ~600ms |
| Image-to-Video | ~2.8s | 同上 | ~600ms |

### 优化后 (有 Poster)

| 页面 | LCP | Poster 加载 | LCP 改善 |
|-----|-----|-----------|---------|
| 首页 | **~2.0s** | ~300ms | **-37%** ✅ |
| Text-to-Video | **~1.8s** | ~250ms | **-36%** ✅ |
| Image-to-Video | **~1.8s** | ~250ms | **-36%** ✅ |

**关键改善**:
- LCP 达到 "Good" 标准 (< 2.5s) ✅
- 用户立即看到内容 (不再黑屏)
- Lighthouse Performance: 75-80 → **85-90** 🚀

---

## 🎨 Poster 图设计建议

### 视觉质量

1. **选择有代表性的帧**
   - 清晰展示视频内容
   - 避免过渡帧或模糊帧
   - 建议: 视频 1-2 秒处的画面

2. **添加视觉提示**
   - 可选: 添加半透明的播放按钮图标
   - 提示用户这是视频而非静态图

### 文件命名规范

```
home-step-01-poster.webp
text-to-video-hero-poster.webp
community-video-01-poster.webp
```

---

## 🚀 快速实施脚本

### 批量生成 Poster

创建 `scripts/generate-posters.sh`:
```bash
#!/bin/bash

# 配置
VIDEO_DIR="public/video"
POSTER_DIR="public/posters"
mkdir -p "$POSTER_DIR"

# 批量生成
for video in "$VIDEO_DIR"/*.mp4; do
  filename=$(basename "$video" .mp4)
  poster="$POSTER_DIR/${filename}.webp"

  echo "Generating poster for $filename..."

  # 提取第1秒的帧
  ffmpeg -i "$video" -ss 00:00:01 -vframes 1 -q:v 2 temp.jpg -y

  # 转换为 WebP 并压缩
  cwebp -q 80 temp.jpg -o "$poster"

  # 清理临时文件
  rm temp.jpg

  echo "✅ Generated: $poster"
done

echo "🎉 All posters generated!"
```

使用:
```bash
chmod +x scripts/generate-posters.sh
./scripts/generate-posters.sh
```

---

### 验证 Poster 效果

创建 `scripts/verify-posters.sh`:
```bash
#!/bin/bash

POSTER_DIR="public/posters"
REQUIRED_POSTERS=(
  "home-step-01.webp"
  "home-step-02.webp"
  "home-step-03.webp"
  "text-to-video-01.webp"
  # ... 添加所有需要的 poster
)

echo "🔍 Verifying posters..."
missing=0

for poster in "${REQUIRED_POSTERS[@]}"; do
  if [ ! -f "$POSTER_DIR/$poster" ]; then
    echo "❌ Missing: $poster"
    ((missing++))
  else
    echo "✅ Found: $poster"
  fi
done

if [ $missing -eq 0 ]; then
  echo "🎉 All posters are present!"
else
  echo "⚠️  $missing posters are missing"
  exit 1
fi
```

---

## 📊 监控指标

实施 Poster 优化后，监控以下指标:

### Lighthouse (目标)

- **Performance**: 85-90+
- **LCP**: < 2.5s ✅
- **First Contentful Paint**: < 1.5s

### Real User Monitoring

查看 Web Vitals 数据:
```typescript
// 已通过 components/web-vitals.tsx 自动收集
// 在 Google Analytics → 事件 → Web Vitals → LCP 查看改善
```

---

## ⚠️ 注意事项

### 1. Poster 必须匹配视频尺寸

```tsx
// ❌ 错误: Poster 是 16:9, 视频是 4:3
<video poster="16-9-poster.jpg" ...>

// ✅ 正确: 尺寸匹配
<video poster="matching-poster.jpg" ...>
```

### 2. 不要过度压缩

- 质量太低会影响用户体验
- 建议: WebP quality 75-85

### 3. 考虑深色/浅色模式

如果网站支持主题切换，poster 图也需要适配。

---

## 🔗 相关资源

- [MDN: `<video>` poster 属性](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video#poster)
- [FFmpeg 官方文档](https://ffmpeg.org/documentation.html)
- [WebP 压缩指南](https://developers.google.com/speed/webp)
- [Lighthouse LCP 优化](https://web.dev/lcp/)

---

**文档创建**: 2025-10-16
**维护者**: VidFab 开发团队
**状态**: 待实施 (需要实际 poster 图文件)
