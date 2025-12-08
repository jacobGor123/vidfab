# 文章创作规范

> 基于 SEO 最佳实践的文章创作完整指南

本文档整合了经过验证的 SEO 优化方法,包括标题公式、关键词策略、内容结构、图片规范等。

---

## 📋 目录

- [标题公式战略](#标题公式战略)
- [内容结构规范](#内容结构规范)
- [图片生成与优化](#图片生成与优化)
- [SEO 优化清单](#seo-优化清单)

---

## 标题公式战略

### 八大标题公式优先级

基于真实数据分析,标题公式使用优先级:

#### Tier 1: 必须掌握 (占 40% 文章)

| 公式 | SEO 效果 | 使用场景 | 点击率 |
|-----|---------|---------|--------|
| **How to [X]** | ⭐⭐⭐⭐⭐ | 教程、操作指南 | 极高 |
| **Best/Top [Number]+ [X]** | ⭐⭐⭐⭐⭐ | 列表、推荐 | 极高 |
| **Ultimate/Complete Guide** | ⭐⭐⭐⭐⭐ | 核心支柱内容 | 高 |

**示例应用**:
```
✅ How to [解决某个问题] Without [常见问题]
✅ 10+ Best [工具/方法] for [目标] 2025
✅ [主题]: The Complete 2025 Guide
```

#### Tier 2: 高转化 (占 30% 文章)

| 公式 | 转化效果 | 使用场景 | 购买意向 |
|-----|---------|---------|----------|
| **[X] vs [Y]** | ⭐⭐⭐⭐⭐ | 对比、选择 | 极高 |
| **Is [X] Worth It?** | ⭐⭐⭐⭐⭐ | 评测、购买决策 | 极高 |
| **[Problem]? Here's How** | ⭐⭐⭐⭐ | 问题解决 | 高 |

#### Tier 3: 差异化 (占 30% 文章)

| 公式 | 分享率 | 使用场景 | 精准度 |
|-----|-------|---------|--------|
| **[Number] Mistakes That [X]** | ⭐⭐⭐⭐⭐ | 负面警示 | 高 |
| **[X] for [Audience]** | ⭐⭐⭐⭐ | 人群细分 | 极高 |

### 标题创作 4 大原则

1. ✅ **主关键词靠前** (前 15 字符内)
2. ✅ **必须包含年份** (2025/2026) → 提高点击率 15-20%
3. ✅ **情感触发词** (Best, Fix, Banned, Complete)
4. ✅ **长度控制** (50-60 字符理想,最大 70)

---

## 内容结构规范

### 推荐文章结构 (2000-2500 字)

```
1. 开篇引入 (数据/痛点) - 200 字
2. Key Takeaways (要点摘要) - 150 字
3. 核心内容 (3-5 个 H2 章节) - 1500 字
4. 操作指南 (How-to 步骤) - 300 字
5. CTA 组件 (自然插入 2-3 个)
6. FAQ 部分 (5 个常见问题) - 300 字
7. 结尾 CTA
```

### ⚠️ H2 标签规范

**所有 H2 标签必须添加 id 属性** (用于 TOC 目录导航):

```html
<!-- ✅ 正确 -->
<h2 id="why-this-matters">Why This Matters</h2>
<h2 id="common-mistakes">Common Mistakes to Avoid</h2>
<h2 id="faq">FAQ</h2>

<!-- ❌ 错误: 没有 id -->
<h2>Why This Matters</h2>
```

**ID 命名规范**:
- 使用 kebab-case (小写连字符)
- 只包含小写字母、数字和连字符
- 移除所有特殊字符和标点
- 确保在同一文章内唯一

**快速生成规则**:
```typescript
function titleToId(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')      // 移除特殊字符
    .replace(/\s+/g, '-')           // 空格替换为连字符
    .replace(/-+/g, '-')            // 多个连字符合并
    .replace(/^-+|-+$/g, '')        // 移除首尾连字符
}
```

### CTA 组件插入策略

**⚠️ 核心原则: 转化漏斗策略**

**建立信任 → 付费转化** (根据文章主题灵活选择)

#### CTA 布局规范 (硬性要求)

每篇文章必须插入 **2-3 个 HTML CTA**，严格遵循以下规则：

1. **文章前中部 (1-2 个)**
   - 根据文章主题选择合适的 CTA 类型
   - **间隔要求**: 两个 CTA 之间间隔 ≥ 20% (按文章总长度计算)

2. **文章底部 (必需 ⭐)**
   - **硬性要求**: 必须使用主产品 CTA (Dashboard CTA)
   - 位置: FAQ 之后或最后一个 H2 之后
   - 目的: 最终转化

#### CTA 技术实现说明

**BlogCTAInterceptor 自动拦截机制**:
- 如果你的项目使用了 CTA 拦截器组件 (如 `BlogCTAInterceptor`)
- Dashboard CTA 的链接 (如 `/dashboard`) 会被自动拦截
- 点击后弹出登录框，提升转化率
- 免费工具 CTA (如 `/free-tool`) 保持正常跳转

**样式管理**:
- 所有 CTA 样式统一由 `app/blog/blog.css` 管理
- 使用 BEM 命名规范 (`.blog-cta__title`, `.blog-cta__button` 等)
- 确保在不同设备上响应式显示

#### CTA 选择指南

| 文章主题 | 前面 1-2 个 CTA | 底部 CTA | 转化策略 |
|---------|----------------|----------|---------|
| **检测/安全/政策类** | 2 个免费工具 CTA | 产品 CTA (必需) | 教育风险 → 免费工具 → 付费转化 |
| **教程/创建类** | 1-2 个产品 CTA | 产品 CTA (必需) | 教育方法 → 立即尝试 → 最终转化 |
| **对比/评测类** | 1-2 个产品 CTA | 产品 CTA (必需) | 对比分析 → 引导尝试 → 购买决策 |

#### CTA 模板示例

**⚠️ 重要提示**: 以下模板仅为示例结构，**每个项目需要根据实际情况重新设计**：
- 修改标题、描述文案以匹配你的产品
- 替换图片 URL 为你的产品图片
- 调整链接路径为你的实际路由
- 更新信任标签 (trust badges) 内容

**免费工具 CTA (模板 A)**:
```html
<section class="blog-cta">
  <h3 class="blog-cta__title">Try Our Free Tool</h3>
  <p class="blog-cta__description">Get instant analysis of your content with our free tool.</p>
  <p class="blog-cta__trust">Free • Instant results • No signup required</p>
  <a href="/free-tool" class="blog-cta__button">Try Free Tool →</a>
</section>
```

**产品 CTA - Dashboard 入口 (模板 B - 底部必用)**:
```html
<section class="blog-cta">
  <h3 class="blog-cta__title">Transform Your Results Today</h3>
  <figure class="blog-cta__image">
    <img src="/images/product-hero.webp" alt="Product demonstration" />
  </figure>
  <p class="blog-cta__description">Get professional results in just 20 minutes. No technical skills needed.</p>
  <p class="blog-cta__trust">100+ features • Privacy-first • One-time payment</p>
  <a href="/dashboard" class="blog-cta__button">Get Started Now →</a>
</section>
```

**实际应用示例** (2500字文章):
```html
<!-- 第1个 CTA: 30% 位置 (约750字后) -->
<section class="blog-cta">
  <h3 class="blog-cta__title">Try Our Free Tool</h3>
  <!-- ... -->
</section>

<!-- 第2个 CTA: 65% 位置 (约1625字后，间隔35% > 20%✅) -->
<section class="blog-cta">
  <h3 class="blog-cta__title">Transform Your Results Today</h3>
  <!-- ... -->
</section>

<!-- 第3个 CTA: 底部 (FAQ之后，必须用产品CTA) -->
<section class="blog-cta">
  <h3 class="blog-cta__title">Transform Your Results Today</h3>
  <figure class="blog-cta__image">
    <img src="/images/product-hero.webp" alt="Product demonstration" />
  </figure>
  <!-- ... -->
</section>
```

### FAQ Schema 结构

每篇文章必须包含 5 个 FAQ,用于 Google 富文本展示:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is [主题]?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "简洁的答案,包含关键词..."
      }
    },
    // ... 4 more questions
  ]
}
```

---

## 图片生成与优化

### 图片数量建议

| 文章长度 | 推荐图片数量 | 说明 |
|---------|------------|------|
| 2000+ 字 (标准) | **3 张** (1 封面 + 2 内文) | 推荐配置 |
| 1500-2000 字 | **2 张** (1 封面 + 1 内文) | 最低要求 |

**图片类型分配**:
1. **封面图** (必需): 16:9 比例,展示文章主题
2. **内文图 1**: 4:3 或 16:9,配合核心内容
3. **内文图 2** (可选): 4:3 或 16:9,补充说明

### 图片命名规范 (语义化)

**⚠️ 所有博客图片必须使用语义化命名**

| 图片类型 | 命名格式 | 示例 |
|---------|---------|------|
| 封面图 | `{slug}-cover.webp` | `complete-guide-2025-cover.webp` |
| 内文图 1 | `{slug}-inline-1.webp` | `complete-guide-2025-inline-1.webp` |
| 内文图 2 | `{slug}-inline-2.webp` | `complete-guide-2025-inline-2.webp` |

**R2/S3 路径结构**:
```
封面图: blog/covers/{slug}-cover.webp
内文图: blog/images/{slug}-inline-{N}.webp
```

### 图片优化要求

**⚠️ 所有博客图片必须满足**:

1. **格式**: WebP (统一格式)
2. **大小**: < 130KB (强制要求)
3. **质量**: 自动调整 (从 85 逐步降到 60)
4. **尺寸**: 最大宽度 1920px

### Prompt 编写技巧

**基本原则**:
- **简洁为王**: 保持简短 (< 20 词)
- **主题明确**: 清楚说明图片主题和场景
- **避免复杂描述**: 使用简单形容词

**通用示例**:
```javascript
// 封面图 (16:9)
{
  filename: "article-slug-cover.jpg",
  prompt: "modern professional setting, clean design, natural lighting",
  aspect_ratio: "16:9",
  output_format: "jpg"
}

