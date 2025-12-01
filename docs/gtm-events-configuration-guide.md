# GTM 事件配置指南 - 生成功能事件追踪

本文档说明如何在 Google Tag Manager (GTM) 中配置生成功能的事件追踪。

## 概述

我们为所有生成功能（文生视频、图生视频、视频特效、文生图、图生图）实现了统一的事件追踪系统，共包含 9 种事件类型。

## 事件列表

### 1. click_generate（点击生成按钮）

**触发时机**: 用户点击「Generate」按钮时立即触发

**事件参数**:
```javascript
{
  event: 'click_generate',
  generation_type: string,          // 'text-to-video' | 'image-to-video' | 'video-effects' | 'text-to-image' | 'image-to-image'
  model_type: string,                // 模型名称，如 'kling-v1.6' | 'seedream-v4'
  duration: string,                  // 视频时长（仅视频生成），如 '5s' | '10s'
  ratio: string,                     // 宽高比，如 '16:9' | '1:1'
  resolution: string,                // 分辨率（仅视频），如 '720p' | '1080p'
  has_prompt: boolean,               // 是否输入了 prompt
  prompt_length: number,             // prompt 字符长度
  credits_required: number,          // 需要的积分数
  effect_id: string,                 // 特效 ID（仅 video-effects）
  effect_name: string,               // 特效名称（仅 video-effects）
  upload_mode: string,               // 上传模式（仅需要上传图片的功能），'local' | 'url'
  image_count: number                // 图片数量（仅 image-to-image，可能为 1-3）
}
```

**GTM 配置步骤**:
1. 创建触发器：
   - 类型：自定义事件
   - 事件名称：`click_generate`
2. 创建代码：
   - 类型：Google Analytics（GA4 事件）
   - 事件名称：`click_generate`
   - 事件参数：映射上述参数到 GA4 自定义维度/指标

---

### 2. generation_started（后端开始生成）

**触发时机**: API 成功返回 requestId 时触发（确认后端已开始处理）

**事件参数**:
```javascript
{
  event: 'generation_started',
  generation_type: string,          // 同上
  job_id: string,                    // 本地任务 ID
  request_id: string,                // 后端请求 ID
  model_type: string,                // 模型名称
  duration: string,                  // 视频时长（仅视频）
  ratio: string,                     // 宽高比
  resolution: string,                // 分辨率（仅视频）
  credits_required: number,          // 需要的积分数
  effect_id: string,                 // 特效 ID（仅 video-effects）
  effect_name: string,               // 特效名称（仅 video-effects）
  upload_mode: string,               // 上传模式
  image_count: number                // 图片数量（仅 image-to-image）
}
```

**GTM 配置步骤**:
1. 创建触发器：
   - 类型：自定义事件
   - 事件名称：`generation_started`
2. 创建代码：
   - 类型：Google Analytics（GA4 事件）
   - 事件名称：`generation_started`
   - 事件参数：映射参数（重点关注 `job_id` 和 `request_id` 用于追踪完整流程）

---

### 3. generation_success（生成成功）

**触发时机**: 轮询检测到生成完成并返回结果时触发

**事件参数**:
```javascript
{
  event: 'generation_success',
  generation_type: string,          // 同上
  job_id: string,                    // 本地任务 ID（与 generation_started 的 job_id 一致）
  request_id: string,                // 后端请求 ID
  model_type: string                 // 模型名称
}
```

**GTM 配置步骤**:
1. 创建触发器：
   - 类型：自定义事件
   - 事件名称：`generation_success`
2. 创建代码：
   - 类型：Google Analytics（GA4 事件）
   - 事件名称：`generation_success`
   - 事件参数：映射参数
3. **建议设置转化事件**：将 `generation_success` 标记为转化事件，用于衡量核心业务指标

---

### 4. generation_failed（生成失败）

**触发时机**: 轮询检测到生成失败或超时时触发

**事件参数**:
```javascript
{
  event: 'generation_failed',
  generation_type: string,          // 同上
  job_id: string,                    // 本地任务 ID
  request_id: string,                // 后端请求 ID
  error_type: string,                // 错误类型代码，如 'TIMEOUT' | 'GENERATION_ERROR'
  error_message: string,             // 用户可见的错误信息
  model_type: string                 // 模型名称
}
```

**GTM 配置步骤**:
1. 创建触发器：
   - 类型：自定义事件
   - 事件名称：`generation_failed`
2. 创建代码：
   - 类型：Google Analytics（GA4 事件）
   - 事件名称：`generation_failed`
   - 事件参数：映射参数（重点关注 `error_type` 和 `error_message` 用于错误分析）

---

### 5. upload_image（上传图片成功）

