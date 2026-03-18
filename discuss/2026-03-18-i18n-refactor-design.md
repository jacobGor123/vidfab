# VidFab 多语言（i18n）重构设计方案

**日期：** 2026-03-18
**状态：** 已确认，待实施

---

## 一、需求概述

为 VidFab 添加多语言支持，目标语言：

| 语言 | 代码 | URL 前缀 |
|------|------|----------|
| 英文（默认） | `en` | 无前缀（`/`） |
| 简体中文 | `zh` | `/zh/` |
| 日语 | `ja` | `/ja/` |
| 德语 | `de` | `/de/` |

**翻译范围：** 首页、营销页（about/pricing/contact）、工具页（text-to-video/image-to-video/ai-video-effects/text-to-image/image-to-image）、工具落地页（/tools/veo3、/tools/sora2、/tools/kling3）
**排除翻译内容：** blog、privacy、terms-of-service、admin（移入 `[locale]` 下但内容保持英文）
**排除路由前缀：** studio/create（已登录工具区，不加 locale 前缀）
**翻译管理：** 手写 JSON 文件
**语言切换：** 浏览器 Accept-Language 自动检测 + Navbar 手动切换（cookie 记住偏好）

---

## 二、技术选型

- **框架：** next-intl v3.26.3（已安装，当前仅配置英文）
- **URL 策略：** `localePrefix: 'as-needed'`（非默认语言加前缀，英文无前缀；`/en/` 自动 301 到 `/`）
- **路由方案：** 全量 `[locale]` 动态段包裹（方案 A）

---

## 三、路由结构

### 迁移后目录树

```
app/
├── [locale]/
│   ├── layout.tsx                     # Server Component：setRequestLocale + NextIntlClientProvider
│   ├── (main)/
│   │   ├── layout.tsx                 # Client Component：Navbar + Footer（含语言切换器）
│   │   ├── page.tsx                   # 首页（需翻译）
│   │   ├── about/page.tsx
│   │   ├── pricing/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── text-to-video/page.tsx
│   │   ├── image-to-video/page.tsx
│   │   ├── ai-video-effects/page.tsx
│   │   ├── text-to-image/page.tsx
│   │   ├── image-to-image/page.tsx
│   │   ├── tools/
│   │   │   ├── veo3/page.tsx          # 固定路径，不迁移为 [slug]
│   │   │   ├── sora2/page.tsx
│   │   │   └── kling3/page.tsx
│   │   ├── blog/                      # 移入，内容保持英文
│   │   ├── privacy/page.tsx           # 同上
│   │   ├── terms-of-service/page.tsx  # 同上
│   │   └── admin/                     # 同上（不触发 Accept-Language 跳转，见中间件设计）
│   └── (auth)/
│       └── login/page.tsx
│
├── studio/                            # 保持不变，middleware matcher 排除
├── api/                               # 保持不变
└── layout.tsx                         # 根 layout：<html lang> 动态读取 + 全局 Providers
```

### Layout 层级与 Server/Client 边界

**关键约束：** `<html>` 和 `<body>` 只能在根 `app/layout.tsx` 中出现，子 layout 不能再渲染。

```
app/layout.tsx                    → <html lang={locale}> + <body> + 全局 Providers（Server Component）
  └── app/[locale]/layout.tsx     → setRequestLocale(locale) + NextIntlClientProvider（Server Component）
        └── app/[locale]/(main)/layout.tsx  → Navbar + Footer（Client Component，使用 useTranslations）
```

根 `app/layout.tsx` 无法通过 `getLocale()` 获取正确 locale（根 layout 在 `[locale]/layout.tsx` 的 `setRequestLocale` 之前执行，locale 尚未注入）。正确做法是：**middleware 在响应头中写入 `x-next-intl-locale`，根 layout 从 headers 读取**：

```tsx
// middleware.ts 中，intlMiddleware 跑完后追加：
const response = intlMiddleware(req);
const locale = /* next-intl 内部已解析的 locale，从 response header 或 cookie 读取 */;
response.headers.set('x-next-intl-locale', detectedLocale);
return response;
```

```tsx
// app/layout.tsx
import { headers } from 'next/headers';

export default function RootLayout({ children }) {
  const locale = headers().get('x-next-intl-locale') ?? 'en';
  const lang = locale === 'zh' ? 'zh-Hans' : locale;
  return (
    <html lang={lang}>
      <body>
        {/* 全局 Providers 保持不变 */}
        {children}
      </body>
    </html>
  );
}
```

middleware 中 `detectedLocale` 的获取方式：next-intl middleware 会在响应 cookie `NEXT_LOCALE` 中写入解析结果，可从请求 cookie 或 `Accept-Language` 自行解析，或在 `createMiddleware` 配置中通过 `localeDetection` 回调拦截。

`app/[locale]/layout.tsx` 调用 `setRequestLocale` 激活静态渲染支持，并注入 `NextIntlClientProvider`：

```tsx
// app/[locale]/layout.tsx
import { setRequestLocale, getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';

export default async function LocaleLayout({ children, params: { locale } }) {
  setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'zh' }, { locale: 'ja' }, { locale: 'de' }];
}
```

