# GTM 事件配置指南 - 导航和订阅事件追踪

本文档说明如何在 Google Tag Manager (GTM) 中配置网站导航和订阅相关的事件追踪。

## 概述

我们为用户导航、订阅管理和升级流程实现了完整的事件追踪系统，共包含 10 种事件类型（包含 1 个优化的现有事件）。

这些事件帮助我们追踪：
- 用户如何浏览定价页面
- 用户如何探索各个功能
- 订阅升级的完整流程
- 用户取消订阅的行为

## 事件列表

### 1. view_pricing_page（访问价格页）

**触发时机**: 用户访问 `/pricing` 页面时自动触发

**事件参数**:
```javascript
{
  event: 'view_pricing_page'
  // 无额外参数
}
```

**代码位置**: `app/(main)/pricing/pricing-client.tsx:27-29`

**触发逻辑**:
```typescript
useEffect(() => {
  trackViewPricingPage()
}, [])
```

**GTM 配置步骤**:
1. 创建触发器：
   - 类型：自定义事件
   - 事件名称：`view_pricing_page`
2. 创建代码：
   - 类型：Google Analytics（GA4 事件）
   - 事件名称：`view_pricing_page`
3. **分析建议**：
   - 作为订阅转化漏斗的第一步
   - 与 `begin_checkout` 对比，计算"访问定价页 → 开始结账"的转化率

---

### 2. upgrade_click（点击升级按钮）

**触发时机**: 用户在 `/studio/plans`（Plans & Billing 页面）点击「Upgrade Plan」按钮时触发

**事件参数**:
```javascript
{
  event: 'upgrade_click',
  plan_from: string                // 当前套餐，如 'free' | 'lite' | 'pro'
}
```

**代码位置**: `components/create/my-profile-panel.tsx:64`

**触发逻辑**:
```typescript
const handleUpgrade = () => {
  trackUpgradeClick(subscription?.plan_id || 'free')
  router.push('/pricing')
}
```

**GTM 配置步骤**:
1. 创建触发器：
   - 类型：自定义事件
   - 事件名称：`upgrade_click`
2. 创建数据层变量：
   - 变量名：`dlv - plan_from`
   - 类型：数据层变量
   - 数据层变量名称：`plan_from`
3. 创建代码：
   - 类型：Google Analytics（GA4 事件）
   - 事件名称：`upgrade_click`
   - 事件参数：
     | 参数名称 | 值 |
     |---------|---|
     | plan_from | {{dlv - plan_from}} |

**分析建议**:
- 按 `plan_from` 分组，了解不同套餐用户的升级意愿
- 计算从点击升级到实际购买的转化率

---

### 3. begin_checkout（开始结账）【优化版】

**触发时机**: 用户点击任意套餐的升级/订阅按钮，准备进入支付流程时触发

**触发位置**:
1. Pricing 页面 - 点击任意套餐的「Get Started」按钮
2. 升级弹框 - 点击「Upgrade to XXX」按钮

**事件参数**:
```javascript
{
  event: 'begin_checkout',
  plan_id: string,                  // 套餐 ID，如 'lite' | 'pro' | 'premium'
  billing_cycle: string,            // 计费周期，'monthly' | 'annual'
  value: number,                    // 交易金额（美元）
  source: string,                   // 🔥 新增：触发来源
                                    //   'pricing_page' - 从定价页点击
                                    //   'upgrade_dialog' - 从积分不足弹框点击
  currency: 'USD',
  items: [
    {
      item_id: string,              // 如 'pro_annual'
      item_name: string,            // 如 'PRO Plan - Annual'
      item_category: 'subscription',
      price: number,
      quantity: 1
    }
  ]
}
```

**代码位置**:
- Pricing 页面：`app/(main)/pricing/pricing-client.tsx:172`
- 升级弹框：`components/subscription/upgrade-dialog.tsx:61`

**触发逻辑示例**:
```typescript
// Pricing 页面
trackBeginCheckout(planId, annual ? 'annual' : 'monthly', value, 'pricing_page')

// 升级弹框
trackBeginCheckout(planId, billingCycle, value, 'upgrade_dialog')
```

