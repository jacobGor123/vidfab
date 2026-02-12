/**
 * Video Analysis Hook
 * 处理视频分析的核心逻辑
 */

'use client'

import { useState } from 'react'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'
import { showError, showSuccess } from '@/lib/utils/toast'
import type { ImageStyle } from '@/lib/services/video-agent/character-prompt-generator'

interface UseVideoAnalysisProps {
  duration: number
  storyStyle: string
  aspectRatio: '16:9' | '9:16'
  onComplete: (project: any) => void
}

export function useVideoAnalysis({
  duration,
  storyStyle,
  aspectRatio,
  onComplete
}: UseVideoAnalysisProps) {
  const { analyzeVideo, createProject, updateProject, getProject } = useVideoAgentAPI()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState<string>('')

  // 从分析结果生成脚本文本
  const generateScriptFromAnalysis = (analysis: any): string => {
    const { shots } = analysis
    if (!shots || shots.length === 0) {
      return ''
    }

    // 生成脚本：每个 shot 的 description + character_action
    const scriptParts = shots.map((shot: any, index: number) => {
      const shotNumber = index + 1
      const description = shot.description || ''
      const action = shot.character_action || ''
      return `Shot ${shotNumber}: ${description}. ${action}`
    })

    return scriptParts.join('\n\n')
  }

  const analyzeYouTubeVideo = async (youtubeUrl: string, imageStyle: ImageStyle) => {
    setIsAnalyzing(true)
    setProgress('Analyzing video content...')

    try {
      // 🔥 步骤1: 调用视频分析 API
      const analysisData = await analyzeVideo({
        videoSource: {
          type: 'youtube',
          url: youtubeUrl
        },
        duration,  // YouTube 模式下会被实际时长覆盖
        storyStyle,
        aspectRatio
      })

      setProgress('Creating project...')

      // 🔥 步骤2: 提取脚本内容并创建项目
      const scriptContent = generateScriptFromAnalysis(analysisData)

      // 🔥 YouTube 模式：默认开启背景音乐，9:16 比例
      // 🔥 确保 duration 有效：优先使用分析结果，其次使用传入参数，最后使用默认值 30
      const validDuration = analysisData.duration || duration || 30
      // 🔥 额外防御：确保 validDuration 是有效数字
      const safeDuration = typeof validDuration === 'number' && !isNaN(validDuration) && isFinite(validDuration)
        ? validDuration
        : 30
      const finalDuration = Math.max(1, Math.min(120, Math.round(safeDuration)))  // 限制在 1-120 秒

      const project = await createProject({
        duration: finalDuration,
        story_style: storyStyle,
        original_script: scriptContent,
        aspect_ratio: '9:16',  // 🔥 默认 9:16
        enable_narration: false,  // 🔥 非旁白模式
        mute_bgm: false,  // 🔥 开启背景音乐（默认使用预设音乐）
        image_style_id: imageStyle  // 🔥 新增：保存用户选择的图片风格
      } as any)

      setProgress('Saving analysis results...')

      // 🔥 步骤3: 直接保存视频分析结果为脚本分析结果（跳过重复分析）
      // YouTube 模式下，视频分析已经完成了分镜脚本的生成，不需要再次调用 analyzeScript
      // ✅ PATCH API 会自动把 script_analysis.shots 保存到 project_shots 表
      console.log('[YouTube Mode] Saving script_analysis to project:', {
        projectId: project.id,
        hasAnalysisData: !!analysisData,
        analysisKeys: analysisData ? Object.keys(analysisData) : null,
        shotsCount: analysisData?.shots?.length || 0,
        duration: analysisData?.duration
      })

      await updateProject(project.id, {
        script_analysis: analysisData,  // 直接使用视频分析结果
        step_1_status: 'completed'
      } as any)

      console.log('[YouTube Mode] ✅ script_analysis saved successfully')

      // 🔥 步骤4: 自动生成角色 Prompts（YouTube 模式）
      if (analysisData.characters && analysisData.characters.length > 0) {
        setProgress('Generating character prompts...')

        try {
          // 调用 character-prompts API 生成角色的 prompts
          const response = await fetch(`/api/video-agent/projects/${project.id}/character-prompts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageStyle })  // 🔥 使用用户选择的风格
          })

          if (response.ok) {
            const { data } = await response.json()
            const characterPrompts = data.characterPrompts || []

            // 将 prompts 保存到数据库
            if (characterPrompts.length > 0) {
              const charactersData = characterPrompts.map((cp: any) => ({
                name: cp.characterName,
                source: 'ai_generate' as const,
                generationPrompt: cp.prompt,
                negativePrompt: cp.negativePrompt
              }))

              const updateCharsResponse = await fetch(`/api/video-agent/projects/${project.id}/characters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characters: charactersData })
              })

              if (!updateCharsResponse.ok) {
                console.warn('[YouTube Mode] Failed to save character prompts, but continuing...')
              }
            }
          } else {
            console.warn('[YouTube Mode] Failed to generate character prompts, but continuing...')
          }
        } catch (charError) {
          console.warn('[YouTube Mode] Character prompt generation failed (non-critical):', charError)
          // 角色 prompt 生成失败不影响主流程，继续执行
        }
      }

      setProgress('Loading project...')

      // 🔥 步骤5: 重新获取完整项目数据（包含分析结果）
      const fullProject = await getProject(project.id)

      showSuccess('Video analyzed successfully!')

      // 🔥 步骤6: 通知完成
      setTimeout(() => {
        // 通知父组件（通过全局事件或其他方式）
        window.dispatchEvent(new CustomEvent('video-agent-project-created', {
          detail: fullProject
        }))

        onComplete(fullProject)
        setIsAnalyzing(false)
        setProgress('')
      }, 500)

    } catch (error: any) {
      console.error('Video analysis error:', error)
      showError(error.message || 'Failed to analyze video')
      setIsAnalyzing(false)
      setProgress('')
      throw error
    }
  }

  return {
    isAnalyzing,
    progress,
    analyzeYouTubeVideo
  }
}
