/**
 * Admin Discover direct-upload signer
 *
 * Large Discover videos cannot be sent through Next API routes as FormData:
 * the request can be rejected before route code runs. This endpoint signs a
 * browser PUT directly to S3, then the Discover form submits only the final URL.
 */

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireAdmin } from '@/lib/admin/auth'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-1'
})

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'static.vidfab.ai'

const MIME_TO_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
}

type UploadKind = 'video' | 'image'

function getExtension(contentType: string, fileName: string, kind: UploadKind) {
  const fromMime = MIME_TO_EXT[contentType.toLowerCase()]
  if (fromMime) return fromMime

  const fromName = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName

  return kind === 'video' ? 'mp4' : 'jpg'
}

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
      return NextResponse.json(
        { success: false, error: 'Invalid upload kind' },
        { status: 400 }
      )
    }

    if (!contentType.startsWith(`${kind}/`)) {
      return NextResponse.json(
        { success: false, error: `Invalid ${kind} content type` },
        { status: 400 }
      )
    }

    const ext = getExtension(contentType, fileName, kind)
    const prefix = kind === 'video' ? 'discover-new/videos' : 'discover-new/images'
    const base = kind === 'video' ? 'discover-video' : 'discover-image'
    const key = `${prefix}/${base}-${crypto.randomUUID()}-${Date.now()}.${ext}`

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType
    })

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 15 * 60 })

    return NextResponse.json({
      success: true,
      uploadUrl,
      publicUrl: `https://${BUCKET_NAME}/${key}`
    })
  } catch (error: any) {
    console.error('POST /api/admin/discover/upload-url 错误:', error)
    const message = error?.message || '创建上传链接失败'
    const status = message.includes('Unauthorized') ? 401 : 500

    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}