**GTM 配置步骤**:
1. 创建触发器：
   - 类型：自定义事件
   - 事件名称：`begin_checkout`
2. 创建数据层变量（新增）：
   - 变量名：`dlv - source`
   - 类型：数据层变量
   - 数据层变量名称：`source`
3. 更新现有的 GA4 事件代码：
   - 添加新参数 `source`：{{dlv - source}}

**这是 GA4 标准电商事件**，支持电商漏斗分析。

**分析建议**:
- 按 `source` 分组，对比不同入口的转化率
- 按 `billing_cycle` 分组，了解用户更倾向于月付还是年付
- 计算从 `begin_checkout` 到 `purchase` 的结账完成率

---

### 4. purchase（购买转化）【现有事件，无修改】

**触发时机**: 订阅成功后，在 `/subscription/success` 页面触发

**事件参数**: 与 `begin_checkout` 类似，为 GA4 标准购买事件

**代码位置**: `app/(main)/subscription/success/page.tsx:42`

**说明**: 此事件已存在，无需额外配置。作为转化漏斗的终点事件。

---

### 5. cancel_subscription（取消订阅）【现有事件，无修改】

**触发时机**: 用户取消订阅时触发

**事件参数**:
```javascript
{
  event: 'cancel_subscription',
  plan_id: string                   // 取消的套餐 ID
}
```

**代码位置**: `app/(main)/pricing/pricing-client.tsx:72`

**说明**:
- 原计划添加 `reason` 参数，但按照用户要求，只触发事件即可
- 此事件帮助追踪用户流失情况

**GTM 配置步骤**:
1. 创建触发器：
   - 类型：自定义事件
   - 事件名称：`cancel_subscription`
2. 创建代码：
   - 类型：Google Analytics（GA4 事件）
   - 事件名称：`cancel_subscription`
   - 事件参数：
     | 参数名称 | 值 |
     |---------|---|
     | plan_id | {{dlv - plan_id}} |

---

### 6. use_text_to_video（进入文生视频功能）

**触发时机**: 用户在 `/studio` 侧边栏切换到「Text to Video」tab 时触发

**事件参数**:
```javascript
{
  event: 'use_text_to_video'
  // 无额外参数
}
```

**代码位置**: `components/create/create-tabs.tsx:77`

**GTM 配置步骤**:
1. 创建触发器：
   - 类型：自定义事件
   - 事件名称：`use_text_to_video`
2. 创建代码：
   - 类型：Google Analytics（GA4 事件）
   - 事件名称：`use_text_to_video`

**分析建议**:
- 统计最受欢迎的功能
- 分析用户探索不同功能的路径

---

### 7. use_image_to_video（进入图生视频功能）

**触发时机**: 用户在 `/studio` 侧边栏切换到「Image to Video」tab 时触发

**事件参数**:
```javascript
{
  event: 'use_image_to_video'
  // 无额外参数
}
```

**代码位置**: `components/create/create-tabs.tsx:80`

**GTM 配置步骤**: 同 `use_text_to_video`

---

### 8. use_text_to_image（进入文生图片功能）

**触发时机**: 用户在 `/studio` 侧边栏切换到「Text to Image」tab 时触发

**事件参数**:
```javascript
{
  event: 'use_text_to_image'
  // 无额外参数
}
```

**代码位置**: `components/create/create-tabs.tsx:83`

**GTM 配置步骤**: 同 `use_text_to_video`

---

### 9. use_image_to_image（进入图生图片功能）

**触发时机**: 用户在 `/studio` 侧边栏切换到「Image to Image」tab 时触发

**事件参数**:
```javascript
{
  event: 'use_image_to_image'
  // 无额外参数
}
```

**代码位置**: `components/create/create-tabs.tsx:86`

**GTM 配置步骤**: 同 `use_text_to_video`

---

### 10. use_ai_effect（进入AI特效功能）

**触发时机**: 用户在 `/studio` 侧边栏切换到「Video Effects」tab 时触发

**事件参数**:
```javascript
{
  event: 'use_ai_effect'
  // 无额外参数
}
```

**代码位置**: `components/create/create-tabs.tsx:89`

