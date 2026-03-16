/**
 * POST /api/user/device-check
 * Layer 3 设备指纹检测入口
 * 需要 NextAuth session，幂等，每个 user_uuid 只处理一次
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth/config'
import { checkAndRecordDevice } from '@/lib/fraud/device-checker'
import { getAntifraudIp } from '@/lib/fraud/ip-checker'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.uuid) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const fingerprintHash = body?.fingerprintHash

    if (!fingerprintHash || typeof fingerprintHash !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing fingerprintHash' }, { status: 400 })
    }

    const ip = await getAntifraudIp()
    const result = await checkAndRecordDevice(fingerprintHash, session.user.uuid, ip)

    return NextResponse.json({ success: true, isFraud: result.isFraud })
  } catch (error) {
    console.error('[api/user/device-check] 错误:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
