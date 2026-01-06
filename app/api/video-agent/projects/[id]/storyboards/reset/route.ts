/**
 * 临时API：重置卡住的分镜图状态
 * 仅用于开发环境调试
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id

    console.log('[Debug] Resetting storyboards for project:', projectId)

    // 删除所有 generating 状态的记录（之后会重新创建）
    const { data, error } = await supabaseAdmin
      .from('project_storyboards')
      .delete()
      .eq('project_id', projectId)
      .eq('status', 'generating')
      .select()

    if (error) {
      console.error('[Debug] Reset failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 同时重置项目状态
    await supabaseAdmin
      .from('video_agent_projects')
      .update({
        step_3_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    console.log('[Debug] Reset complete:', {
      projectId,
      resetCount: data?.length || 0
    })

    return NextResponse.json({
      success: true,
      message: `Reset ${data?.length || 0} storyboards`,
      projectId
    })

  } catch (error) {
    console.error('[Debug] Reset error:', error)
    return NextResponse.json(
      { error: 'Reset failed' },
      { status: 500 }
    )
  }
}