// 内文图 (4:3)
{
  filename: "article-slug-inline-1.png",
  prompt: "clean interface mockup, minimalist design, tech aesthetic",
  aspect_ratio: "4:3",
  output_format: "png"
}
```

---

## SEO 优化清单

### 每篇文章必须包含

- [ ] **标题优化**: 包含年份 + 主关键词 + 吸引点击的修饰词
- [ ] **Meta Description**: 150-160 字符,包含关键词 + 行动号召
- [ ] **Slug**: 简洁清晰,包含主关键词
- [ ] **H2 标签**: 所有 H2 必须有唯一 id 属性
- [ ] **关键词密度**: 主关键词 1-2%,避免堆砌
- [ ] **图片 Alt**: 每张图片唯一且描述性强的 alt 文本
- [ ] **CTA 配置**: 2-3 个 CTA,底部必须是产品 CTA
- [ ] **FAQ Schema**: 5 个常见问题,结构化数据
- [ ] **内链**: 至少 2-3 个相关内链
- [ ] **外链**: 1-2 个权威来源 (官方政策、研究报告)

### 关键词密度标准

| 关键词类型 | 理想密度 |
|-----------|---------|
| 主关键词 | 1-2% |
| 次要关键词 | 0.5-1% |
| 长尾词 | 0.3-0.8% |

### 图片 Alt 文本要求

- ✅ 每张图片都有 alt 属性
- ✅ Alt 文本描述性强,包含相关关键词
- ✅ 每个 alt 唯一,不重复
- ✅ 长度 50-125 字符

**优化示例**:

```html
<!-- ❌ 不好: 太通用或重复 -->
<img src="..." alt="guide image" />
<img src="..." alt="Complete Guide" /> <!-- 多处重复 -->

