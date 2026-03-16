# VidFab iOS App 设计文档（Capacitor 方案）

**日期**：2026-03-16
**状态**：已确认，待实施
**目标平台**：iOS 优先，Android 后续跟进

---

## 1. 背景与目标

### 驱动力
- **App Store 上架**：借助商店分发获取新用户，增强品牌可信度
- **原生能力接入**：相机直拍上传、推送通知（生成完成提醒）、视频保存相册
- **留存与粘性**：App icon 桌面常驻，推送通知主动触达用户

### 核心约束
- 开发资源有限，主要由 AI 辅助完成
- 不重写 UI，最大化复用现有 Next.js 代码
- App v1 轻量化，只覆盖核心功能

---

## 2. 架构方案：Capacitor Remote URL

### 选型决策

放弃静态打包（Static Bundle）方案，原因：现有项目大量使用 Server Components、API Routes、NextAuth，静态导出会导致绝大多数功能失效。

**采用 Remote URL 方案**：Capacitor 提供一个注入了原生插件 Bridge 的 WebView 壳，加载线上 `https://vidfab.ai`。

```
┌─────────────────────────────────┐
│          iOS Native Shell        │
│  ┌───────────────────────────┐  │
│  │   Capacitor WebView        │  │
│  │   加载 https://vidfab.ai   │  │
│  │                            │  │
│  │   ← 注入原生 Bridge →      │  │
│  └───────────────────────────┘  │
│                                  │
│  原生插件层：                    │
│  • 推送通知 (APNs / FCM)        │
│  • 相机 / 相册访问              │
│  • 视频文件下载                 │
│  • 深链接 / Universal Links     │
│  • IAP (StoreKit + RevenueCat)  │
└─────────────────────────────────┘
```

### 核心优势
- 现有所有 Next.js 代码完全不改动
- 网站更新即时生效，无需重新提交 App Store 审核
- 开发成本最低

---

## 3. App v1 功能范围

### 包含功能

| 模块 | 功能 |
|---|---|
| 核心生成 | Text-to-Video、Image-to-Video、AI Video Effects、Text-to-Image、Image-to-Image |
| 账号体系 | 登录/注册、积分余额查看、生成历史记录、订阅/购买积分 |
| 定价 | 定价页（展示套餐，购买走 IAP） |

### 排除功能（v1 不做）
- Studio 工具台（Video Agent Beta、Plans 故事板）
- 博客
- About / 联系我们
- 营销首页

---

## 4. 导航结构

### 底部三 Tab 导航

```
┌─────────────────────────────────┐
│  Safe Area (状态栏)              │
├─────────────────────────────────┤
│                                 │
│           页面内容               │
│                                 │
├─────────────────────────────────┤
│   ⚡ 生成      📁 历史    👤 我的 │
├─────────────────────────────────┤
│  Safe Area (Home Indicator)     │
└─────────────────────────────────┘
```

| Tab | 内容 |
|---|---|
| ⚡ 生成 | 顶部横向 Tab 切换五个工具，参数配置区 + 提交按钮 |
| 📁 历史 | 全部生成记录，按时间排列，支持下载、分享 |
| 👤 我的 | 账号信息、积分余额、订阅状态、定价页、IAP 购买入口 |

### 生成 Tab 内部结构

```
[ T2V ] [ I2V ] [ Effects ] [ T2I ] [ I2I ]   ← 顶部横向切换
─────────────────────────────────────────────
  参数配置区
  （prompt 输入、图片上传、参数选项）

  [        生成        ]                       ← 提交按钮
```

### 未登录态处理
- 可以浏览生成界面、调整参数
- 点击提交时弹出登录/注册弹窗
- 登录完成后自动继续提交

---

## 5. IAP 合规策略

### 策略：双轨制 + RevenueCat 中间层

苹果规定：App 内数字商品/订阅必须走 IAP（苹果抽 30%），不得有外部支付链接或价格提示。

```
Web 用户                App 用户
    │                       │
  Stripe                 StoreKit
    │                       │
    └──── RevenueCat ────────┘
                │
          Webhook → API
                │
         Supabase credits / subscription
```

### IAP 产品映射

| 现有 Stripe 产品 | App Store IAP 产品 ID |
|---|---|
| Starter 订阅（月付） | `ai.vidfab.starter.monthly` |
| Pro 订阅（月付） | `ai.vidfab.pro.monthly` |
| 积分包 100 | `ai.vidfab.credits.100` |
| 积分包 500 | `ai.vidfab.credits.500` |

### 价格策略
App 内价格比网站略高（覆盖 30% 苹果抽成），例：
- 网站 $9.9/月 → App $12.99/月

### App 内限制
- 不出现 Stripe 相关文字
- 不放任何跳转到网站购买的链接
- 积分不足时只展示 IAP 购买选项

---

## 6. Auth 深链接适配

### Universal Links 方案

```
用户点击 Google 登录
        ↓
跳出浏览器完成 OAuth
        ↓
Google 重定向 → https://vidfab.ai/api/auth/callback/google
        ↓
苹果识别为 Universal Link → 自动打开 VidFab App
        ↓
App 内完成 Session 建立
```

