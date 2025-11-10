/**
 * 临时 API - 手动创建用户记录
 * 仅用于开发调试
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth/config'
import { supabaseAdmin, TABLES } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const session = await getServerSession(authConfig)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const userId = session.user.uuid
    const userEmail = session.user.email

    console.log(`🔧 [DEBUG] Creating user record for ${userId}`)

    // 检查用户是否已存在
    const { data: existingUser } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('uuid')
      .eq('uuid', userId)
      .single()

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'User already exists',
        data: { userId }
      })
    }

    // 创建用户记录
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from(TABLES.USERS)
      .insert({
        uuid: userId,
        email: userEmail.toLowerCase().trim(),
        nickname: userEmail.split('@')[0],
        avatar_url: session.user.image || '',
        signin_type: 'credentials',
        signin_provider: 'email',
        signin_openid: userId,
        signin_ip: '0.0.0.0',
        email_verified: true,
        is_active: true,
        subscription_plan: 'free',
        subscription_status: 'active',
        credits_remaining: 50,
        total_videos_processed: 0,
        storage_used_mb: 0,
        max_storage_mb: 1024,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Failed to create user:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to create user', details: insertError.message },
        { status: 500 }
      )
    }

    console.log(`✅ User created successfully: ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      data: { userId, email: userEmail }
    })

  } catch (error) {
    console.error('❌ Create user error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.uuid) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // 检查用户是否存在
    const { data: user, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('uuid, email, nickname, created_at')
      .eq('uuid', session.user.uuid)
      .single()

    if (error || !user) {
      return NextResponse.json({
        success: false,
        exists: false,
        userId: session.user.uuid,
        message: 'User does not exist in database'
      })
    }

    return NextResponse.json({
      success: true,
      exists: true,
      data: user
    })

  } catch (error) {
    console.error('❌ Check user error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