<!-- ✅ 好: 描述具体,包含关键词,唯一 -->
<img src="..." alt="Step-by-step guide showing the complete workflow from start to finish" />
<img src="..." alt="Dashboard interface demonstrating advanced features and settings" />
```

---

## 内链策略

### 内链原则

**⚠️ 核心原则: 自然插入,不强制添加**

内链必须满足以下条件:
1. **内容相关性高**: 链接的文章与当前段落内容高度相关
2. **上下文自然**: 链接插入后,句子读起来流畅自然
3. **为用户增值**: 链接能为用户提供额外价值
4. **不破坏阅读体验**: 不打断用户的阅读节奏

### 锚文本最佳实践

```html
<!-- ✅ 好的内链: 描述性强,上下文自然 -->
<p>Different platforms have different policies. For example, <a href="/blog/platform-specific-guide">Platform X has specific guidelines</a> that differ from others.</p>

<!-- ❌ 避免: 锚文本无意义 -->
<p>Learn more about this topic <a href="/blog/article">here</a>.</p>
```

### 双向内链建议

**每篇新文章**:
- 链接到核心支柱页
- 链接到同一集群内的 1-2 篇文章
- 链接到免费工具页 (如有)

---

## 内容创作原则

### DO ✅

1. **数据驱动**: 引用真实数据、案例、研究
2. **用户故事**: 每篇文章开头用真实场景/痛点引入
3. **视觉化**: 使用对比图、流程图、案例图
4. **行动导向**: 提供具体的步骤和操作指南
5. **专业但友好**: 专业术语要解释,语气要亲和

### DON'T ❌

1. **关键词堆砌**: 自然融入,不要为了 SEO 牺牲可读性
2. **过度承诺**: 不要夸大效果,保持真实
3. **忽略内链**: 每篇文章都要建立内链网络
4. **忽略图片优化**: 必须压缩到 < 130KB,使用 WebP
5. **忘记 CTA**: 严格遵守 2-3 个 CTA 规范

---

## 📊 质量检查清单

完成文章后,逐项检查:

### 内容质量
- [ ] 有用户故事或真实案例开头
- [ ] 段落长度适中 (2-4 句)
- [ ] 使用列表、粗体标记关键点
- [ ] 技术术语有解释或例子

### SEO 优化
- [ ] 标题包含年份和主关键词
- [ ] Meta description 150-160 字符
- [ ] 所有 H2 有唯一 id 属性
- [ ] 关键词密度合理 (1-2%)

### 图片优化
- [ ] 所有图片 < 130KB
- [ ] 使用 WebP 格式
- [ ] 语义化命名 (基于 slug)
- [ ] 每张图片有唯一的描述性 alt

### 转化优化
- [ ] CTA 组件自然插入 (2-3 个)
- [ ] 底部有产品 CTA
- [ ] 内链已添加 (2-3 个)
- [ ] FAQ Schema 已配置

---

## ✅ 下一步

掌握文章创作规范后:

👉 阅读 **04-topic-template.md** 学习系统化选题方法
