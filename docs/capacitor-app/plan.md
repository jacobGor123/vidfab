# VidFab iOS App 实施计划（Capacitor 方案）

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 vidfab.ai 网站以 Capacitor Remote URL 方式打包为 iOS App，覆盖核心生成功能、账号体系和 IAP 支付，上架 App Store。

**Architecture:** Capacitor Native Shell 加载线上 `https://vidfab.ai`，通过原生 Bridge 注入插件能力（推送、相机、IAP 等）。Web 端通过 `useAppEnv` hook 检测运行环境，切换底部导航 UI 并隐藏 Web 专属元素。IAP 通过 RevenueCat 双轨接入 StoreKit（App）和 Stripe（Web）。

**Tech Stack:** Capacitor 6, @capacitor/* 官方插件, RevenueCat SDK, Firebase Cloud Messaging, Next.js 14 App Router, Supabase

---

## Chunk 1：Capacitor 基础搭建

### Task 1：创建 mobile/ 目录结构

**Files:**
- Create: `mobile/package.json`
- Create: `mobile/capacitor.config.ts`
- Create: `scripts/mobile-build.sh`

- [ ] **Step 1：初始化 mobile/package.json**

```json
{
  "name": "vidfab-mobile",
  "version": "1.0.0",
  "description": "VidFab iOS App - Capacitor wrapper",
  "dependencies": {
    "@capacitor/core": "^6.0.0",
    "@capacitor/ios": "^6.0.0",
    "@capacitor/app": "^6.0.0",
    "@capacitor/camera": "^6.0.0",
    "@capacitor/filesystem": "^6.0.0",
    "@capacitor/haptics": "^6.0.0",
    "@capacitor/keyboard": "^6.0.0",
    "@capacitor/push-notifications": "^6.0.0",
    "@capacitor/status-bar": "^6.0.0",
    "@capacitor-community/media": "^6.0.0",
    "purchases-capacitor": "^8.0.0"
  },
  "devDependencies": {
    "@capacitor/cli": "^6.0.0"
  }
}
```

- [ ] **Step 2：创建 mobile/capacitor.config.ts**

```typescript
import { CapacitorConfig } from '@capacitor/cli'

const isProd = process.env.NODE_ENV === 'production'

const config: CapacitorConfig = {
  appId: 'ai.vidfab.app',
  appName: 'VidFab',
  webDir: '../out',
  server: {
    // 生产环境：加载线上站点（Remote URL 模式）
    // 开发环境：加载本地 Next.js dev server
    url: isProd ? 'https://vidfab.ai' : 'http://localhost:3000',
    cleartext: !isProd,
    allowNavigation: ['vidfab.ai', 'accounts.google.com'],
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#0a0a0a',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0a0a0a',
    },
    App: {
      universalLinks: ['https://vidfab.ai'],
    },
  },
}

export default config
```

- [ ] **Step 3：创建 scripts/mobile-build.sh**

```bash
#!/bin/bash
set -e

echo "📱 VidFab Mobile Build"
echo "====================="

MOBILE_DIR="$(dirname "$0")/../mobile"

# 安装 mobile 依赖
echo "→ Installing mobile dependencies..."
cd "$MOBILE_DIR"
npm install

# 同步到 Xcode 项目
echo "→ Syncing Capacitor to iOS..."
npx cap sync ios

echo "✅ Done. Open Xcode with: npx cap open ios"
```

```bash
chmod +x scripts/mobile-build.sh
```

- [ ] **Step 4：在 mobile/ 目录初始化 Capacitor iOS 项目**

```bash
cd mobile
npm install
npx cap add ios
```

预期输出：`✔ Adding native ios project in ios in 1.23s`

- [ ] **Step 5：验证目录结构**

```bash
ls mobile/ios/App/
```

预期存在 `App/` 和 `App.xcworkspace`

- [ ] **Step 6：Commit**

```bash
git add mobile/ scripts/mobile-build.sh
git commit -m "feat(mobile): init Capacitor iOS project structure"
```

---

### Task 2：环境检测 Hook

**Files:**
- Create: `lib/hooks/use-app-env.ts`

**说明：** 这是整个 App 适配层的唯一入口。所有判断 App/Web 环境的地方，必须通过此 hook，禁止在其他地方直接访问 `window.Capacitor`。

- [ ] **Step 1：创建 lib/hooks/use-app-env.ts**

```typescript
'use client'

import { useEffect, useState } from 'react'

interface AppEnv {
  isApp: boolean
  isWeb: boolean
  isReady: boolean
  platform: 'ios' | 'android' | 'web'
}

export function useAppEnv(): AppEnv {
  const [env, setEnv] = useState<AppEnv>({
    isApp: false,
    isWeb: true,
    isReady: false,
    platform: 'web',
  })

  useEffect(() => {
    const cap = (window as any).Capacitor
    const isNative = cap?.isNativePlatform?.() ?? false
    const platform = cap?.getPlatform?.() ?? 'web'

    setEnv({
      isApp: isNative,
      isWeb: !isNative,
      isReady: true,
      platform: isNative ? platform : 'web',
    })
  }, [])

  return env
}
```

- [ ] **Step 2：验证 hook 在测试中可用**

创建 `hooks/__tests__/use-app-env.test.ts`：

```typescript
import { renderHook } from '@testing-library/react'
import { useAppEnv } from '@/lib/hooks/use-app-env'

describe('useAppEnv', () => {
  it('returns web env when Capacitor is not available', () => {
    const { result } = renderHook(() => useAppEnv())
    expect(result.current.isWeb).toBe(true)
    expect(result.current.isApp).toBe(false)
    expect(result.current.platform).toBe('web')
  })
})
```

- [ ] **Step 3：Commit**

```bash
git add lib/hooks/use-app-env.ts hooks/__tests__/use-app-env.test.ts
git commit -m "feat(mobile): add useAppEnv hook for environment detection"
```

---

## Chunk 2：Mobile UI 层

### Task 3：Safe Area CSS + 全局适配

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1：在 globals.css 末尾追加 Safe Area 变量和 App 专用样式**

```css
/* ============================================
   App Environment (Capacitor) Adaptations
   ============================================ */

