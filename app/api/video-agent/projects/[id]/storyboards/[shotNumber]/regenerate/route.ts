/**
 * Video Agent - 重新生成分镜图 API
 * POST: 重新生成单张分镜图
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { regenerateStoryboard, IMAGE_STYLES } from '@/lib/services/video-agent/storyboard-generator'
import type { Shot, CharacterConfig, ImageStyle } from '@/lib/services/video-agent/storyboard-generator'

/**
 * 重新生成分镜图
 * POST /api/video-agent/projects/[id]/storyboards/[shotNumber]/regenerate
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; shotNumber: string } }
) {
  try {
    // 验证用户身份
    const session = await auth()

    if (!session?.user?.uuid) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    const projectId = params.id
    const shotNumber = parseInt(params.shotNumber, 10)

    if (isNaN(shotNumber)) {
      return NextResponse.json(
        { error: 'Invalid shot number', code: 'INVALID_SHOT_NUMBER' },
        { status: 400 }
      )
    }

    // 验证项目所有权
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('user_id, image_style_id, regenerate_quota_remaining, aspect_ratio')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (project.user_id !== session.user.uuid) {
      return NextResponse.json(
        { error: 'Access denied', code: 'ACCESS_DENIED' },
        { status: 403 }
      )
    }

    // 检查重新生成配额 (暂时禁用以调试)
    // if (project.regenerate_quota_remaining <= 0) {
    //   return NextResponse.json(
    //     { error: 'Regenerate quota exhausted', code: 'QUOTA_EXHAUSTED' },
    //     { status: 400 }
    //   )
    // }

    console.log('[Video Agent] Regenerating storyboard', {
      projectId,
      shotNumber,
      remainingQuota: project.regenerate_quota_remaining
    })

    // 获取分镜脚本 - 从 project 的 script_analysis 中读取
    const { data: projectData, error: projectDataError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('script_analysis')
      .eq('id', projectId)
      .single()

    if (projectDataError || !projectData?.script_analysis) {
      return NextResponse.json(
        { error: 'Script analysis not found', code: 'SCRIPT_NOT_FOUND' },
        { status: 404 }
      )
    }

    const shots = projectData.script_analysis.shots || []
    const shot = shots.find((s: Shot) => s.shot_number === shotNumber)

    if (!shot) {
      return NextResponse.json(
        { error: 'Shot not found', code: 'SHOT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 获取人物配置
    const { data: charactersData } = await supabaseAdmin
      .from('project_characters')
      .select(`
        character_name,
        character_reference_images (
          image_url,
          image_order
        )
      `)
      .eq('project_id', projectId)

    const characterConfigs: CharacterConfig[] = (charactersData || []).map(char => ({
      name: char.character_name,
      reference_images: (char.character_reference_images || [])
        .sort((a: any, b: any) => a.image_order - b.image_order)
        .map((img: any) => img.image_url)
    }))

    // 获取图片风格
    const styleId = project.image_style_id || 'realistic'
    const imageStyle = IMAGE_STYLES[styleId] || IMAGE_STYLES.realistic

    console.log('[Video Agent] Regenerating storyboard with data', {
      projectId,
      shotNumber,
      shot: {
        shot_number: shot.shot_number,
        description: shot.description?.substring(0, 50) + '...',
        characters: shot.characters
      },
      characters: characterConfigs.map(c => ({
        name: c.name,
        referenceImageCount: c.reference_images.length,
        referenceImages: c.reference_images
      })),
      style: imageStyle.name
    })

    // 调用重新生成服务
    const result = await regenerateStoryboard(
      shot as Shot,
      characterConfigs,
      imageStyle as ImageStyle,
      project.aspect_ratio || '16:9'
    )

    console.log('[Video Agent] Storyboard regeneration result', {
      projectId,
      shotNumber,
      status: result.status
    })

    // 更新数据库中的分镜图记录
    const { error: updateError } = await supabaseAdmin
      .from('project_storyboards')
      .update({
        image_url: result.image_url || null,
        status: result.status,
        error_message: result.error || null,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('shot_number', shotNumber)

    if (updateError) {
      console.error('[Video Agent] Failed to update storyboard:', updateError)
    }

    // 扣除重新生成配额 (暂时禁用以调试)
    // await supabaseAdmin
    //   .from('video_agent_projects')
    //   .update({
    //     regenerate_quota_remaining: project.regenerate_quota_remaining - 1
    //   })
    //   .eq('id', projectId)

    return NextResponse.json({
      success: true,
      data: {
        shotNumber,
        imageUrl: result.image_url,
        status: result.status,
        error: result.error,
        remainingQuota: project.regenerate_quota_remaining  // 暂时不扣除，用于调试
      }
    })

  } catch (error) {
    console.error('[Video Agent] Storyboard regeneration error:', error)
    return NextResponse.json(
      {
        error: 'Failed to regenerate storyboard',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : undefined
      },
      { status: 500 }
    )
  }
}
