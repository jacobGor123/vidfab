# 工具页模板规划方案

> 状态：待评审
> 首个实例：Veo 3.1
> 日期：2026-03-05

---

## 一、需求背景

从文档梳理，工具页的核心价值是：**以某一 AI 模型为主角**，做一个独立的落地页 + 内嵌构建器。区别于现有的 `/text-to-video`（通用介绍）和 `/studio`（SaaS 工具台），工具页面向的是"想直接用这个模型"的用户，定位是模型级的 Playground 落地页。

已规划的工具页列表（优先级顺序）：
1. **Veo 3.1** (`/tools/veo3`) ← 本次实现
2. Sora 2 (`/tools/sora`)
3. 后续更多模型……

---

## 二、页面整体结构（通用模板）

```
ToolHero           ← 0→1 全新设计，区别于现有 page hero
ToolBuilder        ← 内嵌 Playground（核心）
ToolFeatures       ← 复用 AmazingFeatures
PromptShowcase     ← 新 section：示例 Prompt + 视频展示
CreatorTypes       ← 目标用户群展示（可复用 AmazingFeatures 变体）
FAQSection         ← 复用
CommunityCTA       ← 复用
```

---

## 三、文件结构

```
app/
  (main)/
    tools/
      veo3/
        page.tsx              ← Server component，SEO metadata
        veo3-client.tsx       ← Client 页面容器
      sora/                   ← 将来
      layout.tsx              ← 工具页公共 layout（无额外内容，继承 main layout）

components/
  tools/
    tool-hero.tsx             ← 通用 Hero（接受 config prop）
    tool-builder/
      index.tsx               ← 构建器主体（接受 toolConfig prop）
      builder-form.tsx        ← 左侧输入区
      builder-result.tsx      ← 右侧结果预览
      builder-history.tsx     ← 历史记录入口
      use-tool-builder.ts     ← 构建器状态 hook（复用轮询逻辑）
    prompt-showcase.tsx       ← 示例展示区
    creator-types.tsx         ← 创作者类型
    tool-page-config.ts       ← 工具页配置类型定义

lib/
  tools/
    tool-configs.ts           ← 各工具的完整配置数据（veo3, sora 等）
```

---

## 四、Hero Section（从 0 到 1 的设计）

### 现有 page hero 的局限
- 全屏视频背景 + 大标题 + 单个 CTA
- 纯品牌感，没有"模型直达"感
- 用户不清楚这里能做什么

### 新 Tool Hero 设计思路

```
[Badge: "Powered by Google DeepMind"]
[H1: "Your Direct Access to the Veo 3 Model"]
[副标题: "Stop waiting in line. Experience the raw cinematic power..."]
[CTA1: "Try for Free →"] [CTA2: "▼ Open Playground"]

背景：
  - 深色底（#000 / #0a0a0a）
  - 右侧：3×2 视频宫格（循环播放，视差效果）
  - 渐变光晕：左紫右粉，从中心向外扩散
  - 网格线装饰（subtle）
```

关键差异点：
1. **Badge** 标注模型来源（品牌背书感）
2. **Two CTAs**：一个跳转登录/开始，一个锚点跳转到构建器
3. **右侧视频宫格**：展示模型生成的效果（区别于现有的全屏 video bg）
4. **副标题的对抗感**："Stop waiting in line"（击中用户痛点）

---

## 五、Builder Section（核心构建器）

### 布局方案
```
[Section Title: "The Veo 3 Playground"]
[Subtitle: "Prompt. Generate. Be Amazed."]

Desktop: 左右两栏
  左栏（400px）:
    - Mode Toggle: [Text to Video] [Image to Video]
    - Image Upload（仅 I2V 模式）
    - Prompt Textarea
    - Aspect Ratio: [16:9] [9:16]
    - Duration: [4s] [6s] [8s]
    - Resolution: [720p] [1080p]
    - Audio: [ON] [OFF]  ← veo3 特有
    - Generate Button（显示消耗积分）

  右栏（flex-1）:
    - 生成前：占位动画 / 示例视频
    - 生成中：进度条 + 旋转动画
    - 生成后：视频播放 + 下载按钮
    - 历史记录入口（→ studio/my-assets）

Mobile: 上下布局，Form 折叠
```

### 技术复用策略

**复用现有 hooks（不重新发明轮子）：**
```tsx
// use-tool-builder.ts 内部复用：
import { useVideoGeneration } from "@/hooks/use-video-generation"
import { useVideoPollingV2 } from "@/hooks/use-video-polling-v2"
import { useVideoContext } from "@/lib/contexts/video-context"
import { useVideoGenerationAuth } from "@/hooks/use-auth-modal"
```

