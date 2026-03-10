/**
 * Video Agent - 重新生成分镜图 API
 * POST: 重新生成单张分镜图
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { regenerateStoryboard, IMAGE_STYLES } from '@/lib/services/video-agent/storyboard-generator'
import { videoQueueManager } from '@/lib/queue/queue-manager'
import { VideoAgentStorageManager } from '@/lib/services/video-agent/storage-manager'
import { extractFieldsFromPrompt } from '@/lib/services/video-agent/prompt-field-extractor'
import type { Shot, CharacterConfig, ImageStyle, ScriptAnalysisResult } from '@/lib/types/video-agent'
import type { Database } from '@/lib/database.types'
import { checkAndDeductStoryboardGeneration } from '@/lib/video-agent/credits-check'
import { refundUserCredits } from '@/lib/simple-credits-check'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']
type ProjectCharacter = Database['public']['Tables']['project_characters']['Row']
type CharacterReferenceImage = Database['public']['Tables']['character_reference_images']['Row']

// 人物查询结果类型（包含关联的参考图）
type CharacterWithReferences = Pick<ProjectCharacter, 'id' | 'character_name'> & {
  character_reference_images: Pick<CharacterReferenceImage, 'image_url' | 'image_order'>[]
}

/**
 * 重新生成分镜图
 * POST /api/video-agent/projects/[id]/storyboards/[shotNumber]/regenerate
 */