**GTM 配置步骤**: 同 `use_text_to_video`

---

### 11. apply_ai_effect（使用AI特效模板）

**触发时机**: 用户在 Video Effects 功能中选择特效模板时触发

**事件参数**:
```javascript
{
  event: 'apply_ai_effect',
  effect_id: string                 // 特效 ID，如 '3d-zoom' | 'slow-motion'
}
```

**代码位置**: `components/create/video-effects-panel.tsx:615`

**触发逻辑**:
```typescript
const handleEffectSelect = (effect: VideoEffect) => {
  trackApplyAiEffect(effect.id)
  setParams(prev => ({ ...prev, selectedEffect: effect }))
  setShowEffectsModal(false)
}
```

**GTM 配置步骤**:
1. 创建触发器：
   - 类型：自定义事件
   - 事件名称：`apply_ai_effect`
2. 创建数据层变量：
   - 变量名：`dlv - effect_id`
   - 类型：数据层变量
   - 数据层变量名称：`effect_id`
3. 创建代码：
   - 类型：Google Analytics（GA4 事件）
   - 事件名称：`apply_ai_effect`
   - 事件参数：
     | 参数名称 | 值 |
     |---------|---|
     | effect_id | {{dlv - effect_id}} |

**分析建议**:
- 统计最受欢迎的特效模板
- 分析用户对不同特效的偏好

---

### 12. view_subscription（查看套餐）

**触发时机**: 用户点击查看套餐按钮时触发

**事件参数**:
```javascript
{
  event: 'view_subscription'
  // 无额外参数
}
```

**说明**: 此事件已在 `gtm.ts` 中定义，但当前代码中暂未使用。预留用于未来功能。

**GTM 配置步骤**:
1. 创建触发器：
   - 类型：自定义事件
   - 事件名称：`view_subscription`
2. 创建代码：
   - 类型：Google Analytics（GA4 事件）
   - 事件名称：`view_subscription`

---

## 快速配置指南

### 步骤 1: 确认 gtag 已加载

确保您的网站已正确安装 Google Analytics (gtag.js)。

检查方法：在浏览器控制台输入 `window.gtag`，应该返回一个函数。

### 步骤 2: 在 GTM 中批量创建触发器

为每个事件创建一个「自定义事件」触发器：

1. 在 GTM 工作区，点击「触发器」→「新建」
2. 触发器类型：选择「自定义事件」
3. 事件名称：填入对应的事件名（如 `view_pricing_page`）
4. 保存并重复（每个事件一个触发器）

**需要创建的触发器列表**:
- `view_pricing_page`
- `upgrade_click`
- `begin_checkout`（可能已存在，需要更新）
- `cancel_subscription`（可能已存在）
- `use_text_to_video`
- `use_image_to_video`
- `use_text_to_image`
- `use_image_to_image`
- `use_ai_effect`
- `apply_ai_effect`
- `view_subscription`

### 步骤 3: 创建数据层变量

为带参数的事件创建数据层变量：

1. 点击「变量」→「用户定义的变量」→「新建」
2. 变量类型：选择「数据层变量」
3. 数据层变量名称：填入参数名
4. 保存

**需要创建的数据层变量**:
- `plan_from` - 用于 upgrade_click
- `source` - 用于 begin_checkout（新增）
- `plan_id` - 用于 begin_checkout、cancel_subscription
- `billing_cycle` - 用于 begin_checkout
- `value` - 用于 begin_checkout
- `currency` - 用于 begin_checkout
- `items` - 用于 begin_checkout（数组类型）
- `effect_id` - 用于 apply_ai_effect

### 步骤 4: 在 GTM 中创建 GA4 事件代码

为每个触发器创建对应的 GA4 事件代码：

1. 点击「代码」→「新建」
2. 代码类型：选择「Google Analytics: GA4 事件」
3. 配置代码 ID：填入您的 GA4 测量 ID（如 `G-XXXXXXXXXX`）
4. 事件名称：填入对应的事件名
5. 事件参数：添加自定义参数（见各事件的参数表）
6. 触发条件：选择对应的触发器
7. 保存

**特殊处理 - begin_checkout 事件（GA4 标准电商事件）**:

