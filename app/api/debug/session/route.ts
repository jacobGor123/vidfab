/**
 * Debug endpoint to check current session and user UUID
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth/config'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Get current session
    const session = await getServerSession(authConfig)

    if (!session) {
      return NextResponse.json({
        success: false,
        message: 'No active session'
      })
    }

    const sessionUuid = session.user?.uuid
    const email = session.user?.email

    // Query user from database
    let userFromDb = null
    let userByEmail = null
    let userOrders = []
    let userSubscription = null

    if (sessionUuid) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('uuid', sessionUuid)
        .single()

      userFromDb = user
    }

    if (email) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      userByEmail = user
    }

    // Get orders for the session UUID
    if (sessionUuid) {
      const { data: orders } = await supabaseAdmin
        .from('subscription_orders')
        .select('*')
        .eq('user_uuid', sessionUuid)
        .order('created_at', { ascending: false })
        .limit(5)

      userOrders = orders || []
    }

    // Get subscription for the session UUID
    if (sessionUuid) {
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_uuid', sessionUuid)
        .single()

      userSubscription = subscription
    }

    // Check if there are orders with email-based UUID
    let ordersWithEmailUuid = []
    if (email && userByEmail) {
      const { data: orders } = await supabaseAdmin
        .from('subscription_orders')
        .select('*')
        .eq('user_uuid', userByEmail.uuid)
        .order('created_at', { ascending: false })
        .limit(5)

      ordersWithEmailUuid = orders || []
    }

    return NextResponse.json({
      success: true,
      session: {
        uuid: sessionUuid,
        email: email,
        name: session.user?.name,
      },
      database: {
        userFromDb: userFromDb ? {
          uuid: userFromDb.uuid,
          email: userFromDb.email,
          created_at: userFromDb.created_at
        } : null,
        userByEmail: userByEmail ? {
          uuid: userByEmail.uuid,
          email: userByEmail.email,
          created_at: userByEmail.created_at
        } : null,
      },
      orders: {
        countForSessionUuid: userOrders.length,
        ordersForSessionUuid: userOrders.map(o => ({
          id: o.id,
          plan_id: o.plan_id,
          status: o.status,
          created_at: o.created_at
        })),
        countForEmailUuid: ordersWithEmailUuid.length,
        ordersForEmailUuid: ordersWithEmailUuid.map(o => ({
          id: o.id,
          plan_id: o.plan_id,
          status: o.status,
          created_at: o.created_at
        }))
      },
      subscription: userSubscription ? {
        plan_id: userSubscription.plan_id,
        status: userSubscription.status,
        credits_remaining: userSubscription.credits_remaining
      } : null,
      analysis: {
        sessionUuidMatchesDb: sessionUuid === userFromDb?.uuid,
        emailBasedUuidMatchesDb: userByEmail?.uuid === sessionUuid,
        hasOrdersInDb: userOrders.length > 0 || ordersWithEmailUuid.length > 0
      }
    })

  } catch (error: any) {
    console.error('Debug session error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }
}