export const POST = withAuth(async (request, { params, userId }) => {
  // 用于在 catch 块中判断积分是否已扣除（方便退款）
  let deductedCredits = 0

  try {
    const projectId = params.id
    const shotNumber = parseInt(params.shotNumber, 10)

    // 验证 projectId 存在
    if (!projectId) {
      console.error('[Video Agent] Project ID is missing from params')
      return NextResponse.json(
        { error: 'Project ID is required', code: 'PROJECT_ID_MISSING' },
        { status: 400 }
      )
    }

    // 获取请求体中的自定义 prompt、字段更新和选中的人物
    const body = await request.json().catch(() => ({}))
    const customPrompt = body.customPrompt as string | undefined
    const selectedCharacterNames = body.selectedCharacterNames as string[] | undefined
    // Be defensive: the client should send UUID ids, but older UI flows may accidentally
    // send character names/descriptions in selectedCharacterIds.
    const selectedCharacterIdsRaw = body.selectedCharacterIds as unknown
    const selectedCharacterIds = Array.isArray(selectedCharacterIdsRaw)
      ? (selectedCharacterIdsRaw as any[]).map(v => String(v))
      : undefined
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const selectedCharacterIdsValid = selectedCharacterIds?.filter(id => uuidRe.test(id))
    const fieldsUpdate = body.fieldsUpdate as {
      description?: string
      character_action?: string
    } | undefined

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
      .single<VideoAgentProject>()

    if (projectError || !project) {
      console.error('[Video Agent] Project not found:', projectId, projectError?.message)
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (project.user_id !== userId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'ACCESS_DENIED' },
        { status: 403 }
      )
    }

    console.log('[Video Agent] Regenerate request received:', {
      projectId,
      shotNumber,
      hasCustomPrompt: !!customPrompt,
      selectedCharacterNamesCount: selectedCharacterNames?.length ?? null,
      selectedCharacterIdsCount: selectedCharacterIds?.length ?? null,
      selectedCharacterIdsValidCount: selectedCharacterIdsValid?.length ?? null
    })

    // 检查重新生成配额 (暂时禁用以调试)
    // if (project.regenerate_quota_remaining <= 0) {
    //   return NextResponse.json(
    //     { error: 'Regenerate quota exhausted', code: 'QUOTA_EXHAUSTED' },
    //     { status: 400 }
    //   )
    // }

    // 获取分镜脚本 - 从 project 的 script_analysis 中读取
    const { data: projectData, error: projectDataError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('script_analysis')
      .eq('id', projectId)
      .single<VideoAgentProject>()

    if (projectDataError || !projectData?.script_analysis) {
      return NextResponse.json(
        { error: 'Script analysis not found', code: 'SCRIPT_NOT_FOUND' },
        { status: 404 }
      )
    }

    const shots = (projectData.script_analysis as unknown as ScriptAnalysisResult).shots || []
    const shot = shots.find((s: Shot) => s.shot_number === shotNumber)

    if (!shot) {
      return NextResponse.json(
        { error: 'Shot not found', code: 'SHOT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // ✅ 积分检查 (单个分镜)
    const creditResult = await checkAndDeductStoryboardGeneration(userId, 1)

    if (!creditResult.canAfford) {
      return NextResponse.json(
        {
          error: creditResult.error || 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          requiredCredits: creditResult.requiredCredits,
          userCredits: creditResult.userCredits
        },
        { status: 402 }
      )
    }
    // 记录已扣除积分数，用于失败时退款
    deductedCredits = creditResult.requiredCredits

    // 获取人物配置
    const { data: charactersData } = await supabaseAdmin
      .from('project_characters')
      .select(`
        id,
        character_name,
        character_reference_images (
          image_url,
          image_order
        )
      `)
      .eq('project_id', projectId)
      .returns<CharacterWithReferences[]>()

    console.log('[Video Agent] Loaded project_characters:', {
      count: (charactersData || []).length,
      ids: (charactersData || []).map(c => c.id)
    })

    // 映射人物配置（包含 id 字段以便追踪实际使用的人物）
    let characterConfigs: CharacterConfig[] = (charactersData || []).map(char => ({
      id: char.id,  // 🔥 必须包含 id，用于生成 used_character_ids
      name: char.character_name,
      reference_images: (char.character_reference_images || [])
        .sort((a: any, b: any) => a.image_order - b.image_order)
        .map((img: any) => img.image_url)
    }))

    // 🔥 选择策略：优先使用 selectedCharacterIds（稳定、避免同名/别名/括号问题）
    // - undefined: 使用所有角色（默认行为，向后兼容）
    // - 空数组: 不使用任何角色参考图
    // - 非空: 只使用选中的角色
    if (selectedCharacterIds !== undefined) {
      if (selectedCharacterIdsValid && selectedCharacterIdsValid.length === 0) {
        console.warn('[Video Agent] selectedCharacterIds present but none look like UUIDs; ignoring ids and falling back to names')
      } else if (selectedCharacterIds.length === 0) {
        console.log('[Video Agent] User explicitly selected NO characters (by id)')
        characterConfigs = []
      } else {
        const idsToUse = selectedCharacterIdsValid || selectedCharacterIds
        console.log('[Video Agent] Filtering characters by selectedCharacterIds:', idsToUse)

        const availableIds = new Set((charactersData || []).map(c => c.id))
        const missingIds = idsToUse.filter(id => !availableIds.has(id))
        if (missingIds.length > 0) {
          console.warn('[Video Agent] selectedCharacterIds missing in DB query result:', {
            missingIds,
            availableCount: availableIds.size
          })
        }

        const selectedIdSet = new Set(idsToUse)
        characterConfigs = (charactersData || [])
          .filter(c => selectedIdSet.has(c.id))
          .map(c => ({
            name: c.character_name,
            reference_images: (c.character_reference_images || [])
              .sort((a: any, b: any) => a.image_order - b.image_order)
              .map((img: any) => img.image_url)
          }))

        console.log(
          '[Video Agent] Selected characters reference images (by id):',
          characterConfigs.map(c => ({
            name: c.name,
            refCount: c.reference_images?.length || 0,
            first: c.reference_images?.[0],
            last: c.reference_images?.[c.reference_images.length - 1]
          }))
        )

        console.log('[Video Agent] Filtered character configs (by id):', {
          count: characterConfigs.length,
          names: characterConfigs.map(c => c.name)
        })

        // Safety net: if ids were provided but resulted in 0 configs, fallback to name-based selection
        // to avoid silently generating without reference images.
        if (characterConfigs.length === 0 && selectedCharacterNames && selectedCharacterNames.length > 0) {
          console.warn('[Video Agent] 0 configs after id filtering; falling back to name filtering')
          characterConfigs = characterConfigs = (charactersData || [])
            .filter(c => {
              const shortConfigName = c.character_name.split('(')[0].trim().toLowerCase()
              return selectedCharacterNames.some(selectedName => {
                const shortSelectedName = selectedName.split('(')[0].trim().toLowerCase()
                return shortConfigName === shortSelectedName
              })
            })
            .map(c => ({
              name: c.character_name,
              reference_images: (c.character_reference_images || [])
                .sort((a: any, b: any) => a.image_order - b.image_order)
                .map((img: any) => img.image_url)
            }))
        }
      }
    } else if (selectedCharacterNames !== undefined) {
      // 向后兼容：仍支持按名称选择
      if (selectedCharacterNames.length === 0) {
        console.log('[Video Agent] User explicitly selected NO characters (by name)')
        characterConfigs = []
      } else {
        console.log('[Video Agent] Filtering characters by selectedCharacterNames:', selectedCharacterNames)
        characterConfigs = characterConfigs.filter(config => {
          const shortConfigName = config.name.split('(')[0].trim().toLowerCase()
          return selectedCharacterNames.some(selectedName => {
            const shortSelectedName = selectedName.split('(')[0].trim().toLowerCase()
            return shortConfigName === shortSelectedName
          })
        })
        console.log('[Video Agent] Filtered character configs (by name):', characterConfigs.map(c => c.name))
      }
    }

    // 获取图片风格
    const styleId = project.image_style_id || 'realistic'
    const imageStyle = IMAGE_STYLES[styleId] || IMAGE_STYLES.realistic

    // 调用重新生成服务
    const result = await regenerateStoryboard(
      shot as Shot,
      characterConfigs,
      imageStyle as ImageStyle,
      project.aspect_ratio || '16:9',
      undefined,  // seed (暂时不使用)
      customPrompt
    )

    console.log('[Video Agent] regenerateStoryboard result:', {
      status: result.status,
      hasImageUrl: !!result.image_url,
      imageUrl: result.image_url
    })

    // 保存新版本并获取完整记录
    let newStoryboard: any = null
    let newVersionId: string | null = null

    if (result.status === 'success' && result.image_url) {
      // 直接用 TypeScript 管理版本，不依赖可能签名不一致的 RPC 函数
      // Step 1: 获取当前最大版本号
      const { data: maxVersionData } = await supabaseAdmin
        .from('project_storyboards')
        .select('version')
        .eq('project_id', projectId)
        .eq('shot_number', shotNumber)
        .order('version', { ascending: false } as any)
        .limit(1)
        .maybeSingle() as { data: { version: number } | null; error: any }

      const nextVersion = (maxVersionData?.version || 0) + 1

      // Step 2: 将当前版本标记为历史（保留记录）
      await supabaseAdmin
        .from('project_storyboards')
        .update({ is_current: false, updated_at: new Date().toISOString() } as any)
        .eq('project_id', projectId)
        .eq('shot_number', shotNumber)
        .eq('is_current', true)

      // Step 3: 插入新版本记录
      const { data: newRecord, error: insertError } = await (supabaseAdmin
        .from('project_storyboards')
        .insert({
          project_id: projectId,
          shot_number: shotNumber,
          version: nextVersion,
          is_current: true,
          status: 'success',
          image_url: result.image_url,
          image_url_external: result.image_url,
          storage_status: 'pending',
          generation_attempts: 1,
          used_character_ids: result.used_character_ids || [],
        } as any)
        .select()
        .single() as Promise<{ data: any; error: any }>)

      if (insertError) {
        console.error('[Video Agent] Failed to insert new storyboard version:', insertError)
        // 回滚：恢复旧版本的 is_current=true（取版本号最大的那条）
        await supabaseAdmin
          .from('project_storyboards')
          .update({ is_current: true, updated_at: new Date().toISOString() } as any)
          .eq('project_id', projectId)
          .eq('shot_number', shotNumber)
          .eq('version', nextVersion - 1)
        throw new Error(`Failed to save new storyboard version: ${insertError.message}`)
      }

      newStoryboard = newRecord
      newVersionId = newRecord?.id

      console.log('[Video Agent] Storyboard saved as new history version:', {
        projectId,
        shotNumber,
        nextVersion,
        newVersionId
      })
    } else {
      // 生成失败：退还积分 + 更新当前版本状态
      if (deductedCredits > 0) {
        const refundResult = await refundUserCredits(userId, deductedCredits)
        if (refundResult.success) {
          console.log(`[Video Agent] Refunded ${deductedCredits} credits due to generation failure (status: ${result.status})`)
          deductedCredits = 0  // 已退款，防止 catch 块重复退款
        } else {
          console.error('[Video Agent] Failed to refund credits after generation failure:', refundResult.error)
        }
      }

      const now = new Date().toISOString()
      const { error: updateError } = await supabaseAdmin
        .from('project_storyboards')
        .update({
          status: result.status,
          error_message: result.error || null,
          updated_at: now
        } as any)
        .eq('project_id', projectId)
        .eq('shot_number', shotNumber)
        .eq('is_current', true)

      if (updateError) {
        console.error('[Video Agent] Failed to update storyboard status:', updateError)
      }
    }

    // 🔥 Stable output (async): enqueue a download job so the request can return quickly.
    // The worker will retry/backoff, which is critical on flaky networks.
    if (result.status === 'success' && result.image_url && newVersionId) {
      try {
        // 🛡️ 防止副作用：使用版本 ID 作为 jobId 的一部分，确保每个版本只下载一次
        const uniqueJobId = `storyboard_download_${projectId}_${shotNumber}_${newVersionId}`

        await videoQueueManager.addJob(
          'storyboard_download',
          {
            jobId: uniqueJobId,
            userId,
            videoId: projectId,
            projectId,
            shotNumber,
            storyboardId: newVersionId,  // 🔥 新增：传递版本 ID，用于精确检查
            externalUrl: result.image_url,
            createdAt: new Date().toISOString(),
          },
          {
            priority: 'low',  // 🔥 改为低优先级，不影响视频生成
            attempts: 6,
            backoff: { type: 'exponential', delay: 10000 },
            removeOnComplete: true,  // 🔥 完成后自动删除，节省内存
            removeOnFail: false      // 🔥 失败保留，便于排查问题
          }
        )

        console.log('[Video Agent] Queued storyboard download after regenerate', {
          projectId,
          shotNumber,
          versionId: newVersionId,
          jobId: uniqueJobId
        })
      } catch (queueErr) {
        console.error('[Video Agent] Failed to enqueue storyboard download:', queueErr)

        // No direct-download fallback: server-side fetch must go through the worker for reliability and SSRF controls.
      }
    }

    // 🔥 新增：如果用户提供了自定义 prompt，自动提取字段并更新 script_analysis
    if (customPrompt) {
      try {
        console.log('[Video Agent] Extracting fields from custom prompt...')

        const extractedFields = await extractFieldsFromPrompt(customPrompt)

        console.log('[Video Agent] Extracted fields:', extractedFields)

        // 获取当前的 script_analysis
        const { data: currentProject, error: fetchError } = await supabaseAdmin
          .from('video_agent_projects')
          .select('script_analysis')
          .eq('id', projectId)
          .single<VideoAgentProject>()

        if (fetchError) {
          console.error('[Video Agent] Failed to fetch project for field extraction:', fetchError)
        } else if (currentProject?.script_analysis) {
          const scriptAnalysis = currentProject.script_analysis as unknown as ScriptAnalysisResult

        // 更新对应 shot 的字段
          const updatedShots = scriptAnalysis.shots.map((s: Shot) => {
            if (s.shot_number === shotNumber) {
              return {
                ...s,
                description: extractedFields.description,
                character_action: extractedFields.character_action,
                video_prompt: extractedFields.video_prompt  // 🔥 同时更新 video_prompt
              }
            }
            return s
          })

          // 保存更新
          const { error: updateFieldsError } = await supabaseAdmin
            .from('video_agent_projects')
            .update({
              script_analysis: {
                ...scriptAnalysis,
                shots: updatedShots
              } as any,
              updated_at: new Date().toISOString()
            } as any)
            .eq('id', projectId)

          if (updateFieldsError) {
            console.error('[Video Agent] Failed to update extracted fields in script_analysis:', updateFieldsError)
          } else {
            console.log('[Video Agent] Extracted fields updated in script_analysis')
          }
        }

        // 🔥 标记关联视频为 outdated（因为 prompt 已经变化）
        // 覆盖 success / generating / failed 三种状态，确保 generating 状态的旧任务
        // 不会在下次轮询中误显示为"生成中"
        await supabaseAdmin
          .from('project_video_clips')
          .update({ status: 'outdated' } as any)
          .eq('project_id', projectId)
          .eq('shot_number', shotNumber)
          .neq('status', 'outdated')

      } catch (error: any) {
        console.error('[Video Agent] Field extraction failed:', error)
        // 不阻塞主流程，继续执行
      }
    }

    // 🔥 如果用户修改了字段，同时更新 script_analysis.shots
    if (fieldsUpdate && Object.keys(fieldsUpdate).length > 0) {
      console.log('[Video Agent] Updating shot fields in script_analysis:', fieldsUpdate)

      // 获取当前的 script_analysis
      const { data: currentProject, error: fetchError } = await supabaseAdmin
        .from('video_agent_projects')
        .select('script_analysis')
        .eq('id', projectId)
        .single<VideoAgentProject>()

      if (fetchError) {
        console.error('[Video Agent] Failed to fetch project for field update:', fetchError)
        // 不抛出错误，因为分镜图已经生成成功，只是字段更新失败
      } else if (currentProject?.script_analysis) {
        const scriptAnalysis = currentProject.script_analysis as unknown as ScriptAnalysisResult
        const updatedShots = scriptAnalysis.shots.map((s: Shot) => {
          if (s.shot_number === shotNumber) {
            return {
              ...s,
              ...fieldsUpdate // 合并用户修改的字段
            }
          }
          return s
        })

        // 更新 script_analysis
        const { error: updateFieldsError } = await supabaseAdmin
          .from('video_agent_projects')
          .update({
            script_analysis: {
              ...scriptAnalysis,
              shots: updatedShots
            } as any,
            updated_at: new Date().toISOString()
          } as any)
          .eq('id', projectId)

        if (updateFieldsError) {
          console.error('[Video Agent] Failed to update shot fields in script_analysis:', updateFieldsError)
          // 不抛出错误，因为分镜图已经生成成功，只是字段更新失败
        } else {
          console.log('[Video Agent] Shot fields updated in script_analysis')
        }
      }
    }

    // 🔥 修复：检查所有分镜图是否全部完成，更新项目状态
    if (result.status === 'success') {
      const { data: allStoryboards } = await supabaseAdmin
        .from('project_storyboards')
        .select('status')
        .eq('project_id', projectId)

      if (allStoryboards) {
        const successCount = allStoryboards.filter(sb => sb.status === 'success').length
        const failedCount = allStoryboards.filter(sb => sb.status === 'failed').length
        const totalCount = allStoryboards.length

        // 根据完成情况更新项目状态
        let newStep3Status: 'completed' | 'partial' | 'failed' = 'partial'
        if (successCount === totalCount) {
          newStep3Status = 'completed'
        } else if (failedCount === totalCount) {
          newStep3Status = 'failed'
        }

        await supabaseAdmin
          .from('video_agent_projects')
          .update({
            step_3_status: newStep3Status,
            updated_at: new Date().toISOString()
          } as any)
          .eq('id', projectId)
          .returns<any>()
      }
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
        remainingQuota: project.regenerate_quota_remaining,  // 暂时不扣除，用于调试
        storyboard: newStoryboard  // 返回新创建的完整记录
      }
    })

  } catch (error) {
    console.error('[Video Agent] Storyboard regeneration error:', error)

    // 如果积分已扣除但生成因异常中断，退还积分
    if (deductedCredits > 0) {
      const refundResult = await refundUserCredits(userId, deductedCredits)
      if (refundResult.success) {
        console.log(`[Video Agent] Refunded ${deductedCredits} credits due to unexpected error`)
      } else {
        console.error('[Video Agent] Failed to refund credits after unexpected error:', refundResult.error)
      }
    }

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
})
