import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

const DISCOVER_NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
}

export function discoverJson<T>(body: T, init?: ResponseInit) {
  const headers = new Headers(init?.headers)

  Object.entries(DISCOVER_NO_STORE_HEADERS).forEach(([key, value]) => {
    headers.set(key, value)
  })

  return NextResponse.json(body, {
    ...init,
    headers,
  })
}

export function revalidateDiscoverContent() {
  revalidatePath('/studio/discover')
  revalidatePath('/create')
  revalidatePath('/api/discover')
  revalidatePath('/api/discover/categories')
}