### 实施要点

1. **AASA 文件**：在 `vidfab.ai/.well-known/apple-app-site-association` 部署，声明 App 与域名的关联
2. **Capacitor 配置**：注册 Universal Links 域名
3. **Google OAuth Console**：添加 App scheme 为授权回调地址

### 各登录方式兼容性

| 登录方式 | 处理方式 | 工作量 |
|---|---|---|
| Google OAuth | Universal Links 适配 | 中 |
| Email / 密码 | WebView 内直接可用 | 零 |
| Magic Link | 深链接接收邮件跳转 | 小 |

---

## 7. Mobile UI 适配

### 环境检测

```typescript
// lib/hooks/use-app-env.ts
export function useAppEnv() {
  const isApp = typeof window !== 'undefined' &&
    (window as any).Capacitor?.isNativePlatform()
  return { isApp, isWeb: !isApp }
}
```

根 layout 根据此 flag 条件渲染：App 环境隐藏 Navbar/Footer，显示底部导航 + Safe Area 适配。

### Safe Area 全局处理

```css
.app-env {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

### 移动端细节处理

| 问题 | 方案 |
|---|---|
| 键盘弹起遮挡输入框 | `@capacitor/keyboard` 插件监听高度动态调整 |
| 长按弹出系统菜单 | 非文本区域 CSS 禁用 `user-select` |
| 视频全屏播放 | 原生 fullscreen API 覆盖 WebView |
| 点击区域太小 | 所有可点击元素最小 44×44pt |

---

## 8. 原生功能对接

### 8.1 推送通知

```
生成任务完成 → worker 触发 FCM API → APNs → 用户手机通知
                                                    ↓
                                         点击通知 → 打开 App 直达历史页
```

- 插件：`@capacitor/push-notifications`
- 推送服务：Firebase Cloud Messaging（统一管理 iOS/Android）
- Device Token：用户登录后上报，存 Supabase `user_devices` 表

### 8.2 相机 / 相册上传

```
点击「上传图片」
      ↓
App 环境：原生 Action Sheet（拍照 / 从相册选择）
Web 环境：原有 <input type="file">
      ↓
图片经 Capacitor Bridge 传回 → 现有上传逻辑不变
```

- 插件：`@capacitor/camera`
- 仅修改上传组件入口层，上传逻辑不动

### 8.3 视频下载到相册

```
点击「下载」
      ↓
Capacitor Filesystem 下载到临时目录
      ↓
@capacitor-community/media 保存到系统相册
      ↓
Haptic 震动反馈 + Toast「已保存到相册」
```

- 权限：iOS 14+ 仅需「照片库写入」权限

### 插件清单

| 功能 | 插件 | 类型 |
|---|---|---|
| 推送通知 | `@capacitor/push-notifications` | 官方 |
| 相机/相册 | `@capacitor/camera` | 官方 |
| 文件系统 | `@capacitor/filesystem` | 官方 |
| 保存到相册 | `@capacitor-community/media` | 社区 |
| 键盘处理 | `@capacitor/keyboard` | 官方 |
| 震动反馈 | `@capacitor/haptics` | 官方 |
| IAP | RevenueCat SDK | 第三方 |

---

## 9. 项目结构

```
vidfab/
├── app/                        # 现有 Next.js（改动极小）
├── components/
│   └── app/                    # 新增：App 专属组件
│       ├── bottom-nav.tsx      # 底部导航
│       └── app-shell.tsx       # App 环境外壳
├── lib/
│   └── hooks/
│       └── use-app-env.ts      # 新增：环境检测 hook
├── mobile/                     # 新增：Capacitor 项目
│   ├── ios/                    # Xcode 项目
│   ├── capacitor.config.ts
│   └── package.json
├── scripts/
│   ├── start.sh                # 现有
│   └── mobile-build.sh         # 新增：构建同步脚本
└── public/
    └── .well-known/
        └── apple-app-site-association  # 新增：Universal Links