**Veo3 的模型 ID 映射：**
```ts
// text-to-video
model: "google/veo3.1-fast"  // 对应 route: /api/video/generate

// image-to-video
model: "google/veo3.1-fast"  // 对应 route: /api/video/generate-image-to-video
```

**Veo3 特有的参数扩展：**
- `generateAudio: boolean` → 已在 `VideoGenerationRequest` 类型中有 `generateAudio` 字段（✅ 无需改类型）
- Duration：4s/6s/8s → 需要在 `DURATION_MAP` 中确认是否支持 6s（待确认，可能需要加）
- Resolution：720p/1080p → 已有

**注意：工具页的构建器是独立的，不进入 studio sidebar 系统。** 但生成的视频任务会存入 VideoContext，所以在 studio/my-assets 中可以看到历史记录。

---

## 六、其余 Section 的复用

| Section | 方案 |
|---------|------|
| Features | `<AmazingFeatures>` - 直接复用，传入 Veo3 特定数据 |
| Prompt Showcase | 新建 `<PromptShowcase>`：卡片形式，左文字+右视频 |
| Creator Types | 新建 `<CreatorTypes>`：icon + 标题 + 描述，横排 |
| FAQ | `<FAQSection>` - 直接复用 |
| CTA | `<CommunityCTA showVideos={false}>` - 复用，不展示社区视频 |

---

## 七、工具页配置系统

通过配置驱动，让 Sora、Kling 等工具页快速复制：

```ts
// lib/tools/tool-configs.ts
export interface ToolPageConfig {
  slug: string                    // "veo3"
  modelName: string               // "Veo 3"
  modelBadge: string              // "Powered by Google DeepMind"
  hero: HeroConfig
  builder: BuilderConfig
  features: FeatureItem[]
  prompts: PromptExample[]
  creatorTypes: CreatorTypeItem[]
  faqs: FAQItem[]
  cta: CTAConfig
}

export interface BuilderConfig {
  models: {
    textToVideo: string           // "google/veo3.1-fast"
    imageToVideo: string          // "google/veo3.1-fast"
  }
  aspectRatios: string[]         // ["16:9", "9:16"]
  durations: string[]            // ["4s", "6s", "8s"]
  resolutions: string[]          // ["720p", "1080p"]
  supportsAudio: boolean         // true (veo3 特有)
  supportsImageToVideo: boolean  // true
}
```

---

## 八、SEO 考量

- `page.tsx` 为 Server Component，直接 export metadata
- URL：`/tools/veo3`（简洁，利于 SEO）
- Title 和 description 从 `tool-configs.ts` 读取
- OG Image：可用工具页截图或专属图
- Canonical 指向自身（不与 studio 页重复）

---

## 九、实现顺序（本次 Veo 3.1）

1. **创建配置：** `lib/tools/tool-configs.ts` + `veo3Config`
2. **创建路由：** `app/(main)/tools/veo3/page.tsx`
3. **新 Hero：** `components/tools/tool-hero.tsx`（0→1）
4. **Builder Hook：** `components/tools/tool-builder/use-tool-builder.ts`
5. **Builder UI：** `components/tools/tool-builder/`（form + result）
6. **新 Sections：** `prompt-showcase.tsx` + `creator-types.tsx`
7. **组装页面：** `app/(main)/tools/veo3/veo3-client.tsx`
8. **DURATION_MAP：** 确认并添加 `"6s": 6` 支持

---

## 十、潜在问题与建议

1. **6s duration**：当前 `DURATION_MAP` 只有 5s/8s/10s，Veo3 需要 4s/6s/8s，需要确认 API 侧是否支持 4s 和 6s，同步更新 `DURATION_MAP`。

2. **独立于 VideoContext**：工具页构建器产生的任务会进入全局 VideoContext，这意味着如果用户同时在 studio 里生成任务，会互相显示。**建议：** 在 my-assets 历史中共享没问题，但工具页的结果预览区只展示本次会话产生的任务（按 source/model 筛选）。

3. **Hero 视频宫格**：需要 6 个 Veo 3 生成的示例视频 URL（从文档中已有4个示例视频 ID，可在 CDN 上配置）。

4. **Audio 字段**：`VideoGenerationRequest.generateAudio` 已存在，无需改类型；但需要确认 `wavespeed-api.ts` 是否将此字段透传给上游 API。