/* Safe Area CSS 变量（Capacitor 自动注入） */
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
}

/* App 环境：全局容器适配 */
body.app-env {
  padding-top: var(--safe-area-top);
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
}

/* App 环境：禁止非文本区域长按弹菜单 */
body.app-env *:not(input):not(textarea):not([contenteditable]) {
  -webkit-user-select: none;
  user-select: none;
}

body.app-env input,
body.app-env textarea,
body.app-env [contenteditable] {
  -webkit-user-select: text;
  user-select: text;
}

/* 底部导航占位，防止内容被遮挡 */
body.app-env .app-content {
  padding-bottom: calc(64px + var(--safe-area-bottom));
}
```

- [ ] **Step 2：在根 layout.tsx 中，客户端检测后给 body 加 app-env class**

创建 `components/app/app-env-init.tsx`：

```tsx
'use client'

import { useEffect } from 'react'

export function AppEnvInit() {
  useEffect(() => {
    const cap = (window as any).Capacitor
    if (cap?.isNativePlatform?.()) {
      document.body.classList.add('app-env')
    }
  }, [])

  return null
}
```

- [ ] **Step 3：在 app/layout.tsx 中引入 AppEnvInit**

找到 `app/layout.tsx` 中 `<body>` 标签内的 providers 区域，添加：

```tsx
import { AppEnvInit } from '@/components/app/app-env-init'