**触发时机**: 图片上传成功后触发

**适用功能**: image-to-video, video-effects, image-to-image

**事件参数**:
```javascript
{
  event: 'upload_image',
  generation_type: string,          // 'image-to-video' | 'video-effects' | 'image-to-image'
  upload_mode: string,               // 'local' | 'url'
  image_count: number                // 上传的图片数量（image-to-image 可能为 1-3）
}
```

**GTM 配置步骤**:
1. 创建触发器：
   - 类型：自定义事件
   - 事件名称：`upload_image`
2. 创建代码：
   - 类型：Google Analytics（GA4 事件）
   - 事件名称：`upload_image`
   - 事件参数：映射参数

---

### 6. input_prompt（输入提示词）

**触发时机**: 用户输入 prompt 后，停止输入 2 秒后触发（防抖处理，避免过度追踪）

**适用功能**: text-to-video, image-to-video, text-to-image, image-to-image

**事件参数**:
```javascript
{
  event: 'input_prompt',
  generation_type: string,          // 'text-to-video' | 'image-to-video' | 'text-to-image' | 'image-to-image'
  prompt_length: number              // prompt 字符长度
}
```

**特殊处理**:
- 使用 2 秒防抖，避免每次按键都触发
- 使用 `useRef` 去重，相同内容只触发一次

**GTM 配置步骤**:
1. 创建触发器：
   - 类型：自定义事件
   - 事件名称：`input_prompt`
2. 创建代码：
   - 类型：Google Analytics（GA4 事件）
   - 事件名称：`input_prompt`
   - 事件参数：映射参数

---

### 7. change_model（切换模型）

**触发时机**: 用户切换模型时触发

**事件参数**:
```javascript
{
  event: 'change_model',
  generation_type: string,          // 同上
  old_value: string,                 // 旧模型名称
  new_value: string                  // 新模型名称
}
```

**GTM 配置步骤**:
1. 创建触发器：
   - 类型：自定义事件
   - 事件名称：`change_model`
2. 创建代码：
   - 类型：Google Analytics（GA4 事件）
   - 事件名称：`change_model`
   - 事件参数：映射参数

---

### 8. change_duration（切换视频时长）

**触发时机**: 用户切换视频时长时触发

**适用功能**: text-to-video, image-to-video（仅视频生成功能）

**事件参数**:
```javascript
{
  event: 'change_duration',
  generation_type: string,          // 'text-to-video' | 'image-to-video'
  old_value: string,                 // 旧时长，如 '5s'
  new_value: string,                 // 新时长，如 '10s'
  model_type: string                 // 当前选择的模型
}
```

**GTM 配置步骤**:
1. 创建触发器：
   - 类型：自定义事件
   - 事件名称：`change_duration`
2. 创建代码：
   - 类型：Google Analytics（GA4 事件）
   - 事件名称：`change_duration`
   - 事件参数：映射参数

---

### 9. change_ratio（切换宽高比）

**触发时机**: 用户切换宽高比时触发

**适用功能**: text-to-video, image-to-video, text-to-image

**事件参数**:
```javascript
{
  event: 'change_ratio',
  generation_type: string,          // 'text-to-video' | 'image-to-video' | 'text-to-image'
  old_value: string,                 // 旧宽高比，如 '16:9'
  new_value: string,                 // 新宽高比，如 '1:1'
  model_type: string                 // 当前选择的模型
}
```

**GTM 配置步骤**:
1. 创建触发器：
   - 类型：自定义事件
   - 事件名称：`change_ratio`
2. 创建代码：
   - 类型：Google Analytics（GA4 事件）
   - 事件名称：`change_ratio`
   - 事件参数：映射参数

---

## 快速配置指南

### 步骤 1: 确认 gtag 已加载

确保您的网站已正确安装 Google Analytics (gtag.js)。

检查方法：在浏览器控制台输入 `window.gtag`，应该返回一个函数。

### 步骤 2: 在 GTM 中批量创建触发器

为每个事件创建一个「自定义事件」触发器：

1. 在 GTM 工作区，点击「触发器」→「新建」
2. 触发器类型：选择「自定义事件」
3. 事件名称：填入对应的事件名（如 `click_generate`）
4. 保存并重复 9 次（每个事件一个触发器）

### 步骤 3: 在 GTM 中创建 GA4 事件代码

为每个触发器创建对应的 GA4 事件代码：

1. 点击「代码」→「新建」
2. 代码类型：选择「Google Analytics: GA4 事件」
3. 配置代码 ID：填入您的 GA4 测量 ID（如 `G-XXXXXXXXXX`）
4. 事件名称：填入对应的事件名（如 `click_generate`）
5. 事件参数：添加自定义参数（见下方示例）
6. 触发条件：选择对应的触发器
7. 保存

