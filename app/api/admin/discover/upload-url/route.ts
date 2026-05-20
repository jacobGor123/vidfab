/**
 * Admin Discover direct-upload signer.
 *
 * Large Discover videos cannot be sent through Next API routes as FormData:
 * the request can be rejected before route code runs. This endpoint signs a
 * browser upload directly to Supabase Storage, then the Discover form submits
 * only the final public URL.
 */

import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createDiscoverSignedUploadUrl } from '@/lib/discover/upload'
import { discoverJson } from '@/lib/discover/cache-control'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type UploadKind = 'video' | 'image'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json().catch(() => null) as {
      kind?: UploadKind
      fileName?: string
      contentType?: string
    } | null

    const kind = body?.kind
    const fileName = body?.fileName || 'discover-upload'
    const contentType = body?.contentType || ''

    if (kind !== 'video' && kind !== 'image') {
      return discoverJson(
        { success: false, error: 'Invalid upload kind' },
        { status: 400 }
      )
    }

    if (!contentType.startsWith(`${kind}/`)) {
      return discoverJson(
        { success: false, error: `Invalid ${kind} content type` },
        { status: 400 }
      )
    }

    const signedUpload = await createDiscoverSignedUploadUrl(kind, fileName, contentType)

    if (!signedUpload.success) {
      return discoverJson(
        { success: false, error: signedUpload.error || '创建上传链接失败' },
        { status: 500 }
      )
    }

    return discoverJson({
      success: true,
      // Keep uploadUrl for already-open admin pages that still run the old client bundle.
      uploadUrl: signedUpload.signedUrl,
      bucket: signedUpload.bucket,
      path: signedUpload.path,
      token: signedUpload.token,
      publicUrl: signedUpload.url,
    })
  } catch (error: any) {
    console.error('POST /api/admin/discover/upload-url 错误:', error)
    const message = error?.message || '创建上传链接失败'
    const status = message.includes('Unauthorized') ? 401 : 500

    return discoverJson(
      { success: false, error: message },
      { status }
    )
  }
}