// 在 <body> 内最早的位置添加：
<AppEnvInit />
```

- [ ] **Step 4：Commit**

```bash
git add app/globals.css components/app/app-env-init.tsx app/layout.tsx
git commit -m "feat(mobile): add safe area CSS and app-env body class init"
```

---

### Task 4：底部三 Tab 导航组件

**Files:**
- Create: `components/app/bottom-nav.tsx`

- [ ] **Step 1：创建底部导航组件**

```tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Zap, FolderOpen, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  {
    id: 'generate',
    label: 'Create',
    icon: Zap,
    href: '/app/generate',
  },
  {
    id: 'history',
    label: 'History',
    icon: FolderOpen,
    href: '/app/history',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    href: '/app/profile',
  },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const activeTab = TABS.find(tab => pathname.startsWith(tab.href))?.id ?? 'generate'

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border"
      style={{ paddingBottom: 'var(--safe-area-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {TABS.map(({ id, label, icon: Icon, href }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => router.push(href)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-[44px]',
                'transition-colors duration-150',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label={label}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2：Commit**

```bash
git add components/app/bottom-nav.tsx
git commit -m "feat(mobile): add bottom tab navigation component"
```

---

### Task 5：App 专属路由结构

**Files:**
- Create: `app/app/layout.tsx`
- Create: `app/app/generate/page.tsx`
- Create: `app/app/history/page.tsx`
- Create: `app/app/profile/page.tsx`

**说明：** App 内的页面放在 `/app/` 路由前缀下，与现有 `(main)` 路由完全隔离，复用现有功能组件。

- [ ] **Step 1：创建 app/app/layout.tsx（App Shell）**

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/app/bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    // 非 App 环境（Web 浏览器直接访问）重定向到首页
    // 防止 Google 爬虫索引 /app/* 路由，也防止 Web 用户进入不完整界面
    const cap = (window as any).Capacitor
    if (!cap?.isNativePlatform?.()) {
      router.replace('/')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-background">
      <main className="app-content">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 2：创建生成页 app/app/generate/page.tsx**

复用现有工具组件，顶部 Tab 切换五个工具：

```tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const TOOLS = [
  { id: 'text-to-video', label: 'T2V' },
  { id: 'image-to-video', label: 'I2V' },
  { id: 'effects', label: 'Effects' },
  { id: 'text-to-image', label: 'T2I' },
  { id: 'image-to-image', label: 'I2I' },
] as const

type ToolId = typeof TOOLS[number]['id']

export default function GeneratePage() {
  const [activeTool, setActiveTool] = useState<ToolId>('text-to-video')

  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具切换 Tab */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-none">
        {TOOLS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTool(id)}
            className={cn(
              'flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
              'border-b-2 -mb-px',
              activeTool === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 工具内容区 - 嵌入现有工具组件 */}
      <div className="flex-1 overflow-y-auto p-4">
        <AppToolContent toolId={activeTool} />
      </div>
    </div>
  )
}

// 按需导入各工具组件（避免全量加载）
function AppToolContent({ toolId }: { toolId: ToolId }) {
  // TODO: Task 6 中接入现有工具组件
  return <div className="text-muted-foreground text-center py-8">Loading {toolId}...</div>
}
```

- [ ] **Step 3：创建历史页 app/app/history/page.tsx**

```tsx
// 复用现有 VideoContext 中的 completedVideos
'use client'

import { useVideo } from '@/lib/contexts/video-context'

export default function HistoryPage() {
  const { completedVideos, loadCompletedVideos } = useVideo()

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-4">History</h1>
      {/* TODO: Task 7 中接入现有历史列表组件 */}
      <p className="text-muted-foreground">
        {completedVideos.length} videos generated
      </p>
    </div>
  )
}
```

- [ ] **Step 4：创建我的页面 app/app/profile/page.tsx**

```tsx
'use client'

import { useSession } from 'next-auth/react'

export default function ProfilePage() {
  const { data: session } = useSession()

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-4">Profile</h1>
      {session?.user ? (
        <div>
          <p>{session.user.email}</p>
          {/* TODO: Task 8 中接入积分、订阅、IAP 购买入口 */}
        </div>
      ) : (
        <p className="text-muted-foreground">Not signed in</p>
      )}
    </div>
  )
}
```

- [ ] **Step 5：Commit**

```bash
git add app/app/
git commit -m "feat(mobile): add app route structure with bottom nav layout"
```

---

### Task 6：Capacitor 入口重定向

**Files:**
- Modify: `mobile/capacitor.config.ts`

**说明：** App 启动时加载 `https://vidfab.ai/app/generate`，而非营销首页。

- [ ] **Step 1：修改 capacitor.config.ts 的 server.url 为 App 专属入口**

```typescript
server: {
  url: isProd ? 'https://vidfab.ai/app/generate' : 'http://localhost:3000/app/generate',
  // ...
}
```

- [ ] **Step 2：同步并在模拟器验证启动落点**

```bash
cd mobile && npx cap sync ios && npx cap open ios
```

- [ ] **Step 3：Commit**

```bash
git add mobile/capacitor.config.ts
git commit -m "feat(mobile): set app entry point to /app/generate"
```

---

## Chunk 3：CSP 审计 + Universal Links

### Task 7：CSP 与 Capacitor Bridge 兼容性审计

**Files:**
- Modify: `next.config.mjs`（如有需要）

- [ ] **Step 1：检查当前 CSP 配置**

查看 `next.config.mjs` 中的 `securityHeaders` 数组，确认是否存在 `Content-Security-Policy` header。

当前项目**未设置 CSP**（只有 `X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options`），Capacitor Bridge 不受阻断。**本 Task 确认后可直接关闭，无需修改。**

若未来添加 CSP，需包含以下配置：
```
script-src 'self' 'unsafe-inline' capacitor:
```

- [ ] **Step 2：验证 WebView 中 window.Capacitor 可访问**

在真机测试阶段（Chunk 8）验证，现在记录为待验证项。

- [ ] **Step 3：Commit（仅文档注释）**

在 `next.config.mjs` 的 `securityHeaders` 附近添加注释：

```javascript
// ⚠️ 如需添加 CSP，必须包含 capacitor: 协议，否则 Capacitor Bridge 会被阻断
// script-src 必须包含 'unsafe-inline' capacitor: 以支持原生 Bridge 注入
```

```bash
git add next.config.mjs
git commit -m "docs(mobile): add CSP compatibility note for Capacitor Bridge"
```

---

### Task 8：NextAuth Session Cookie 验证

**Files:**
- 检查: `auth.ts`
- 可能修改: `auth.ts`

- [ ] **Step 1：检查现有 NextAuth 配置中的 cookie 设置**

查看 `auth.ts`，确认 `session.strategy` 和 cookie 的 `sameSite` 配置。

- [ ] **Step 2：若为 database session 策略，添加 WebView 兼容配置**

```typescript
// auth.ts 中添加
cookies: {
  sessionToken: {
    options: {
      sameSite: 'lax',  // WebView 需要 lax 而非 strict
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    },
  },
},
```

- [ ] **Step 3：Commit**

```bash
git add auth.ts
git commit -m "fix(mobile): ensure NextAuth cookies are WebView compatible"
```

---

### Task 9：AASA 文件（Universal Links）

**Files:**
- Create: `public/.well-known/apple-app-site-association`

**说明：** 告诉苹果 `vidfab.ai` 上的 `/api/auth/callback/*` 路径属于 VidFab App，触发 Universal Link 而非在 Safari 打开。

- [ ] **Step 1：创建 AASA 文件**

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["TEAM_ID.ai.vidfab.app"],
        "components": [
          {
            "/": "/api/auth/callback/*",
            "comment": "OAuth and Magic Link callbacks"
          },
          {
            "/": "/app/*",
            "comment": "App internal routes"
          }
        ]
      }
    ]
  },
  "webcredentials": {
    "apps": ["TEAM_ID.ai.vidfab.app"]
  }
}
```

> **注意：** `TEAM_ID` 需替换为 Apple Developer 后台的 Team ID（10位字母数字）

- [ ] **Step 2：确保 AASA 可被无重定向 HTTPS 访问**

确认 `public/.well-known/` 目录不被任何 middleware 或 rewrite 规则拦截。检查 `next.config.mjs` 和 `middleware.ts`，如有拦截则添加排除规则。

- [ ] **Step 3：在 Capacitor iOS 项目中配置 Associated Domains**

在 `mobile/ios/App/App.entitlements` 中添加（Capacitor 生成后手动编辑或通过 Xcode 配置）：

```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:vidfab.ai</string>
  <string>webcredentials:vidfab.ai</string>
