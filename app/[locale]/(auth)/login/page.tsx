import { setRequestLocale } from 'next-intl/server'
import { UnifiedAuthModal } from "@/components/auth/unified-auth-modal"

// 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

/**
 * Page component for the login route.
 * Renders the unified authentication modal.
 */
export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <UnifiedAuthModal />
}