由于 `begin_checkout` 是 GA4 标准电商事件，需要特殊配置：

1. 事件名称：`begin_checkout`
2. 事件参数：
   ```
   currency: USD
   value: {{dlv - value}}
   items: {{dlv - items}}
   source: {{dlv - source}}  // 新增参数
   ```
3. **电商数据** 部分：
   - 启用「发送电商数据」
   - 数据源：数据层
   - 使用 `items` 数组

### 步骤 5: 测试事件

1. 在 GTM 中点击「预览」
2. 访问您的网站
3. 执行各种操作：
   - 访问 pricing 页面
   - 点击升级按钮
   - 切换不同功能 tab
   - 选择 AI 特效
   - 点击订阅套餐
4. 在 GTM 预览面板中检查事件是否正确触发
5. 在 GA4 的「实时」报告中验证事件是否正确发送
6. 在浏览器控制台查看事件日志（所有事件都会打印 `✅ GTM ... Event Tracked`）

### 步骤 6: 发布容器

测试无误后，点击「提交」发布您的 GTM 容器。

---

## 完整转化漏斗分析

### 订阅转化漏斗（主路径）

```
1. 访问价格页 (view_pricing_page)
      ↓
2. 查看套餐详情 (可选，用户可能直接点击)
      ↓
3. 开始结账 (begin_checkout) [source: pricing_page]
      ↓
4. 完成支付 (purchase)
```

**关键指标**:
- `begin_checkout / view_pricing_page` = 定价页转化率
- `purchase / begin_checkout` = 结账完成率
- `purchase / view_pricing_page` = 端到端转化率

### 升级转化漏斗（积分不足路径）

```
1. 点击生成按钮，积分不足
      ↓
2. 弹出升级弹框
      ↓
3. 开始结账 (begin_checkout) [source: upgrade_dialog]
      ↓
4. 完成支付 (purchase)
```

**关键指标**:
- 通过 `source` 参数区分两种路径的转化率
- 对比分析哪种路径转化更高

### Plans & Billing 页面升级路径

```
1. 访问 Plans & Billing 页面
      ↓
2. 点击升级按钮 (upgrade_click) [plan_from: free/lite/pro]
      ↓
3. 跳转到 pricing 页面 (view_pricing_page)
      ↓
4. 开始结账 (begin_checkpoint) [source: pricing_page]
      ↓
5. 完成支付 (purchase)
```

**关键指标**:
- 按 `plan_from` 分组，了解不同套餐用户的升级意愿
- 计算从 `upgrade_click` 到 `purchase` 的转化率

---

## 功能使用分析

### 功能探索路径

通过 `use_xxx` 系列事件，分析用户如何探索不同功能：

1. 统计每个功能的使用频率
2. 分析用户切换功能的顺序
3. 识别最受欢迎的功能组合

**示例分析**:
```
用户A: use_text_to_video → use_image_to_video → use_ai_effect
用户B: use_text_to_image → use_image_to_image
```

### AI 特效使用分析

通过 `apply_ai_effect` 事件：

1. 统计最受欢迎的特效模板
2. 分析不同特效的使用频率
3. 识别用户偏好

---

## 流失分析

### 取消订阅分析

使用 `cancel_subscription` 事件：

1. 统计取消订阅的数量和比例
2. 按 `plan_id` 分组，了解哪个套餐流失率最高
3. 分析取消订阅的时间分布（新订阅用户 vs 长期用户）

**建议设置警报**：
- 当取消订阅数量异常增加时发送警报
- 监控特定套餐的流失率

---

## 分析建议

### 1. 创建自定义报告

在 GA4 中创建以下自定义报告：

**订阅转化报告**:
- 维度：`source`（begin_checkout 的来源）
- 指标：事件数、转化数、转化率

**功能使用报告**:
- 维度：事件名称（use_xxx 系列）
- 指标：事件数、唯一用户数

**特效偏好报告**:
- 维度：`effect_id`
- 指标：事件数、唯一用户数

### 2. 设置关键转化事件

在 GA4 中将以下事件标记为「关键事件」：

