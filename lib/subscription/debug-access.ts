import { NextResponse } from 'next/server'

/**
 * Blocks subscription debugging endpoints in production unless explicitly enabled
 * and restricted to configured admins.
 */
export function requireSubscriptionDebugAccess(session: unknown) {
  const isProduction = process.env.NODE_ENV === 'production'
  const explicitlyEnabled = process.env.ENABLE_SUBSCRIPTION_DEBUG_ENDPOINTS === 'true'

  if (!isProduction) {
    return null
  }

  if (!explicitlyEnabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const sessionUser = typeof session === 'object' && session && 'user' in session
    ? (session as { user?: { email?: string | null } }).user
    : undefined
  const email = sessionUser?.email
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)

  if (!email || !adminEmails.includes(email.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return null
}