**事件参数配置示例（以 click_generate 为例）**:

| 参数名称 | 值 | 类型 |
|---------|---|-----|
| generation_type | {{dlv - generation_type}} | 字符串 |
| model_type | {{dlv - model_type}} | 字符串 |
| duration | {{dlv - duration}} | 字符串 |
| ratio | {{dlv - ratio}} | 字符串 |
| has_prompt | {{dlv - has_prompt}} | 布尔值 |
| prompt_length | {{dlv - prompt_length}} | 数字 |
| credits_required | {{dlv - credits_required}} | 数字 |

**注意**: 您需要先在 GTM 中创建对应的「数据层变量」(Data Layer Variables)，命名为 `dlv - generation_type`, `dlv - model_type` 等。

### 步骤 4: 创建数据层变量

为每个参数创建数据层变量：

1. 点击「变量」→「用户定义的变量」→「新建」
2. 变量类型：选择「数据层变量」
3. 数据层变量名称：填入参数名（如 `generation_type`）
4. 保存并重复（为所有参数创建变量）

### 步骤 5: 测试事件

1. 在 GTM 中点击「预览」
2. 访问您的网站
3. 执行各种操作（点击生成、上传图片、输入 prompt 等）
4. 在 GTM 预览面板中检查事件是否正确触发
5. 在 GA4 的「实时」报告中验证事件是否正确发送

### 步骤 6: 发布容器

测试无误后，点击「提交」发布您的 GTM 容器。

---

## 分析建议

### 1. 核心转化漏斗

使用这些事件创建转化漏斗，分析每个环节的转化率：

```
点击生成 (click_generate)
    ↓
后端开始处理 (generation_started)
    ↓
生成成功 (generation_success)
```

**关键指标**:
- `generation_started / click_generate` = API 成功率
- `generation_success / generation_started` = 生成成功率
- `generation_success / click_generate` = 端到端转化率

### 2. 失败分析

使用 `generation_failed` 事件分析失败原因：

- 按 `error_type` 分组，找出最常见的失败类型
- 按 `model_type` 分组，找出哪些模型失败率较高
- 按 `generation_type` 分组，找出哪些功能失败率较高

### 3. 用户行为分析

- **Prompt 使用习惯**: 分析 `input_prompt` 的 `prompt_length`，了解用户通常输入多长的 prompt
- **模型偏好**: 分析 `change_model` 和 `click_generate` 的 `model_type`，了解用户最喜欢用哪个模型
- **参数调整**: 分析 `change_duration` 和 `change_ratio`，了解用户的参数调整习惯

### 4. 积分消耗分析

使用 `click_generate` 的 `credits_required` 参数：

- 按 `generation_type` 统计不同功能的积分消耗
- 计算平均每次生成消耗的积分
- 分析高积分功能的使用频率

---

## 常见问题

### Q1: 为什么有些事件参数可能为空？

A: 某些参数只在特定功能中使用，例如：
- `duration` 和 `resolution` 仅在视频生成中存在
- `effect_id` 和 `effect_name` 仅在 video-effects 中存在
- `image_count` 仅在 image-to-image 中可能大于 1

### Q2: input_prompt 事件为什么会延迟触发？

A: 为了避免过度追踪，我们使用了 2 秒防抖。这意味着用户停止输入 2 秒后才会触发事件。

### Q3: 如何追踪一次完整的生成流程？

A: 使用 `job_id` 和 `request_id` 参数：
- `job_id`: 本地任务 ID，在 `generation_started`, `generation_success`, `generation_failed` 中保持一致
- `request_id`: 后端请求 ID，在 `generation_started`, `generation_success`, `generation_failed` 中保持一致

通过这两个 ID，您可以在 GA4 中追踪一次生成的完整生命周期。

### Q4: 如何区分不同的生成功能？

A: 使用 `generation_type` 参数：
- `'text-to-video'` - 文生视频
- `'image-to-video'` - 图生视频
- `'video-effects'` - 视频特效
- `'text-to-image'` - 文生图
- `'image-to-image'` - 图生图

---

## 技术实现说明

所有事件通过 `GenerationAnalytics` 服务层统一管理，代码位置：`/lib/analytics/generation-events.ts`

事件触发位置：
- **点击和参数事件**: 在各个面板组件中触发
- **成功/失败事件**: 在轮询 Hook 中触发 (`use-video-polling-v2.ts`, `use-image-polling-v2.ts`)

---

## 更新日志

**2025-11-27**: 初始版本，包含所有 9 种事件类型的完整配置