1. `purchase` - 购买转化（最重要）
2. `begin_checkout` - 开始结账
3. `upgrade_click` - 升级意愿

### 3. 创建受众群体

基于事件创建再营销受众：

**高意向未购买用户**:
- 条件：触发了 `begin_checkout` 但未触发 `purchase`
- 用于再营销活动

**活跃探索用户**:
- 条件：触发了 3 个以上不同的 `use_xxx` 事件
- 用于功能推广

**取消订阅用户**:
- 条件：触发了 `cancel_subscription`
- 用于挽回活动

### 4. A/B 测试建议

使用这些事件进行 A/B 测试：

1. **定价页面优化**：
   - 测试不同的定价展示方式
   - 对比 `begin_checkout / view_pricing_page` 转化率

2. **升级弹框优化**：
   - 测试不同的文案和设计
   - 对比不同版本的 `begin_checkout` (source: upgrade_dialog) 转化率

3. **功能推荐优化**：
   - 测试不同的功能排序
   - 对比不同版本的 `use_xxx` 事件分布

---

## 常见问题

### Q1: 为什么 begin_checkout 需要 source 参数？

A: 因为用户可以从多个入口进入结账流程：
- 直接在 pricing 页面点击套餐
- 从积分不足弹框点击升级
- （未来可能）从其他推广位置点击

通过 `source` 参数，我们可以分析不同入口的转化效果，优化转化路径。

### Q2: use_xxx 事件只在 /studio 中触发吗？

A: 是的。这些事件只在 `/studio` 页面的侧边栏切换时触发，不包括从主页或其他页面直接访问功能页面的情况。

如果需要追踪所有功能访问，可以考虑添加页面浏览事件。

### Q3: 如何区分新用户和老用户的行为？

A: 在 GA4 中，可以使用以下维度进行筛选：
- 新用户 vs 回访用户
- 用户首次访问日期
- 用户生命周期阶段

结合这些维度分析事件，可以深入了解不同用户群体的行为差异。

### Q4: 事件触发但 GA4 中看不到怎么办？

A: 排查步骤：
1. 检查浏览器控制台是否有 `✅ GTM ... Event Tracked` 日志
2. 确认 gtag 已正确加载（`window.gtag` 存在）
3. 在 GTM 预览模式中检查事件是否触发
4. 在 GA4 实时报告中查看（可能有几分钟延迟）
5. 检查 GA4 测量 ID 是否正确配置

---

## 技术实现说明

所有事件通过 `gtm.ts` 服务层统一管理，代码位置：`/lib/analytics/gtm.ts`

**事件触发位置汇总**:
| 事件名称 | 触发位置 | 代码行数 |
|---------|---------|---------|
| view_pricing_page | pricing-client.tsx | 27-29 |
| upgrade_click | my-profile-panel.tsx | 64 |
| begin_checkout | pricing-client.tsx<br>upgrade-dialog.tsx | 172<br>61 |
| cancel_subscription | pricing-client.tsx | 72 |
| use_text_to_video | create-tabs.tsx | 77 |
| use_image_to_video | create-tabs.tsx | 80 |
| use_text_to_image | create-tabs.tsx | 83 |
| use_image_to_image | create-tabs.tsx | 86 |
| use_ai_effect | create-tabs.tsx | 89 |
| apply_ai_effect | video-effects-panel.tsx | 615 |

**控制台日志格式**:
所有事件触发时都会在浏览器控制台打印日志，格式如下：
```
✅ GTM View Pricing Page Event Tracked
✅ GTM Upgrade Click Event Tracked: { planFrom: 'free' }
✅ GTM Begin Checkout Event Tracked: { planId: 'pro', billingCycle: 'annual', value: 199, source: 'pricing_page' }
```

---

## 更新日志

**2025-12-02**: 初始版本
- 新增 9 个导航和订阅事件
- 优化 begin_checkout 事件，增加 source 参数
- 完整的配置指南和分析建议

---

## 相关文档

- [GTM 事件配置指南 - 生成功能事件追踪](./gtm-events-configuration-guide.md)
- [订阅系统技术方案](./subscription-system-technical-design.md)

---

## 联系方式

如有问题或建议，请联系开发团队。