```

---

## 10. App Store 上架分工

### 你负责（Apple Developer 侧）
- [ ] 注册/激活 Apple Developer Program（$99/年）
- [ ] App Store Connect 创建 App（Bundle ID: `ai.vidfab.app`）
- [ ] 创建 IAP 产品（订阅 + 积分包）
- [ ] 填写 App 描述、关键词、隐私政策链接
- [ ] 准备 App Store 截图（iPhone 6.7" 必须）
- [ ] 银行账户 + 税务信息绑定

### 我负责（技术侧）
- [ ] Capacitor 项目初始化 + 配置
- [ ] 所有原生插件集成
- [ ] App 环境检测 + 底部三 Tab 导航
- [ ] Safe Area / 键盘等移动端适配
- [ ] Universal Links + AASA 文件部署
- [ ] IAP + RevenueCat 接入
- [ ] 推送通知 end-to-end 打通
- [ ] 相机上传适配
- [ ] 视频下载到相册
- [ ] `mobile-build.sh` 脚本
- [ ] 真机测试 + Bug 修复
- [ ] 提交审核包（IPA）

### 审核注意事项

| 常见拒绝原因 | 应对措施 |
|---|---|
| 纯 WebView 套壳（Guideline 4.2） | 确保推送、相机、下载三个原生功能在截图和描述中突出展示，审核员会实测 |
| IAP 合规问题 | App 内不出现 Stripe / 外部支付链接；定价页需做 App 专用版本（见第 13 节）|
| 隐私权限说明不清 | Info.plist 每个权限写明具体用途（中英文） |
| 崩溃 / 性能 | 提审前在真机全流程测试，不只用模拟器 |

### 必须提交测试账号
苹果审核员无法创建账号测试付费功能。提审时必须在备注中提供：
- 测试账号邮箱 + 密码（有足够积分可完成生成）
- 沙盒 IAP 测试账号（在 App Store Connect 创建）
- 每个原生功能的测试步骤说明

---

## 11. 实施时间线

```
Week 1   Capacitor 初始化 + 插件集成 + 环境检测 + UI 适配
Week 2   Auth 深链接 + 推送通知 + 相机上传 + 视频下载
Week 3   IAP + RevenueCat + 全流程测试
Week 4   真机测试 + Bug 修复 + 提交审核
审核期   1～3 天（等苹果）
```

---

## 12. 关键技术风险与应对

### 12.1 Cookie / Session 在 WebView 中的行为

**风险**：NextAuth 的 `SameSite=Lax` Cookie 在 iOS WebView 某些模式下不会正确传递，导致用户登录后刷新变成未登录。模拟器测试正常，真机可能复现。

**应对**：
- Capacitor `capacitor.config.ts` 的 `server.hostname` 必须与 `NEXTAUTH_URL` 对齐
- 部署后第一优先级真机验证 Session 持久化
- 如有问题，切换 NextAuth Session 策略为 JWT 模式（无需 Cookie 依赖）

### 12.2 CSP 与 Capacitor Bridge 冲突

**风险**：若线上站点配置了严格 CSP，WebView 注入的 Capacitor Bridge JS 会被静默阻断，导致 `window.Capacitor` 为 undefined，所有原生功能失效但无任何报错。

**应对**：
- 开发阶段优先检查当前 `next.config.mjs` 和 Response Headers 中的 CSP 配置
- 为 App 环境的请求头单独放行 Capacitor 内联脚本（通过 `capacitor://localhost` origin 判断）

### 12.3 后台轮询与推送通知协调

**风险**：用户提交生成后切到后台，`useUnifiedPolling` 暂停；回到前台时状态可能丢失，用户不知道是否完成。

**应对**：
- 监听 Capacitor `App.appStateChange` 事件，App 回到前台时主动触发一次历史列表刷新
- 推送通知点击后，通过 Deep Link 直接跳转到历史 Tab 并高亮最新结果
- 两套机制互补，不依赖单一通道

### 12.4 RevenueCat Webhook 幂等性

**风险**：Webhook 可能重复推送，导致积分被多次充值；苹果退款事件未处理导致财务漏洞。

**应对**：
- Webhook 处理接口以 `transaction_id` 为幂等键，写入前检查是否已处理
- 监听 RevenueCat `REFUND` 事件，触发积分扣除逻辑
- 本地调试 Webhook 使用 ngrok 暴露本地端口

### 12.5 定价页 IAP 合规

**风险**：现有 `/pricing` 页面包含 Stripe 按钮和外部支付引导，直接在 App 内展示会违反 App Store 规定。

**应对**：
- 新建 App 专用定价页组件，只展示套餐信息和 IAP 购买按钮
- `useAppEnv` 判断环境，App 内渲染 IAP 版，Web 渲染 Stripe 版
- 两套 UI 共享同一套套餐数据配置

### 12.6 Magic Link 深链接

**注意**：Magic Link 邮件中的链接指向 `https://vidfab.ai/api/auth/callback/email?token=xxx`，用户点击后默认在 Safari 打开而非 App。需要 Universal Links 覆盖此路径，复杂度与 Google OAuth 相当，不可低估。

---

## 13. 实施时间线（修订版）

```
Week 1   Capacitor 初始化 + 插件集成 + 环境检测 + UI 适配 + Cookie/CSP 验证
Week 2   Auth 深链接（Google + Magic Link）+ 推送通知 + 相机上传 + 视频下载
Week 3   IAP + RevenueCat 接入 + 沙盒测试（IAP 调试复杂，单独留足时间）
Week 4   Webhook 幂等性 + 后台轮询协调 + App 专用定价页
Week 5   真机全流程测试 + Bug 修复 + 提审材料准备（截图、测试账号、描述文案）
提交审核   等苹果 1～3 天
```

> IAP 沙盒环境调试已知耗时，Week 3 不与其他功能并行。

---

## 14. 未来规划（v2+）

- Android 版（Bundle ID + Google Play 上架）
- 推送通知精细化（生成进度、积分不足提醒）
- 原生分享菜单（直接分享到社交平台）
- 如移动端体验成为核心竞争力，评估 React Native 重写 UI 层