**`generateStaticParams` 说明：** 所有在 `[locale]` 下的页面（含不翻译的 blog/admin）都会被静态生成 4 个语言版本，保持原有 SSG 性能，不退化为 SSR。

---

## 四、中间件架构

### 核心问题：中间件组合方式

现有 `middleware.ts` 使用 NextAuth 的 `withAuth()` 高阶函数。加入 `[locale]` 前缀后，受保护路径从 `/profile` 变为 `/zh/profile`，原有 `startsWith('/profile')` 检查失效。

**解决方案：** 彻底移除 `withAuth()` 包裹器，改为在 next-intl middleware 内部手动调用 `getToken` 进行鉴权：

```ts
import createMiddleware from 'next-intl/middleware';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// 受保护路径（不含 locale 前缀，匹配时剥离前缀后比较）
const PROTECTED_PATHS = ['/profile', '/settings', '/video', '/subscription'];

function isProtected(pathname: string): boolean {
  // 从 routing.locales 动态构建正则，避免硬编码
  const localePattern = routing.locales.filter(l => l !== routing.defaultLocale).join('|');
  const stripped = pathname.replace(new RegExp(`^\\/(${localePattern})`), '');
  return PROTECTED_PATHS.some(p => stripped.startsWith(p));
}

export default async function middleware(req) {
  const { pathname } = req.nextUrl;

  // admin 路由跳过 locale 自动检测（不触发 Accept-Language 重定向）
  if (pathname.includes('/admin')) {
    return NextResponse.next();
  }

  // 先跑 intl（locale 检测 + 重定向）
  const intlResponse = intlMiddleware(req);

  // 受保护路由额外鉴权
  if (isProtected(pathname)) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const locale = req.cookies.get('NEXT_LOCALE')?.value ?? 'en';
      const loginUrl = new URL(locale === 'en' ? '/login' : `/${locale}/login`, req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlResponse ?? NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|studio|_next|.*\\..*).*)', '/'],
};
```

### locale 检测优先级

1. Cookie：`NEXT_LOCALE`（用户手动切换后由 next-intl 写入）
2. `Accept-Language` header（浏览器默认语言）
3. 默认：`en`

### admin 路由特殊处理

admin 页面随 `(main)` 移入 `[locale]`，但在 middleware 中跳过 Accept-Language 自动重定向（避免管理员被强制跳转到中文 admin）。admin URL 固定使用英文路径 `/admin/...`，即使在 `[locale]` 路由结构下也始终无前缀地访问（middleware 对 admin 直接 `NextResponse.next()`）。

---

## 五、翻译文件结构

### 目录组织

按命名空间拆分，`i18n/request.ts` 合并加载同一 locale 下所有 namespace 文件：

```
messages/
├── en/
│   ├── common.json       # Navbar、Footer、通用按钮/错误文案
│   ├── home.json
│   ├── pricing.json
│   ├── about.json
│   ├── contact.json
│   ├── tools.json        # 工具落地页（veo3/sora2/kling3）
│   └── video-tools.json  # 工具页（text-to-video 等）
├── zh/（结构相同）
├── ja/（结构相同）
└── de/（结构相同）
```

### `i18n/request.ts` 更新

从原来加载单文件改为合并加载多个 namespace：

```ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  // 合并所有 namespace 文件
  const namespaces = ['common', 'home', 'pricing', 'about', 'contact', 'tools', 'video-tools'];
  const messages = Object.assign(
    {},
    ...await Promise.all(
      namespaces.map(async (ns) => {
        try {
          return { [ns]: (await import(`../messages/${locale}/${ns}.json`)).default };
        } catch {
          // fallback 到 en
          return { [ns]: (await import(`../messages/en/${ns}.json`)).default };
        }
      })
    )
  );

  return { locale, messages };
});
```

### 使用方式

**Server Component（页面级）：**
```tsx
import { getTranslations } from 'next-intl/server';

export default async function PricingPage({ params: { locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations('pricing');
  return <h1>{t('hero.title')}</h1>;
}
```

**Client Component（Navbar 等）：**
```tsx
'use client';
import { useTranslations } from 'next-intl';

export function Navbar() {
  const t = useTranslations('common');
  return <nav>{t('nav.tools')}</nav>;
}
```

### 现有代码迁移

- `lib/i18n.ts` 自定义方案**废弃**，所有调用替换为 next-intl API
- `/locales/` 目录内容迁移到 `/messages/en/` 对应文件，原目录删除
- `i18n/routing.ts` 的幽灵路径（`/dashboard`、`/features` 等不存在的页面）清理删除

---

## 六、语言切换器

### 位置

Navbar 右侧，Globe 图标 + 当前语言缩写，点击展开 shadcn/ui `DropdownMenu`。

### 语言列表

```ts
const locales = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文',    flag: '🇨🇳' },
  { code: 'ja', label: '日本語',  flag: '🇯🇵' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];
```

