# 图片优化完整指南

## 📊 当前状态分析

VidFab 目前主要使用视频内容，图片资源较少，主要包括：
- Logo (SVG 格式) ✅ 已优化使用 Next.js Image
- OG 图片 (Open Graph) - 需优化
- Poster 图 (视频缩略图) - 待添加

---

## 🎯 图片优化策略

### 1. 格式选择

| 格式 | 使用场景 | 文件大小 | 兼容性 | 推荐度 |
|-----|---------|---------|-------|--------|
| **SVG** | Logo、图标 | 最小 | ✅ 所有浏览器 | ⭐⭐⭐⭐⭐ |
| **WebP** | 照片、截图 | 小 (-30% vs JPEG) | ✅ 现代浏览器 | ⭐⭐⭐⭐⭐ |
| **AVIF** | 高质量图片 | 最小 (-50% vs JPEG) | ⚠️ Safari 16+ | ⭐⭐⭐⭐ |
| **JPEG** | 照片 fallback | 中 | ✅ 所有浏览器 | ⭐⭐⭐ |
| **PNG** | 透明图片 | 大 | ✅ 所有浏览器 | ⭐⭐ |

---

### 2. Next.js Image 组件

**已优化**: Navbar Logo ✅

**最佳实践**:
```tsx
import Image from 'next/image'

// ✅ 正确用法
<Image
  src="/logo.svg"
  alt="VidFab"
  width={140}
  height={56}
  priority  // 首屏内容使用 priority
/>

// ✅ 响应式图片
<Image
  src="/hero-image.jpg"
  alt="Hero"
  fill
  sizes="(max-width: 768px) 100vw, 50vw"
  quality={85}
/>

// ❌ 避免: 使用原生 img 标签
<img src="/logo.svg" alt="Logo" />
```

---

### 3. 响应式图片 (srcset)

为不同屏幕尺寸提供不同大小的图片：

```tsx
<Image
  src="/feature-image.jpg"
  alt="Feature"
  width={1200}
  height={800}
  sizes="(max-width: 640px) 100vw,
         (max-width: 1024px) 50vw,
         33vw"
  quality={85}
/>
```

Next.js 会自动生成:
```html
<img
  srcset="
    /_next/image?url=/feature.jpg&w=640 640w,
    /_next/image?url=/feature.jpg&w=750 750w,
    /_next/image?url=/feature.jpg&w=1024 1024w,
    /_next/image?url=/feature.jpg&w=1200 1200w
  "
  sizes="..."
/>
```

---

### 4. 图片压缩工具

