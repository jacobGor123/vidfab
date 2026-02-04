/**
 * useVideoGenerationIntegrated Hook
 *
 * 集成版视频生成 Hook - 在 Step 1 中使用
 * 
 * 功能：
 * 1. 批量生成所有视频
 * 2. 单个生成/重新生成视频
 * 3. 轮询获取生成状态
 * 4. 管理自定义 Prompt
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'
import { showSuccess, showError, showLoading, showInfo } from '@/lib/utils/toast'
import type { VideoAgentProject, VideoClip, ScriptAnalysis } from '@/lib/stores/video-agent'

interface UseVideoGenerationIntegratedProps {
    project: VideoAgentProject
    analysis: ScriptAnalysis
    onUpdate: (updates: Partial<VideoAgentProject>) => void
}

interface UseVideoGenerationIntegratedReturn {
    // 状态
    videoClips: Record<number, VideoClip>
    customPrompts: Record<number, string>
    isGenerating: boolean
    generatingShots: Set<number>

    // 动作
    generateSingleVideo: (shotNumber: number, prompt: string, duration?: number) => Promise<void>  // 🔥 添加 duration 参数
    generateAllVideos: () => Promise<void>
    updateCustomPrompt: (shotNumber: number, characterAction: string) => void
    stopGeneration: () => void  // 🔥 新增：手动停止轮询

    // 统计
    stats: {
        total: number
        completed: number
        generating: number
        failed: number
        pending: number
    }

    // 是否可以继续下一步
    canProceed: boolean

    // 🔥 新增：轮询耗时（秒）
    elapsedSeconds: number
}

export function useVideoGenerationIntegrated({
    project,
    analysis,
    onUpdate
}: UseVideoGenerationIntegratedProps): UseVideoGenerationIntegratedReturn {
    const { generateVideos, retryVideo, getVideosStatus, patchShot } = useVideoAgentAPI()

    // 从 project 初始化视频状态
    const initialClips: Record<number, VideoClip> = {}
    if (Array.isArray(project.video_clips)) {
        project.video_clips.forEach(clip => {
            initialClips[clip.shot_number] = clip
        })
    }

    const [videoClips, setVideoClips] = useState<Record<number, VideoClip>>(initialClips)
    const [customPrompts, setCustomPrompts] = useState<Record<number, string>>({})
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatingShots, setGeneratingShots] = useState<Set<number>>(new Set())
    const [elapsedSeconds, setElapsedSeconds] = useState(0)

    // 轮询相关
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const lastPollSignatureRef = useRef<string>('')
    const isGeneratingRef = useRef(isGenerating)
    const pollStartTimeRef = useRef<number | null>(null)
    const pollCountRef = useRef(0)
    const hasShownLongWaitWarningRef = useRef(false)
    const hasShownVeryLongWaitWarningRef = useRef(false)

    // 超时配置
    const POLL_TIMEOUT_MS = 900000 // 15 分钟
    const MAX_POLL_COUNT = 450 // 最大轮询次数（15分钟 / 2秒 = 450次）

    // 同步 ref
    useEffect(() => {
        isGeneratingRef.current = isGenerating
    }, [isGenerating])

    // 同步 project.video_clips 到本地状态
    useEffect(() => {
        if (!project.video_clips || !Array.isArray(project.video_clips)) return

        const newClips: Record<number, VideoClip> = {}
        project.video_clips.forEach(clip => {
            newClips[clip.shot_number] = clip
        })

        setVideoClips(prev => {
            // 检查是否有变化
            const prevKey = Object.entries(prev).map(([k, v]) => `${k}:${v.status}:${v.video_url || ''}`).sort().join('|')
            const newKey = Object.entries(newClips).map(([k, v]) => `${k}:${v.status}:${v.video_url || ''}`).sort().join('|')
            if (prevKey === newKey) return prev
            return { ...prev, ...newClips }
        })
    }, [project.video_clips])

    // 计算统计数据
    // Use the actual shots array length if available, as shot_count metadata might be stale
    const totalShots = analysis?.shots?.length || analysis?.shot_count || 0
    const clipsArray = Object.values(videoClips)
    const completed = clipsArray.filter(c => c.status === 'success').length
    const generating = clipsArray.filter(c => c.status === 'generating').length
    const failed = clipsArray.filter(c => c.status === 'failed').length
    const pending = totalShots - completed - generating - failed

    // 是否可以继续：所有视频都完成（成功或失败后重新成功）
    // Allow proceed if all shots are processed (success OR failed), or if we have at least one success and nothing is currently generating
    const canProceed = totalShots > 0 && (completed + failed === totalShots || (completed > 0 && generating === 0 && pending === 0))

    // 清理轮询
    const clearPoll = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
        }
        pollStartTimeRef.current = null
        pollCountRef.current = 0
        hasShownLongWaitWarningRef.current = false
        hasShownVeryLongWaitWarningRef.current = false
    }, [])

    // 轮询状态
    const pollStatus = useCallback(async () => {
        if (!project.id) return

        // 🔥 超时保护：检查轮询时长和次数
        pollCountRef.current += 1

        if (pollStartTimeRef.current) {
            const elapsed = Date.now() - pollStartTimeRef.current
            if (elapsed > POLL_TIMEOUT_MS) {
                console.warn('[VideoGenIntegrated] ⏱️ Polling timeout (15 minutes), stopping...')
                showError('Video generation timeout. Please check the status later.')
                setIsGenerating(false)
                clearPoll()
                return
            }
        }

        if (pollCountRef.current > MAX_POLL_COUNT) {
            console.warn('[VideoGenIntegrated] ⏱️ Max poll count reached, stopping...')
            showError('Maximum polling attempts reached. Please refresh the page.')
            setIsGenerating(false)
            clearPoll()
            return
        }

        try {
            const data = await getVideosStatus(project.id)

            if (!data || !Array.isArray(data)) return

            // 🔥 优化：只在状态真正变化时跳过 UI 更新，但始终执行停止检查
            const signature = data
                .map((clip: any) => `${clip?.shot_number}:${clip?.status}:${clip?.updated_at || ''}`)
                .join('|')

            const hasChange = signature !== lastPollSignatureRef.current

            if (hasChange) {
                lastPollSignatureRef.current = signature

                // 更新本地状态
                const newClips: Record<number, VideoClip> = {}
                data.forEach((clip: VideoClip) => {
                    newClips[clip.shot_number] = clip
                })
                setVideoClips(newClips)

                // 更新生成中的 shots
                const currentGenerating = new Set<number>()
                data.forEach((clip: VideoClip) => {
                    if (clip.status === 'generating') {
                        currentGenerating.add(clip.shot_number)
                    }
                })
                setGeneratingShots(currentGenerating)

                // 同步到 project
                onUpdate({ video_clips: data })
            }

            // 🔥 关键修复：无论 signature 是否变化，都要检查是否应该停止轮询
            const hasGenerating = data.some((c: VideoClip) => c.status === 'generating')

            // 🔥 详细日志：显示当前轮询状态
            const elapsed = pollStartTimeRef.current
                ? Math.floor((Date.now() - pollStartTimeRef.current) / 1000)
                : 0

            // 🔥 更新已用时间
            setElapsedSeconds(elapsed)

            if (pollCountRef.current % 10 === 0) {
                // 每 10 次轮询（20 秒）打印一次状态
                console.log(`[VideoGenIntegrated] 📊 Poll #${pollCountRef.current} (${elapsed}s):`, {
                    totalClips: data.length,
                    generating: data.filter((c: VideoClip) => c.status === 'generating').length,
                    completed: data.filter((c: VideoClip) => c.status === 'success').length,
                    failed: data.filter((c: VideoClip) => c.status === 'failed').length,
                    clips: data.map((c: VideoClip) => ({
                        shot: c.shot_number,
                        status: c.status
                    }))
                })
            }

            // 🔥 友好提示：如果生成时间过长（5分钟），给用户一个提示
            if (elapsed >= 300 && !hasShownLongWaitWarningRef.current && hasGenerating) {
                hasShownLongWaitWarningRef.current = true
                showInfo('Video generation is taking longer than expected. Please be patient...', 5000)
            }

            // 🔥 友好提示：如果生成时间很长（10分钟），再次提示
            if (elapsed >= 600 && !hasShownVeryLongWaitWarningRef.current && hasGenerating) {
                hasShownVeryLongWaitWarningRef.current = true
                showInfo('Video generation is still in progress. This may take a few more minutes...', 5000)
            }

            if (!hasGenerating && isGeneratingRef.current) {
                console.log('[VideoGenIntegrated] ✅ All videos completed, stopping poll')
                setIsGenerating(false)
                clearPoll()
            }
        } catch (error) {
            console.error('[VideoGenIntegrated] Poll failed:', error)
        }
    }, [project.id, getVideosStatus, onUpdate, clearPoll])

    // 启动轮询
    const startPolling = useCallback(() => {
        clearPoll()
        setIsGenerating(true)
        // 🔥 初始化计时器
        pollStartTimeRef.current = Date.now()
        pollCountRef.current = 0
        pollIntervalRef.current = setInterval(pollStatus, 2000)
        // 立即执行一次
        pollStatus()
    }, [clearPoll, pollStatus])

    // 批量生成所有视频
    const generateAllVideos = useCallback(async () => {
        if (isGenerating) {
            showError('Video generation already in progress')
            return
        }

        const dismissLoading = showLoading('Starting video generation...')

        try {
            // 🔥 调用批量生成 API（会自动跳过已成功的）
            await generateVideos(project.id)

            dismissLoading()
            showSuccess('Video generation started')

            // 开始轮询
            startPolling()
        } catch (error: any) {
            dismissLoading()
            console.error('[VideoGenIntegrated] Batch generate failed:', error)
            showError(error.message || 'Failed to start video generation')
        }
    }, [project.id, isGenerating, generateVideos, startPolling])

    // 单个生成视频
    // Unified flow: the editable field is character_action (prompt arg), and we build the final prompt
    // by combining shot.description + character_action so the backend gets consistent inputs.
    const generateSingleVideo = useCallback(async (shotNumber: number, prompt: string, duration?: number) => {  // 🔥 添加 duration 参数
        if (generatingShots.has(shotNumber)) {
            showError('This video is already generating')
            return
        }

        const shot = Array.isArray(analysis?.shots)
            ? analysis.shots.find(s => s.shot_number === shotNumber)
            : undefined
        const description = String(shot?.description || '').trim()
        const action = String(prompt || '').trim()

        // Build the JSON-mode payload expected by the retry endpoint.
        // This keeps backward-compat while ensuring character_action is integrated.
        const customPrompt = JSON.stringify({
            description,
            character_action: action,
            duration_seconds: duration || shot?.duration_seconds || 5  // 🔥 添加 duration_seconds
        })

        // 更新本地状态为 generating
        setVideoClips(prev => ({
            ...prev,
            [shotNumber]: {
                ...prev[shotNumber],
                shot_number: shotNumber,
                status: 'generating',
                error_message: undefined
            }
        }))
        setGeneratingShots(prev => new Set(prev).add(shotNumber))

        const dismissLoading = showLoading(`Generating video ${shotNumber}...`)

        try {
            // 调用重试/生成 API
            await retryVideo(project.id, {
                shotNumber,
                customPrompt
            })

            dismissLoading()
            showSuccess(`Video ${shotNumber} generation started`)

            // 开始轮询（如果还没开始）
            if (!isGeneratingRef.current) {
                startPolling()
            }
        } catch (error: any) {
            dismissLoading()
            console.error('[VideoGenIntegrated] Single generate failed:', error)
            showError(error.message || 'Failed to generate video')

            // 更新状态为失败
            setVideoClips(prev => ({
                ...prev,
                [shotNumber]: {
                    ...prev[shotNumber],
                    status: 'failed',
                    error_message: error.message
                }
            }))
            setGeneratingShots(prev => {
                const next = new Set(prev)
                next.delete(shotNumber)
                return next
            })
        }
    }, [project.id, generatingShots, retryVideo, startPolling, analysis])

    // 更新自定义 Prompt（并防抖持久化到 project_shots.character_action）
    const saveTimersRef = useRef<Record<number, any>>({})
    const updateCustomPrompt = useCallback((shotNumber: number, characterAction: string) => {
        setCustomPrompts(prev => ({
            ...prev,
            [shotNumber]: characterAction
        }))

        // Debounce persistence: keep DB shot inputs aligned with what the user typed.
        // This ensures refreshes and later character replacements operate on the latest action.
        const prevTimer = saveTimersRef.current[shotNumber]
        if (prevTimer) clearTimeout(prevTimer)
        saveTimersRef.current[shotNumber] = setTimeout(() => {
            void patchShot(project.id, shotNumber, { character_action: characterAction })
                .catch((err: any) => {
                    console.warn('[VideoGenIntegrated] Failed to persist character_action:', {
                        shotNumber,
                        err: err?.message || err
                    })
                })
        }, 500)
    }, [patchShot, project.id])

    // 🔥 手动停止生成
    const stopGeneration = useCallback(() => {
        console.log('[VideoGenIntegrated] 🛑 Manual stop requested')
        setIsGenerating(false)
        clearPoll()
        showInfo('Video generation stopped manually', 3000)
    }, [clearPoll])

    // 组件卸载时清理
    useEffect(() => {
        return () => {
            clearPoll()
        }
    }, [clearPoll])

    // 页面加载时，如果有正在生成的视频，自动开始轮询
    // 使用 ref 确保只执行一次
    const hasInitializedRef = useRef(false)
    useEffect(() => {
        if (hasInitializedRef.current) return

        const hasGenerating = Object.values(videoClips).some(c => c.status === 'generating')
        if (hasGenerating && !isGenerating) {
            hasInitializedRef.current = true
            console.log('[VideoGenIntegrated] Found generating videos, starting poll')
            startPolling()
        }
    }, [videoClips, isGenerating, startPolling])

    return {
        videoClips,
        customPrompts,
        isGenerating,
        generatingShots,
        generateSingleVideo,
        generateAllVideos,
        updateCustomPrompt,
        stopGeneration,  // 🔥 新增
        stats: {
            total: totalShots,
            completed,
            generating,
            failed,
            pending
        },
        canProceed,
        elapsedSeconds  // 🔥 新增
    }
}