</array>
```

- [ ] **Step 4：Commit**

```bash
git add public/.well-known/apple-app-site-association
git commit -m "feat(mobile): add AASA file for Universal Links"
```

---

## Chunk 4：推送通知

### Task 10：Firebase 项目配置

**说明：** 此 Task 需要在 Firebase Console 操作，代码部分在 Task 11。

- [ ] **Step 1：在 Firebase Console 创建项目**
  - 项目名称：`vidfab-app`
  - 添加 iOS App，Bundle ID：`ai.vidfab.app`
  - 下载 `GoogleService-Info.plist`

- [ ] **Step 2：将 GoogleService-Info.plist 放入 Xcode 项目**
  - 路径：`mobile/ios/App/App/GoogleService-Info.plist`
  - 在 Xcode 中确认文件已被引用（非仅复制）

- [ ] **Step 3：在 Apple Developer 后台生成 APNs 密钥**
  - Certificates, Identifiers & Profiles → Keys → 添加 APNs Key
  - 下载 `.p8` 文件，上传到 Firebase Console → Project Settings → Cloud Messaging

---

### Task 11：推送通知服务

**Files:**
- Create: `lib/services/push-notification-service.ts`
- Create: `app/api/device/register/route.ts`
- Create: `sql/migrations/add_user_devices.sql`
- Modify: `worker/queue-worker.ts`

- [ ] **Step 1：创建数据库 migration**

```sql
-- sql/migrations/add_user_devices.sql
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_token)
);

CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
```

在 Supabase Dashboard 执行此 SQL。

- [ ] **Step 2：创建设备注册 API**

```typescript
// app/api/device/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.uuid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { token, platform } = await req.json()
  if (!token || !platform) {
    return NextResponse.json({ error: 'Missing token or platform' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('user_devices')
    .upsert(
      { user_id: session.user.uuid, device_token: token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,device_token' }
    )

  if (error) {
    return NextResponse.json({ error: 'Failed to register device' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3：创建推送通知服务（服务端）**

```typescript
// lib/services/push-notification-service.ts
// 使用 FCM v1 HTTP API（Legacy API 已于 2024 年关闭）
// 需要 Service Account 认证，使用 google-auth-library 获取 Access Token

import { supabaseAdmin } from '@/lib/supabase'

interface PushPayload {
  title: string
  body: string
  data?: Record<string, string>
}

async function getFcmAccessToken(): Promise<string> {
  // Service Account JSON 存于环境变量 FCM_SERVICE_ACCOUNT_JSON
  const serviceAccount = JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON!)
  const { GoogleAuth } = await import('google-auth-library')
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  })
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  return token.token!
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const projectId = process.env.FCM_PROJECT_ID
  if (!projectId) return

  const { data: devices } = await supabaseAdmin
    .from('user_devices')
    .select('device_token')
    .eq('user_id', userId)

  if (!devices?.length) return

  const accessToken = await getFcmAccessToken()

  // FCM v1 API：每次只能发单个 token，批量需多次请求
  await Promise.allSettled(
    devices.map(({ device_token }) =>
      fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: device_token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data ?? {},
            apns: {
              payload: { aps: { sound: 'default' } },
            },
          },
        }),
      })
    )
  )
}
```

- [ ] **Step 4：在 worker 任务完成时触发推送**

在 `worker/queue-worker.ts` 的视频生成完成回调中添加：

```typescript
import { sendPushToUser } from '@/lib/services/push-notification-service'

// 在任务成功完成后：
await sendPushToUser(job.data.userId, {
  title: 'Your video is ready! 🎉',
  body: 'Tap to view your generated video.',
  data: { type: 'video_complete', videoId: result.videoId },
})
```

- [ ] **Step 5：创建客户端推送初始化 hook**

```typescript
// lib/hooks/use-push-notifications.ts
'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useAppEnv } from './use-app-env'

export function usePushNotifications() {
  const { isApp, platform } = useAppEnv()
  const { data: session } = useSession()

  useEffect(() => {
    if (!isApp || !session?.user) return

    async function initPush() {
      const { PushNotifications } = await import('@capacitor/push-notifications')

      const permission = await PushNotifications.requestPermissions()
      if (permission.receive !== 'granted') return

      await PushNotifications.register()

      PushNotifications.addListener('registration', async ({ value: token }) => {
        await fetch('/api/device/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, platform }),  // platform 来自 useAppEnv().platform
        })
      })
    }

    initPush()
  }, [isApp, session])
}
```

- [ ] **Step 6：在根 layout 或 App Shell 中调用此 hook**

- [ ] **Step 7：Commit**

```bash
git add lib/services/push-notification-service.ts \
        app/api/device/register/route.ts \
        sql/migrations/add_user_devices.sql \
        lib/hooks/use-push-notifications.ts \
        worker/queue-worker.ts
git commit -m "feat(mobile): implement push notifications end-to-end"
```

---

## Chunk 5：相机上传 + 视频下载

### Task 12：原生相机上传适配

**Files:**
- Create: `lib/hooks/use-native-image-picker.ts`

**说明：** 仅新增一个 hook，现有上传组件只在入口处切换选图方式，上传逻辑本身不改动。

- [ ] **Step 1：创建 use-native-image-picker.ts**

```typescript
// lib/hooks/use-native-image-picker.ts
'use client'

import { useAppEnv } from './use-app-env'

interface PickedImage {
  dataUrl: string
  format: string
}

export function useNativeImagePicker() {
  const { isApp } = useAppEnv()

  async function pickImage(): Promise<PickedImage | null> {
    if (!isApp) return null  // Web 环境：调用方使用原有 <input type="file">

    const { Camera, CameraSource, CameraResultType } = await import('@capacitor/camera')

    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,  // 弹出选择：拍照 or 相册
      promptLabelHeader: 'Select Image',
      promptLabelPhoto: 'Choose from Gallery',
      promptLabelPicture: 'Take Photo',
    })

    if (!image.dataUrl) return null
    return { dataUrl: image.dataUrl, format: image.format }
  }

  return { pickImage, isNative: isApp }
}
```

- [ ] **Step 2：在需要图片上传的组件中使用此 hook**

找到图片上传入口组件（如 Image-to-Video 的上传区域），在点击上传按钮时：

```typescript
const { pickImage, isNative } = useNativeImagePicker()

// 点击处理
async function handlePickImage() {
  if (isNative) {
    const image = await pickImage()
    if (image) {
      // 将 dataUrl 转为 File 对象，传给现有上传逻辑
      const res = await fetch(image.dataUrl)
      const blob = await res.blob()
      const file = new File([blob], `photo.${image.format}`, { type: blob.type })
      handleFileUpload(file)  // 现有上传函数
    }
  }
  // else: 触发原有 <input type="file"> 的点击
}
```

- [ ] **Step 3：Commit**

```bash
git add lib/hooks/use-native-image-picker.ts
git commit -m "feat(mobile): add native image picker hook for camera/gallery"
```

---

### Task 13：视频下载到系统相册

**Files:**
- Create: `lib/hooks/use-video-download.ts`

- [ ] **Step 1：创建 use-video-download.ts**

```typescript
// lib/hooks/use-video-download.ts
'use client'

import { useAppEnv } from './use-app-env'

export function useVideoDownload() {
  const { isApp } = useAppEnv()

  async function downloadVideo(videoUrl: string, filename: string): Promise<void> {
    if (!isApp) {
      // Web 环境：使用原有 <a download> 方式
      const a = document.createElement('a')
      a.href = videoUrl
      a.download = filename
      a.click()
      return
    }

    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')

    try {
      // 下载到临时目录
      const downloaded = await Filesystem.downloadFile({
        url: videoUrl,
        path: filename,
        directory: Directory.Cache,
      })

      // 保存到系统相册
      const { Media } = await import('@capacitor-community/media')
      await Media.saveVideo({ path: downloaded.path! })

      // 震动反馈
      await Haptics.impact({ style: ImpactStyle.Medium })

      // 通知（由调用方处理 toast，此处只抛成功信号）
    } catch (err) {
      console.error('Video download failed:', err)
      throw err
    }
  }

  return { downloadVideo }
}
```

- [ ] **Step 2：在视频历史列表的下载按钮处使用此 hook**

- [ ] **Step 3：Commit**

```bash
git add lib/hooks/use-video-download.ts
git commit -m "feat(mobile): add native video download to photo library"
```

---

## Chunk 6：IAP + RevenueCat

### Task 14：RevenueCat 客户端集成

**Files:**
- Create: `lib/services/iap-service.ts`
- Create: `lib/hooks/use-iap.ts`

**前置条件：**
- App Store Connect 已创建 IAP 产品（见设计文档第 5 节产品映射）
- RevenueCat 后台已配置 App + 产品 + Entitlement

- [ ] **Step 1：创建 iap-service.ts**

```typescript
// lib/services/iap-service.ts
// 注意：不加 'use client'，通过动态 import 在客户端按需加载 Capacitor SDK

// RevenueCat Product ID → 显示名称映射
export const IAP_PRODUCTS = {
  'ai.vidfab.starter.monthly': { name: 'Starter', credits: 0, type: 'subscription' },
  'ai.vidfab.pro.monthly': { name: 'Pro', credits: 0, type: 'subscription' },
  'ai.vidfab.credits.100': { name: '100 Credits', credits: 100, type: 'consumable' },
  'ai.vidfab.credits.500': { name: '500 Credits', credits: 500, type: 'consumable' },
} as const

export type IAPProductId = keyof typeof IAP_PRODUCTS

export async function initRevenueCat(userId: string): Promise<void> {
  const { Purchases } = await import('purchases-capacitor')
  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY_IOS!

  await Purchases.configure({ apiKey })
  await Purchases.logIn({ appUserID: userId })
}

export async function getOfferings() {
  const { Purchases } = await import('purchases-capacitor')
  const result = await Purchases.getOfferings()
  return result.offerings.current
}

export async function purchasePackage(packageIdentifier: string) {
  const { Purchases } = await import('purchases-capacitor')
  const offerings = await getOfferings()
  const pkg = offerings?.availablePackages.find(p => p.identifier === packageIdentifier)
  if (!pkg) throw new Error(`Package ${packageIdentifier} not found`)

  return await Purchases.purchasePackage({ aPackage: pkg })
}
```

- [ ] **Step 2：创建 use-iap.ts hook**

```typescript
// lib/hooks/use-iap.ts
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useAppEnv } from './use-app-env'
import { initRevenueCat, getOfferings, purchasePackage } from '@/lib/services/iap-service'

export function useIAP() {
  const { isApp } = useAppEnv()
  const { data: session, update } = useSession()
  const [offerings, setOfferings] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isApp || !session?.user?.uuid) return
    initRevenueCat(session.user.uuid).then(() => {
      getOfferings().then(setOfferings)
    })
  }, [isApp, session?.user?.id])

  async function purchase(packageIdentifier: string) {
    setLoading(true)
    try {
      await purchasePackage(packageIdentifier)
      // 购买成功后局部刷新 Session（Webhook 已更新积分），避免全量刷新丢失页面状态
      await update()  // next-auth 的 useSession().update()
    } finally {
      setLoading(false)
    }
  }

  return { offerings, loading, purchase }
}
```

- [ ] **Step 3：Commit**

```bash
git add lib/services/iap-service.ts lib/hooks/use-iap.ts
git commit -m "feat(mobile): add RevenueCat IAP service and hook"
```

---

### Task 15：RevenueCat Webhook（服务端）

**Files:**
- Create: `app/api/webhooks/revenuecat/route.ts`

**说明：** 处理 IAP 购买完成事件，幂等性以 `transaction_id` 为键，防止重复充值。同时处理退款事件。

- [ ] **Step 1：在 Supabase 创建 iap_transactions 表**

```sql
CREATE TABLE IF NOT EXISTS iap_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  product_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  amount_credits INTEGER DEFAULT 0,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_iap_transactions_transaction_id ON iap_transactions(transaction_id);
CREATE INDEX idx_iap_transactions_user_id ON iap_transactions(user_id);
```

- [ ] **Step 2：创建 Webhook 处理路由**

```typescript
// app/api/webhooks/revenuecat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const CREDITS_MAP: Record<string, number> = {
  'ai.vidfab.credits.100': 100,
  'ai.vidfab.credits.500': 500,
}

export async function POST(req: NextRequest) {
  // 验证 RevenueCat Webhook 签名
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { event } = body
  const transactionId: string = event.transaction_id
  const productId: string = event.product_id
  const appUserId: string = event.app_user_id  // 即 Supabase user UUID
  const eventType: string = event.type

  if (!transactionId || !appUserId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // 幂等性检查
  const { data: existing } = await supabaseAdmin
    .from('iap_transactions')
    .select('id')
    .eq('transaction_id', transactionId)
    .single()

  if (existing) {
    return NextResponse.json({ status: 'already_processed' })
  }

  // 根据事件类型处理
  if (eventType === 'INITIAL_PURCHASE' || eventType === 'NON_CONSUMABLE_PURCHASE') {
    const creditsToAdd = CREDITS_MAP[productId] ?? 0

    if (creditsToAdd > 0) {
      // 使用现有 RPC 函数增加积分（与 credits-manager.ts 中 addBonusCredits 相同方式）
      await supabaseAdmin.rpc('update_user_credits_balance', {
        p_user_uuid: appUserId,
        p_credits_change: creditsToAdd,
        p_transaction_type: 'bonus',
        p_description: `IAP purchase: ${productId}`,
        p_metadata: { source: 'iap', product_id: productId, transaction_id: transactionId },
      })
    }

    // 记录事务（幂等锁）
    await supabaseAdmin.from('iap_transactions').insert({
      transaction_id: transactionId,
      user_id: appUserId,
      product_id: productId,
      event_type: eventType,
      amount_credits: creditsToAdd,
    })
  }

  if (eventType === 'REFUND') {
    const creditsToDeduct = CREDITS_MAP[productId] ?? 0

    if (creditsToDeduct > 0) {
      await supabaseAdmin.rpc('update_user_credits_balance', {
        p_user_uuid: appUserId,
        p_credits_change: -creditsToDeduct,
        p_transaction_type: 'refunded',
        p_description: `IAP refund: ${productId}`,
        p_metadata: { source: 'iap_refund', product_id: productId, transaction_id: transactionId },
      })
    }

    await supabaseAdmin.from('iap_transactions').insert({
      transaction_id: transactionId,
      user_id: appUserId,
      product_id: productId,
      event_type: 'REFUND',
      amount_credits: -creditsToDeduct,
    })
  }

  return NextResponse.json({ status: 'ok' })
}
```

- [ ] **Step 3：在 RevenueCat 后台配置 Webhook URL**
  - URL：`https://vidfab.ai/api/webhooks/revenuecat`
  - Authorization Header：`Bearer <REVENUECAT_WEBHOOK_SECRET>`
  - 将 `REVENUECAT_WEBHOOK_SECRET` 加入 Railway / Vercel 环境变量

- [ ] **Step 4：Commit**

```bash
git add app/api/webhooks/revenuecat/route.ts
git commit -m "feat(mobile): add RevenueCat webhook with idempotency and refund handling"
```

---

### Task 16：App 专用定价页

**Files:**
- Create: `components/app/app-pricing.tsx`
- Modify: `app/(main)/pricing/pricing-client.tsx`

**说明：** 现有定价页含 Stripe 购买按钮，不可在 App 内直接展示。新建 App 专用版本，只展示套餐信息 + IAP 购买按钮。

- [ ] **Step 1：创建 components/app/app-pricing.tsx**

```tsx
'use client'

import { useIAP } from '@/lib/hooks/use-iap'

const PLANS = [
  {
    name: 'Starter',
    price: '$12.99/mo',
    packageId: 'starter_monthly',
    features: ['100 credits/mo', 'HD quality', 'Email support'],
  },
  {
    name: 'Pro',
    price: '$24.99/mo',
    packageId: 'pro_monthly',
    features: ['500 credits/mo', '4K quality', 'Priority support'],
  },
]

const CREDIT_PACKS = [
  { name: '100 Credits', price: '$4.99', packageId: 'credits_100' },
  { name: '500 Credits', price: '$18.99', packageId: 'credits_500' },
]

export function AppPricing() {
  const { purchase, loading } = useIAP()

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold">Plans</h2>

      <div className="space-y-3">
        {PLANS.map(plan => (
          <div key={plan.name} className="border border-border rounded-xl p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.price}</p>
              </div>
              <button
                onClick={() => purchase(plan.packageId)}
                disabled={loading}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
              >
                Subscribe
              </button>
            </div>
            <ul className="space-y-1">
              {plan.features.map(f => (
                <li key={f} className="text-sm text-muted-foreground">• {f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold">Credit Packs</h2>
      <div className="space-y-3">
        {CREDIT_PACKS.map(pack => (
          <div key={pack.name} className="flex justify-between items-center border border-border rounded-xl p-4">
            <div>
              <h3 className="font-semibold">{pack.name}</h3>
              <p className="text-sm text-muted-foreground">{pack.price}</p>
            </div>
            <button
              onClick={() => purchase(pack.packageId)}
              disabled={loading}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
            >
              Buy
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2：在 Profile Tab 中引入 AppPricing**

在 `app/app/profile/page.tsx` 中添加：

```tsx
import { AppPricing } from '@/components/app/app-pricing'
// 在账号信息下方渲染 <AppPricing />
```

- [ ] **Step 3：Commit**

```bash
git add components/app/app-pricing.tsx app/app/profile/page.tsx
git commit -m "feat(mobile): add IAP-only pricing page for App environment"
```

---

## Chunk 7：后台状态协调 + App State

### Task 17：App 前后台状态管理

**Files:**
- Create: `lib/hooks/use-app-state.ts`
- Modify: `hooks/use-unified-polling.ts`

**说明：** App 回到前台时主动刷新历史，解决后台轮询暂停导致状态丢失问题。

- [ ] **Step 1：创建 use-app-state.ts**

```typescript
// lib/hooks/use-app-state.ts
'use client'

import { useEffect, useRef } from 'react'
import { useAppEnv } from './use-app-env'

type AppStateHandler = (isActive: boolean) => void

export function useAppState(onStateChange: AppStateHandler) {
  const { isApp } = useAppEnv()
  // 用 ref 稳定 handler 引用，防止 useEffect 因每次渲染新函数导致无限重注册
  const handlerRef = useRef(onStateChange)
  handlerRef.current = onStateChange

  useEffect(() => {
    if (!isApp) return

    let listener: any

    async function setup() {
      const { App } = await import('@capacitor/app')
      listener = await App.addListener('appStateChange', ({ isActive }) => {
        handlerRef.current(isActive)
      })
    }

    setup()
    return () => { listener?.remove() }
  }, [isApp])  // 不依赖 onStateChange，通过 ref 访问最新值
}
```

- [ ] **Step 2：在历史页使用此 hook，App 回到前台时刷新列表**

在 `app/app/history/page.tsx` 中：

```typescript
import { useAppState } from '@/lib/hooks/use-app-state'
import { useVideo } from '@/lib/contexts/video-context'

const { loadCompletedVideos } = useVideo()

useAppState((isActive) => {
  if (isActive) {
    loadCompletedVideos()
  }
})
```

- [ ] **Step 3：处理推送通知点击 → 跳转历史页**

在推送通知初始化 hook (`use-push-notifications.ts`) 中添加：

```typescript
PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
  const type = notification.notification.data?.type
  if (type === 'video_complete') {
    router.push('/app/history')
  }
})
```

- [ ] **Step 4：Commit**

```bash
git add lib/hooks/use-app-state.ts \
        app/app/history/page.tsx \
        lib/hooks/use-push-notifications.ts
git commit -m "feat(mobile): handle app foreground resume and push notification tap"
```

---

## Chunk 8：QA + 提审准备

### Task 18：真机测试清单

**说明：** 本 Task 为手动测试清单，全部通过后方可进入提审流程。

**核心功能测试：**
- [ ] App 冷启动 → 正确落在生成页
- [ ] 五个工具 Tab 切换正常
- [ ] Text-to-Video 完整生成流程（输入 → 提交 → 轮询 → 结果显示）
- [ ] Image-to-Video 原生相机/相册上传 → 生成成功
- [ ] 历史页显示所有历史记录
- [ ] 视频下载 → 系统相册中可见

**账号体系测试：**
- [ ] 未登录 → 参数可调整 → 点击生成 → 弹出登录弹窗
- [ ] Google OAuth 登录 → Universal Link 正确跳回 App → Session 持久化
- [ ] Email 登录 → 正常
- [ ] Magic Link 登录 → 邮件点击 → 正确跳回 App
- [ ] 退出登录 → 重新登录

**推送通知测试：**
- [ ] 首次进入 → 弹出推送权限请求
- [ ] 生成任务完成 → 收到推送
- [ ] 点击推送 → 跳转历史页

**IAP 测试（沙盒环境）：**
- [ ] 打开定价页 → 正确显示 IAP 价格（非 Stripe 价格）
- [ ] 沙盒账号购买积分包 → 积分正确增加
- [ ] 沙盒账号订阅 → 状态正确
- [ ] RevenueCat 后台可看到测试购买记录

**安全测试：**
- [ ] App 内无任何 Stripe 相关文字或链接
- [ ] App 内无跳转到 vidfab.ai 购买页的入口

---

### Task 19：App Store 提审材料准备

- [ ] **Step 1：截图准备（必需：iPhone 6.7"）**

需要的截图场景：
1. 生成页（工具选择界面）
2. 生成中状态（进度展示）
3. 历史页（视频列表）
4. 推送通知示例（可在描述中放置，无需截图）
5. 我的页面（积分余额）

- [ ] **Step 2：App Store Connect 填写**

| 字段 | 内容 |
|---|---|
| App Name | VidFab - AI Video Generator |
| Subtitle | Create Videos with AI |
| Category | Photo & Video |
| Privacy Policy URL | https://vidfab.ai/privacy |
| Support URL | https://vidfab.ai/contact |

**关键词（100 字符限制）：**
```
ai video,text to video,image to video,video generator,ai effects,create video
```

- [ ] **Step 3：审核员备注（Review Notes）**

```
Test Account:
Email: [测试账号邮箱]
Password: [密码]

Sandbox IAP Account: [在 App Store Connect 创建的沙盒账号]

Native Features:
1. Push Notifications: Go to Create tab → generate any video →
   when complete, a push notification will be sent
2. Camera: Create tab → I2V tool → tap upload →
   select "Take Photo" or "Choose from Gallery"
3. Video Save: History tab → tap any video →
   tap download button → video saves to Photos app

Note: This app uses Remote URL to load vidfab.ai with native
capabilities injected via Capacitor Bridge.
```

- [ ] **Step 4：构建并上传 IPA**

```bash
# 在 Xcode 中：
# Product → Archive → Distribute App → App Store Connect
```

- [ ] **Step 5：提交审核**

在 App Store Connect 点击「Submit for Review」。

---

### Task 20：环境变量清单

**说明：** 确保所有新增的环境变量已加入生产环境（Railway/Vercel）。

| 变量名 | 说明 | 必需 |
|---|---|---|
| `FCM_PROJECT_ID` | Firebase 项目 ID（FCM v1 API 路径中使用） | ✅ |
| `FCM_SERVICE_ACCOUNT_JSON` | Firebase Service Account 完整 JSON 字符串（FCM v1 认证） | ✅ |
| `REVENUECAT_WEBHOOK_SECRET` | Webhook 签名验证密钥 | ✅ |
| `NEXT_PUBLIC_REVENUECAT_API_KEY_IOS` | RevenueCat iOS 公钥 | ✅ |

> **注意：** FCM v1 API（2024 年后的标准）使用 Service Account 而非 Server Key。在 Firebase Console → Project Settings → Service Accounts 下载 Service Account JSON，序列化为字符串存入环境变量。

- [ ] **Commit 最终 .env.example 更新**

```bash
git add .env.example
git commit -m "docs(mobile): add required env vars for mobile features"
```

---

## 附录：文件结构总览

### 新增文件

```
mobile/
├── capacitor.config.ts
├── package.json
└── ios/                          # Capacitor 生成（不手动编辑）

components/app/
├── app-env-init.tsx              # body.app-env class 初始化
├── app-pricing.tsx               # IAP 专用定价页
└── bottom-nav.tsx                # 底部三 Tab 导航

app/app/
├── layout.tsx                    # App Shell + BottomNav
├── generate/page.tsx             # 生成页（五工具 Tab）
├── history/page.tsx              # 历史页
└── profile/page.tsx              # 我的页（账号 + IAP）

lib/hooks/
├── use-app-env.ts                # 环境检测（唯一入口）
├── use-app-state.ts              # App 前后台状态
├── use-iap.ts                    # IAP 购买 hook
├── use-native-image-picker.ts    # 原生相机/相册
├── use-push-notifications.ts     # 推送通知初始化
└── use-video-download.ts         # 视频下载到相册

lib/services/
├── iap-service.ts                # RevenueCat 封装
└── push-notification-service.ts  # FCM 服务端推送

app/api/
├── device/register/route.ts      # 设备 Token 注册
└── webhooks/revenuecat/route.ts  # IAP Webhook（幂等）

public/.well-known/
└── apple-app-site-association    # Universal Links

scripts/
└── mobile-build.sh               # 构建同步脚本

sql/migrations/
├── add_user_devices.sql          # 设备 Token 表
└── add_iap_transactions.sql      # IAP 事务表（幂等锁）
```

### 修改文件

```
app/globals.css                   # Safe Area CSS + app-env 样式
app/layout.tsx                    # 引入 AppEnvInit
auth.ts                           # Cookie SameSite 配置
next.config.mjs                   # CSP 兼容注释
worker/queue-worker.ts            # 任务完成时触发推送
hooks/use-push-notifications.ts   # 推送点击跳转历史页
```