#### 在线工具
- [TinyPNG](https://tinypng.com/) - PNG/JPEG 压缩
- [Squoosh](https://squoosh.app/) - 多格式转换
- [Compressor.io](https://compressor.io/) - 高质量压缩

#### 命令行工具

**ImageMagick**:
```bash
# JPEG 压缩
convert input.jpg -quality 85 -strip output.jpg

# 调整尺寸
convert input.jpg -resize 1200x output.jpg

# WebP 转换
convert input.jpg -quality 85 output.webp
```

**cwebp (Google)**:
```bash
# JPEG → WebP
cwebp -q 85 input.jpg -o output.webp

# PNG → WebP (无损)
cwebp -lossless input.png -o output.webp

# 批量转换
for file in *.jpg; do
  cwebp -q 85 "$file" -o "${file%.jpg}.webp"
done
```

**Sharp (Node.js)**:
```bash
npm install sharp

# 创建 scripts/optimize-images.js
const sharp = require('sharp')

sharp('input.jpg')
  .resize(1200, 800, { fit: 'cover' })
  .webp({ quality: 85 })
  .toFile('output.webp')
```

---

## 🚀 实施建议

### 优先级 1: OG 图片优化

**当前**: `public/og-image.jpg`, `public/twitter-image.jpg`

**优化步骤**:
1. 检查文件大小 (目标 < 200KB)
2. 转换为 WebP 格式
3. 生成多尺寸版本

```bash
# 生成 OG 图片
convert og-image-source.jpg \
  -resize 1200x630 \
  -quality 85 \
  -strip \
  public/og-image.jpg

# 生成 WebP 版本
cwebp -q 85 public/og-image.jpg -o public/og-image.webp

# Twitter 图片
convert twitter-image-source.jpg \
  -resize 1200x675 \
  -quality 85 \
  -strip \
  public/twitter-image.jpg
```

---

### 优先级 2: 视频 Poster 图

参考 `docs/video-poster-optimization.md`

---

### 优先级 3: 未来图片资源

当添加新图片资源时：

**检查清单**:
- [ ] 使用 Next.js Image 组件
- [ ] 提供 WebP 格式
- [ ] 设置合适的 `width` 和 `height`
- [ ] 首屏图片使用 `priority`
- [ ] 非首屏图片使用默认 lazy loading
- [ ] 设置 `alt` 文本 (SEO + 无障碍)
- [ ] 文件大小 < 100KB (照片), < 20KB (图标)

---

## 📊 图片性能预算

### 每页预算

| 页面 | 图片数量 | 总大小预算 | 当前 | 状态 |
|-----|---------|-----------|------|------|
| 首页 | 1 (Logo) | < 100KB | ~15KB (SVG) | ✅ 优秀 |
| 落地页 | 1 (Logo) | < 100KB | ~15KB (SVG) | ✅ 优秀 |
| OG 图片 | 2 | < 400KB | ? | ⚠️ 需检查 |

---

## 🔍 图片审计工具

### Lighthouse

```bash
npm run lighthouse

# 查看 "Opportunities" 部分:
# - Properly size images
# - Serve images in next-gen formats
# - Efficiently encode images
```

### Chrome DevTools

1. 打开 DevTools → Network
2. 筛选: Img
3. 检查:
   - 文件大小
   - 加载时间
   - 是否使用 WebP

---

## 📈 预期性能提升

### OG 图片优化后

| 指标 | 优化前 | 优化后 | 改善 |
|-----|--------|--------|------|
| OG 图片大小 | ~500KB? | < 200KB | -60% |
| 社交分享速度 | 慢 | 快 | +2x |

### 视频 Poster 添加后

| 指标 | 优化前 | 优化后 | 改善 |
|-----|--------|--------|------|
| LCP | 2.8s | ~2.0s | **-29%** |
| Lighthouse | 75-80 | **85-90** | +10-15 分 |

---

## 🛠️ 自动化脚本

### 图片压缩脚本

创建 `scripts/optimize-images.sh`:
```bash
#!/bin/bash

IMAGE_DIR="public"
OPTIMIZED_DIR="public/optimized"
mkdir -p "$OPTIMIZED_DIR"

echo "🖼️  Optimizing images..."

# 压缩 JPEG
for img in "$IMAGE_DIR"/*.jpg "$IMAGE_DIR"/*.jpeg; do
  if [ -f "$img" ]; then
    filename=$(basename "$img")
    echo "Optimizing $filename..."

    # JPEG
    convert "$img" -quality 85 -strip "$OPTIMIZED_DIR/$filename"

    # WebP
    cwebp -q 85 "$img" -o "$OPTIMIZED_DIR/${filename%.jpg*}.webp"
  fi
done

# 压缩 PNG
for img in "$IMAGE_DIR"/*.png; do
  if [ -f "$img" ]; then
    filename=$(basename "$img")
    echo "Optimizing $filename..."

    # PNG (有损压缩)
    convert "$img" -quality 90 -strip "$OPTIMIZED_DIR/$filename"

    # WebP
    cwebp -q 90 "$img" -o "$OPTIMIZED_DIR/${filename%.png}.webp"
  fi
done

echo "✅ Image optimization complete!"
echo "📊 Review optimized images in $OPTIMIZED_DIR"
```

使用:
```bash
chmod +x scripts/optimize-images.sh
./scripts/optimize-images.sh
```

---

### CI/CD 集成

在 `package.json` 添加:
```json
{
  "scripts": {
    "optimize:images": "./scripts/optimize-images.sh",
    "prebuild": "npm run optimize:images"
  }
}
```

---

## 📚 最佳实践总结

### ✅ DO

1. **始终使用 Next.js Image 组件**
2. **提供 WebP 格式**
3. **设置明确的宽高** (避免 CLS)
4. **首屏图片使用 `priority`**
5. **使用 `alt` 文本**
6. **压缩图片 (quality 80-85)**
7. **使用 CDN**

### ❌ DON'T

1. **不要使用原生 `<img>` 标签**
2. **不要上传未压缩的图片**
3. **不要忽略 `alt` 属性**
4. **不要使用过大的图片**
5. **不要阻塞首屏渲染**

---

## 🔗 相关资源

- [Next.js Image 组件文档](https://nextjs.org/docs/api-reference/next/image)
- [WebP 图片格式](https://developers.google.com/speed/webp)
- [AVIF 图片格式](https://jakearchibald.com/2020/avif-has-landed/)
- [Lighthouse 图片优化](https://web.dev/fast/#optimize-your-images)

---

**文档创建**: 2025-10-16
**维护者**: VidFab 开发团队
**状态**: 完成 - Logo 已优化，其他图片资源待审计