使用 next-intl 的 `useRouter` + `usePathname` 切换，自动写入 `NEXT_LOCALE` cookie。**注意：** 从 `@/i18n/routing` 导入（由 `createNavigation(routing)` 导出），不是 `next-intl/client`（该路径在 v3 中不存在）：

```tsx
import { useRouter, usePathname } from '@/i18n/routing';
// router.replace(pathname, { locale: newLocale })
```

### 切换行为

| 场景 | 行为 |
|------|------|
| 切换语言 | 保持当前路径，替换 locale 前缀，写入 `NEXT_LOCALE` cookie |
| 首次访问 | 中间件检测 Accept-Language，匹配则跳转对应语言 |
| 二次访问 | 读 `NEXT_LOCALE` cookie，忽略 Accept-Language |
| studio 页面 | 切换后跳到对应 locale 首页 |
| admin 页面 | 切换器不显示（或显示但仅写 cookie，不跳转） |

---

## 七、SEO Metadata

### hreflang 工具函数

新增 `lib/seo/alternate-links.ts`：

```ts
const BASE_URL = 'https://vidfab.ai';
const locales = ['en', 'zh', 'ja', 'de'];

// 输入路径（不含 locale 前缀），输出 hreflang map
// '/pricing' → { en: 'https://vidfab.ai/pricing', zh: 'https://vidfab.ai/zh/pricing', ... }
export function getAlternateLinks(path: string): Record<string, string> {
  return Object.fromEntries(
    locales.map(locale => [
      locale,
      `${BASE_URL}${locale === 'en' ? '' : '/' + locale}${path}`
    ])
  );
}
```

### 页面 generateMetadata 模式

```tsx
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getAlternateLinks } from '@/lib/seo/alternate-links';

export async function generateMetadata({ params: { locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'pricing' });
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: {
      canonical: `https://vidfab.ai${locale === 'en' ? '' : '/' + locale}/pricing`,
      languages: getAlternateLinks('/pricing'),
    },
  };
}
```

### `x-default` hreflang

`getAlternateLinks` 同时输出 `x-default`（指向英文版），符合 Google 推荐规范：

```ts
// 输出中额外加入：'x-default': 'https://vidfab.ai/pricing'
```

---

## 八、迁移策略（分三阶段）

### 阶段一：基础设施（不动页面文件）
1. 更新 `i18n/routing.ts`：添加 zh/ja/de，清理幽灵路径
2. 重写 `middleware.ts`：next-intl + 手动 `getToken` 鉴权，移除 `withAuth()`
3. 更新 `i18n/request.ts`：支持多文件 namespace 合并加载
4. 创建 `messages/en/` 目录结构，从 `locales/` 迁移英文内容，删除 `locales/`
5. 新增 `app/[locale]/layout.tsx`（含 `generateStaticParams` + `NextIntlClientProvider`）
6. 更新根 `app/layout.tsx`：`lang` 改为从 `headers().get('x-next-intl-locale')` 读取（由 middleware 注入）
7. 新增 `lib/seo/alternate-links.ts`

### 阶段二：路由迁移
8. 将 `app/(main)/` 全部移入 `app/[locale]/(main)/`（含 admin/blog/privacy）
9. 将 `app/(auth)/` 移入 `app/[locale]/(auth)/`
10. 工具落地页保持固定路径（`tools/veo3/`、`tools/sora2/`、`tools/kling3/`），不改为 `[slug]`
11. 将所有内部 `<Link>` 替换为 next-intl 的 `<Link>`（自动携带 locale）
12. 各页面 Server Component 顶部加 `setRequestLocale(locale)`

### 阶段三：翻译内容
13. 废弃 `lib/i18n.ts`，替换所有调用为 `useTranslations()` / `getTranslations()`
14. Navbar 添加语言切换器组件
15. 逐页补充 zh/ja/de 翻译 JSON
16. 各需翻译页面补充多语言 `generateMetadata` + hreflang

---

## 九、风险与应对

| 风险 | 应对 |
|------|------|
| 受保护路由鉴权失效（locale 前缀） | 中间件用 `getToken` 替代 `withAuth`，从 `routing.locales` 动态构建正则剥离前缀后匹配 |
| admin 被 Accept-Language 跳转 | middleware 对含 `/admin` 路径直接 `NextResponse.next()`，跳过 intl 检测 |
| 静态页面退化为 SSR | `[locale]/layout.tsx` 声明 `generateStaticParams`，各页面 `setRequestLocale` |
| 内部 `<Link href>` 路径失效 | 全局搜索替换为 next-intl `Link`（from `@/i18n/routing`） |
| studio rewrite 与 locale 冲突 | middleware matcher 排除 `/studio/*` |
| 翻译缺失导致报错 | `request.ts` 中 namespace fallback 到 en |
| 根 layout `html lang` 无法动态读 locale | middleware 写入 `x-next-intl-locale` header，根 layout 从 `headers()` 读取 |
| 已登录用户访问 `/login` 不跳转 | middleware 保留 authRoutes 逻辑：有 token 且路径为登录页则重定向 studio |
| `messages/` 迁移与 `request.ts` 更新时序 | 两者必须同一次提交原子完成，否则站点崩溃 |
