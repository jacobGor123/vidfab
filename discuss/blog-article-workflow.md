# VidFab 博客文章创建 & 发布工作流

> 将此文档粘贴进新对话，然后告诉 Claude：选题 + 目标关键词（+ 可选：主推哪个功能页面），Claude 将完成以下全部工作。

---

## 你的任务

接收用户提供的「选题 + 关键词」，完成：

1. 去代码库核对产品准确信息
2. 写完整的文章 JSON
3. 保存到 `discuss/blog-articles/[slug].json`
4. 执行发布脚本上线

---

## Step 1：发布前先核对产品事实

**每次写文章之前必须核对以下内容，不得凭印象填写：**

| 要核对的内容 | 去哪里看 |
|---|---|
| 脚本分析用的 AI 模型名 | `lib/services/video-agent/processors/script/constants.ts` → `MODEL_NAME` |
| 分镜图生成用的图像模型名 | `lib/services/byteplus/image/seedream-api.ts` → `DEFAULT_IMAGE_MODEL` |
| 视频生成模型名 | `lib/services/byteplus/video/` 相关文件 |
| 支持的视频时长、比例 | `lib/types/video.ts` |
| 功能页面路由 | `app/studio/` 目录结构 |

> 当前已确认的准确值（随版本迭代可能变化，使用前仍需核对）：
> - 脚本分析：`gemini-3-flash-preview`（对外称 Gemini 3 Flash）
> - 分镜图生成：`seedream-5-0-260128`（对外称 Seedream 5.0）
> - Story-to-Video 工具路由：`/studio/video-agent-beta`

---

## Step 2：写文章 JSON

文件保存路径：`discuss/blog-articles/[slug].json`

### 完整 JSON 结构

```json
{
  "title": "文章 H1 标题（英文，包含主关键词）",
  "slug": "url-friendly-slug",
  "excerpt": "文章摘要，1-2 句，约 150 字符",
  "metaTitle": "SEO 标题，≤ 60 字符，含主关键词",
  "metaDescription": "SEO 描述，120-155 字符，含主关键词 + 价值主张",
  "canonicalUrl": "https://vidfab.ai/blog/[slug]",
  "tags": ["主关键词", "次关键词", "vidfab"],
  "category": "Tutorials",
  "faqSchema": [
    {
      "question": "FAQ 问题（目标搜索词的变体）",
      "answer": "精准回答，包含关键词，2-4 句"
    }
  ],
  "images": [
    {
      "filename": "slug-hero.jpg",
      "prompt": "英文图片生成 prompt，描述画面内容",
      "aspect_ratio": "16:9",
      "output_format": "jpg",
      "usage": "cover",
      "alt": "图片 alt 文本（含关键词）",
      "caption": "图片说明文字"
    },
    {
      "filename": "slug-feature-name.jpg",
      "prompt": "英文图片生成 prompt",
      "aspect_ratio": "16:9",
      "output_format": "jpg",
      "usage": "inline",
      "insertAfter": "section-id-name",
      "alt": "图片 alt 文本",
      "caption": "图片说明"
    }
  ],
  "htmlContent": "<article>...</article>"
}
```

### 图片规则
- `output_format` 只能是 `"jpg"` 或 `"png"`，**不支持 `"webp"`**
- 建议：1 张封面（cover, 16:9）+ 1-2 张内文图（inline）
- `insertAfter` 填对应 section 的 `id` 属性值

### htmlContent 写作规则

**结构要求：**
- 用 `<article>` 包裹全文
- 每个段落用 `<section id="xxx-section">` 包裹，id 要有意义
- 标题层级：`<h2>` 主标题，`<h3>` 子标题
- 列表：`<ul>/<li>`，重点词：`<strong>`

**SEO 要求：**
- 主关键词必须出现在正文前 100 字内
- 全文自然分布关键词及同义词，不堆砌

**CTA 组件（必须用此格式，禁止 inline style）：**
```html
<div class="cta-box">
  <h3>CTA 标题</h3>
  <p>CTA 说明文字</p>
  <a href="/studio/video-agent-beta" class="cta-button">按钮文字 →</a>
</div>
```
- 全文放 1-2 个 CTA，不要在相邻 section 里连放两个
- 推荐位置：How-to 流程介绍后 + 文章结尾

**内容语言：**
- htmlContent 全部用英文
- 文章所有面向用户的内容（标题、描述、按钮等）均用英文

---

## Step 3：发布

```bash
pnpm tsx scripts/publish-custom-article.ts \
  --file discuss/blog-articles/[slug].json \
  --status published
```

**脚本会自动处理：**
- 调用 Wavespeed API 生成图片（每张约 1-3 分钟）
- 压缩 + 上传到 Supabase Storage
- 写入/更新数据库（slug 已存在则走更新路径，不重复创建）
- 若 `.env.local` 有 `CRON_SECRET`，自动清 ISR 缓存

**如果图片生成超时（Wavespeed API 偶发），重新跑脚本即可。**

---

## 文章质量检查清单

发布前过一遍：

- [ ] 所有产品功能描述与代码库实际一致（模型名、功能名）
- [ ] metaTitle ≤ 60 字符
- [ ] metaDescription 120-155 字符
- [ ] 主关键词在正文前 100 字内出现
- [ ] 全文只有 1-2 个 CTA，且不相邻
- [ ] 所有 CTA 使用 `.cta-box` + `.cta-button` class，无 inline style
- [ ] `output_format` 是 `"jpg"` 或 `"png"`
- [ ] htmlContent 全为英文
- [ ] FAQ 至少 4 条，覆盖常见搜索问题

---

## 参考文章示例

`discuss/blog-articles/ai-storyboard-generator-from-text.json`
