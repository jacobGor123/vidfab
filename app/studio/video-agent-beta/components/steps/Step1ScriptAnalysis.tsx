/**
 * Step 1: Script Analysis & Optimization
 * AI 分析脚本并生成结构化分镜数据
 */

'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { VideoAgentProject, ScriptAnalysis } from '@/lib/stores/video-agent'
import { Film, Users, Clock, Video, Smile, User, Edit3, Save, X, Trash2, RefreshCw } from 'lucide-react'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'
import { CharacterGenerationSection } from './Step1ScriptAnalysis/CharacterGenerationSection'
import { StoryboardSection } from './Step1ScriptAnalysis/StoryboardSection'
import { StoryboardEditDialog } from './Step1ScriptAnalysis/StoryboardEditDialog'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { emitCreditsUpdated } from '@/lib/events/credits-events'
import type { Shot } from '@/lib/types/video-agent'

interface Step1Props {
  project: VideoAgentProject
  onNext: () => void
  onUpdate: (updates: Partial<VideoAgentProject>) => void
}

export default function Step1ScriptAnalysis({ project, onNext, onUpdate }: Step1Props) {
  const { analyzeScript, updateProject, deleteShot, regenerateStoryboard, composeVideo, getProject } = useVideoAgentAPI()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<ScriptAnalysis | null>(
    project.script_analysis || null
  )
  const [error, setError] = useState<string | null>(null)
  const [hasStarted, setHasStarted] = useState(false) // 防止重复触发
  const [deletingShot, setDeletingShot] = useState<number | null>(null) // 正在删除的分镜
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false) // 删除确认弹框
  const [shotToDelete, setShotToDelete] = useState<number | null>(null) // 待删除的分镜编号
  const [characterStatus, setCharacterStatus] = useState<'idle' | 'generating' | 'completed' | 'failed'>('idle') // 人物生成状态
  const [storyboardStatus, setStoryboardStatus] = useState<'idle' | 'generating' | 'completed' | 'failed'>('idle') // 分镜生成状态
  const [videoCanProceed, setVideoCanProceed] = useState(false) // 🆕 视频是否全部生成完成
  const [editDialogOpen, setEditDialogOpen] = useState(false) // 编辑弹框开关
  const [reanalyzeConfirmOpen, setReanalyzeConfirmOpen] = useState(false) // 🔥 重新分析确认弹框
  const [editingShotNumber, setEditingShotNumber] = useState<number | null>(null) // 当前编辑的分镜编号

  // 首次渲染分镜卡片数量限制：避免 analysis 返回后一次性渲染过多 DOM 导致卡顿
  const INITIAL_RENDER_SHOTS = 12
  const RENDER_BATCH = 12
  const [visibleShotCount, setVisibleShotCount] = useState(INITIAL_RENDER_SHOTS)

  // 当拿到新的 analysis 时重置可见数量（也能覆盖"恢复草稿"场景）
  useEffect(() => {
    if (!analysis || !Array.isArray(analysis.shots)) return
    setVisibleShotCount(Math.min(INITIAL_RENDER_SHOTS, analysis.shots.length))
  }, [analysis])

  const visibleShots = useMemo(() => {
    if (!analysis || !Array.isArray(analysis.shots)) return []
    return analysis.shots.slice(0, visibleShotCount)
  }, [analysis, visibleShotCount])

  // “滚动接近底部自动加载更多”——比纯按钮更顺滑，但依然简单可控
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    if (!analysis) return

    const onScroll = () => {
      if (!analysis || !Array.isArray(analysis.shots)) return
      if (visibleShotCount >= analysis.shots.length) return

      const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      if (distanceToBottom < 800) {
        setVisibleShotCount((prev) => Math.min(prev + RENDER_BATCH, analysis.shots.length))
      }
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [analysis, visibleShotCount])

  // 🔥 编辑状态管理
  const [editedShots, setEditedShots] = useState<Record<number, {
    description?: string
    video_prompt?: string
  }>>({}) // 记录修改的分镜字段（camera_angle/mood 已移除）
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false) // 是否有未保存的修改
  const [isSaving, setIsSaving] = useState(false) // 是否正在保存

  // 🔥 使用 useRef 防止竞态条件
  const isAnalyzingRef = useRef(false)

  const handleAnalyze = async (force = false) => {
    if (isAnalyzingRef.current || (hasStarted && !force)) {
      return
    }

    isAnalyzingRef.current = true
    setHasStarted(true)
    setIsAnalyzing(true)
    setError(null)

    try {
      // 🔥 Pass 'force' flag to backend to bypass cache
      const data = await analyzeScript(project.id, force)
      setAnalysis(data)
      onUpdate({ script_analysis: data })
    } catch (err: any) {
      console.error('[Step1] Script analysis failed:', err.message)
      setError(err.message)
      setHasStarted(false)
      isAnalyzingRef.current = false
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 🔥 重新分析脚本（处理错误数据或不满意结果） - 触发弹框
  const handleReanalyze = () => {
    if (isAnalyzingRef.current) return
    setReanalyzeConfirmOpen(true)
  }

  // 🔥 确认重新分析
  const confirmReanalyze = async () => {
    setReanalyzeConfirmOpen(false)
    setAnalysis(null)
    setError(null)
    setHasStarted(false)
    // 强制重新分析
    await handleAnalyze(true)
  }

  useEffect(() => {
    if (project.script_analysis) {
      setAnalysis(project.script_analysis)
      setHasStarted(true)
      isAnalyzingRef.current = false
      return
    }

    if (isAnalyzingRef.current || hasStarted) {
      return
    }

    handleAnalyze()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.script_analysis, project.id])

  // 🔥 处理字段修改（通用函数）
  const handleFieldChange = (shotNumber: number, field: 'description', value: string) => {
    setEditedShots(prev => ({
      ...prev,
      [shotNumber]: {
        ...prev[shotNumber],
        [field]: value
      }
    }))
    setHasUnsavedChanges(true)
  }

  // 🔥 保存修改后的分镜
  const handleSaveChanges = async () => {
    if (!analysis || !Array.isArray(analysis.shots) || Object.keys(editedShots).length === 0) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // 创建更新后的 shots 数组
      const updatedShots = analysis.shots.map(shot => {
        const edits = editedShots[shot.shot_number]
        if (edits) {
          return {
            ...shot,
            // 🔥 使用 !== undefined 而不是 && 来允许保存空字符串
            ...(edits.description !== undefined && { description: edits.description }),
            ...(edits.video_prompt !== undefined && { video_prompt: edits.video_prompt })
          }
        }
        return shot
      })

      // 更新 analysis 对象
      const updatedAnalysis = {
        ...analysis,
        shots: updatedShots
      }

      // 保存到数据库
      await updateProject(project.id, {
        script_analysis: updatedAnalysis
      })

      // 更新本地状态
      setAnalysis(updatedAnalysis)
      onUpdate({ script_analysis: updatedAnalysis })
      setEditedShots({})
      setHasUnsavedChanges(false)

      console.log('[Step1] Changes saved successfully')
    } catch (err: any) {
      setError(err.message || 'Failed to save changes')
      console.error('[Step1] Save failed:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // 🔥 取消修改
  const handleCancelChanges = () => {
    setEditedShots({})
    setHasUnsavedChanges(false)
  }

  // 🔥 获取字段值（优先使用编辑后的）
  const getFieldValue = (shotNumber: number, field: 'description', originalValue: string) => {
    const edits = editedShots[shotNumber]
    return edits?.[field] ?? originalValue
  }

  // 🔥 添加新分镜
  const MAX_SHOTS = 40  // 分镜数量上限
  const [isAddingShot, setIsAddingShot] = useState(false)

  const handleAddShot = async () => {
    if (!analysis || !Array.isArray(analysis.shots) || isAddingShot) return

    // 检查是否已达到分镜数量上限
    if (analysis.shots.length >= MAX_SHOTS) {
      setError(`Cannot add more shots. Maximum ${MAX_SHOTS} shots allowed.`)
      return
    }

    setIsAddingShot(true)
    setError(null)

    try {
      // 计算新的 shot_number (当前最大值 + 1)
      const maxShotNumber = Math.max(...analysis.shots.map(s => s.shot_number))
      const newShotNumber = maxShotNumber + 1

      // 创建新的 shot 数据
      const newShot = {
        shot_number: newShotNumber,
        time_range: '',
        description: 'New shot - describe the scene here',
        character_action: '',
        duration_seconds: 5,
        characters: [],
        video_prompt: ''
      }

      // 更新本地 analysis
      const updatedShots = [...analysis.shots, newShot]
      const updatedAnalysis = {
        ...analysis,
        shots: updatedShots,
        shot_count: updatedShots.length
      }

      // 🔥 立即保存到数据库
      await updateProject(project.id, {
        script_analysis: updatedAnalysis
      })

      setAnalysis(updatedAnalysis)
      onUpdate({ script_analysis: updatedAnalysis })

      console.log('[Step1] New shot added:', newShotNumber)
    } catch (err: any) {
      setError(err.message || 'Failed to add shot')
      console.error('[Step1] Add shot failed:', err)
    } finally {
      setIsAddingShot(false)
    }
  }

  // 检查是否可以添加分镜
  const canAddShot = analysis && Array.isArray(analysis.shots) ? analysis.shots.length < MAX_SHOTS : false

  // 🔥 请求删除分镜（显示确认弹框）
  const requestDeleteShot = (shotNumber: number) => {
    if (!analysis || !Array.isArray(analysis.shots) || deletingShot !== null) {
      return
    }

    // 如果只剩一个分镜，不允许删除
    if (analysis.shots.length === 1) {
      setError('Cannot delete the last shot. At least one shot is required.')
      return
    }

    // 打开确认弹框
    setShotToDelete(shotNumber)
    setDeleteConfirmOpen(true)
  }

  // 🔥 确认删除分镜（实际执行删除）
  const confirmDeleteShot = async () => {
    if (!analysis || !shotToDelete) {
      return
    }

    setDeleteConfirmOpen(false)
    setDeletingShot(shotToDelete)
    setError(null)

    try {
      // 调用删除 API
      const result = await deleteShot(project.id, shotToDelete)

      console.log('[Step1] Shot deleted:', result)

      // 🔥 重新获取完整的项目数据，因为后端已经重新计算了 duration 和 time_range
      // 不要手动构建，而是从API获取最新数据
      const response = await fetch(`/api/video-agent/projects/${project.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch updated project data')
      }

      const { data: updatedProject } = await response.json()
      const updatedAnalysis = updatedProject.script_analysis

      setAnalysis(updatedAnalysis)
      onUpdate({
        script_analysis: updatedAnalysis
        // 🔥 不清空storyboards，让Step3的轮询机制自动同步最新状态
        // 后端已经删除了对应的storyboard记录并重新编号，pollStatus会获取正确的数据
      })

      // 清除所有编辑状态（因为 shot_number 已经改变）
      setEditedShots({})
      setHasUnsavedChanges(false)

      console.log('[Step1] Local state updated after deletion')
    } catch (err: any) {
      setError(err.message || 'Failed to delete shot')
      console.error('[Step1] Delete shot failed:', err)
    } finally {
      setDeletingShot(null)
      setShotToDelete(null)
    }
  }

  // 🔥 取消删除分镜
  const cancelDeleteShot = () => {
    setDeleteConfirmOpen(false)
    setShotToDelete(null)
  }

  const handleConfirm = async () => {
    // 如果有未保存的修改，先保存
    if (hasUnsavedChanges) {
      await handleSaveChanges()
    }

    // New flow: once storyboards + videos are ready, immediately start composition.
    // We rely on Step6 polling UI for progress/result.
    try {
      await composeVideo(project.id)
    } catch (err: any) {
      // If compose cannot start (e.g. videos not ready), surface the error and stay on this screen.
      setError(err?.message || 'Failed to start composition')
      return
    }

    onNext()
  }

  // 判断是否显示集成功能（人物生成+分镜生成）
  const shouldShowIntegratedFeatures = useMemo(() => {
    const cutoffDate = new Date('2026-01-10T00:00:00Z')
    const createdAt = new Date(project.created_at)
    return createdAt >= cutoffDate
  }, [project.created_at])

  // 🔥 处理编辑分镜点击
  const handleEditClick = (shotNumber: number) => {
    setEditingShotNumber(shotNumber)
    setEditDialogOpen(true)
  }

  // 🔥 处理重新生成分镜
  const handleRegenerateStoryboard = async (
    shotNumber: number,
    prompt: string,
    characterNames: string[],
    characterIds: string[]
  ) => {
    try {
      // 🔥 Immediate UI sync: update the local analysis (and store) right away so the left description
      // and the right default video prompt reflect the newly used regenerate prompt without waiting
      // for any async field-extraction/network calls.
      if (analysis && Array.isArray(analysis.shots)) {
        const oldShot = analysis.shots.find(s => s.shot_number === shotNumber)
        const nextAnalysis: ScriptAnalysis = {
          ...analysis,
          shots: analysis.shots.map(s =>
            s.shot_number === shotNumber
              ? {
                ...s,
                characters: characterNames,
                description: prompt,
                // We no longer treat video_prompt as an editable/source-of-truth field in the unified flow.
                // Keep description as the source of truth; prompt composition will stitch in character_action.
                // Preserve other fields unless the user explicitly edits them elsewhere.
                camera_angle: s.camera_angle,
                character_action: s.character_action,
                mood: s.mood,
                // Keep any legacy text replacements for character name swaps (if present).
                ...(oldShot
                  ? (() => {
                    // camera_angle/mood are no longer user-editable; keep no-op list for legacy name-swap compat.
                    const fields: Array<keyof Pick<Shot, 'camera_angle' | 'mood'>> = []

                    const escapeRe = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    const replacements: Array<[RegExp, string]> = []

                      ; (oldShot.characters || []).forEach((oldName, idx) => {
                        const newName = characterNames[idx]
                        if (!oldName || !newName || oldName === newName) return
                        replacements.push([new RegExp(`\\b${escapeRe(String(oldName))}\\b`, 'gi'), String(newName)])
                      })

                    const apply = (text: any) => {
                      if (typeof text !== 'string') return text
                      return replacements.reduce((acc, [re, rep]) => acc.replace(re, rep), text)
                    }

                    const patch: any = {}
                    fields.forEach(f => {
                      patch[f] = apply((s as any)[f])
                    })
                    return patch
                  })()
                  : {})
              }
              : s
          )
        }

        setAnalysis(nextAnalysis)
        onUpdate({ script_analysis: nextAnalysis })
      }

      // 调用重新生成 API，直接返回新 storyboard 记录（避免冗余 GET）
      const regenResult = await regenerateStoryboard(project.id, {
        shotNumber: shotNumber,
        customPrompt: prompt,
        selectedCharacterNames: characterNames,
        selectedCharacterIds: characterIds,
        fieldsUpdate: {
          description: prompt,
        } as any
      })

      // ✅ 立即触发积分更新事件，实时刷新右上角显示
      emitCreditsUpdated('video-agent-storyboard-regenerated-step1')

      // 用 API 直接返回的新 storyboard 更新状态，不再额外 GET 整个项目
      if (regenResult?.storyboard) {
        const newStoryboard = {
          ...regenResult.storyboard,
          // 优先使用 CDN URL，降级到 external URL，再降级到 image_url
          image_url: regenResult.storyboard.cdn_url
            || regenResult.storyboard.image_url_external
            || regenResult.storyboard.image_url
        }
        onUpdate({
          storyboards: [
            newStoryboard,
            ...(project.storyboards || []).filter(
              (sb: any) => sb.shot_number !== shotNumber
            )
          ]
        })
      }
    } catch (error: any) {
      console.error('[Step1] Regenerate storyboard failed:', error)
      throw error
    }
  }

  // 🔥 处理版本切换（刷新项目数据以更新外层预览图）
  const handleVersionSwitched = async () => {
    try {
      console.log('[Step1] Refreshing project data after version switch...')

      // 重新获取项目数据
      const updatedProject = await getProject(project.id) as any

      // 更新本地状态（包括 storyboards）
      onUpdate({
        storyboards: [...((updatedProject as any).storyboards || [])],
        // 也可以更新其他字段，如果 API 返回了完整数据
        characters: (updatedProject as any).characters,
      } as any)

      console.log('[Step1] Project data refreshed successfully')
    } catch (error: any) {
      console.error('[Step1] Failed to refresh project data:', error)
    }
  }

  // Analyzing State
  if (isAnalyzing && !analysis) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-blue-400">
              <Film className="w-8 h-8 animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Analyzing Script...</h3>
            <p className="text-slate-400 max-w-sm mx-auto">
              Our AI is breaking down your story into shots, identifying characters, and planning the visual flow.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Error State
  if (error && !analysis) {
    return (
      <div className="space-y-6">
        <div className="text-center py-20 px-6 bg-red-500/5 border border-red-500/20 rounded-2xl">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-500/10 rounded-full text-red-400">
              <Film className="w-8 h-8" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-red-400 mb-2">Analysis Failed</h3>
          <p className="text-red-300/70 mb-8 max-w-md mx-auto">
            {error}
          </p>
          <Button onClick={() => {
            setError(null)
            setHasStarted(false)
            handleAnalyze()
          }} variant="outline" className="border-red-500/30 hover:bg-red-500/10 text-red-300">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Loading Initial
  if (!analysis) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-500">
        <span className="animate-pulse">Preparing workspace...</span>
      </div>
    )
  }

  return (
    <div
      ref={scrollContainerRef}
      className="p-8 pb-0 animate-in fade-in slide-in-from-bottom-4 duration-700"
    >
      {/* 1. Header & Actions - 响应式布局 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between px-1 pb-8">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">Script Analysis</h2>
          <p className="text-slate-400 text-sm mt-1">Review the AI-generated breakdown of your script.</p>
        </div>
        <Button
          onClick={handleReanalyze}
          variant="outline"
          size="sm"
          disabled={isAnalyzing}
          className="border-slate-700 hover:bg-slate-800 text-slate-300 gap-2 w-full sm:w-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
          Re-analyze Script
        </Button>
      </div>

      {/* 1. Analysis Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-8">
        {/* CHARACTERS */}
        <div
          className="px-6 py-3 rounded-xl relative overflow-hidden flex items-center justify-between"
          style={{
            background: 'rgba(59, 47, 97, 0.3)',
            border: '2px solid rgba(123, 92, 255, 0.4)'
          }}
        >
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6" style={{ color: '#7B7AFF' }} />
            <span className="text-sm font-medium uppercase tracking-wider text-white/60">Characters</span>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{analysis?.characters.length}</div>
        </div>

        {/* TOTAL SHOTS */}
        <div
          className="px-6 py-3 rounded-xl relative overflow-hidden flex items-center justify-between"
          style={{
            background: 'rgba(75, 47, 97, 0.3)',
            border: '2px solid rgba(147, 92, 255, 0.4)'
          }}
        >
          <div className="flex items-center gap-3">
            <Video className="w-6 h-6" style={{ color: '#9B7AFF' }} />
            <span className="text-sm font-medium uppercase tracking-wider text-white/60">Total Shots</span>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{analysis?.shot_count}</div>
        </div>

        {/* EST. DURATION */}
        <div
          className="px-6 py-3 rounded-xl relative overflow-hidden flex items-center justify-between"
          style={{
            background: 'rgba(30, 60, 50, 0.3)',
            border: '2px solid rgba(34, 197, 94, 0.4)'
          }}
        >
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6" style={{ color: '#22C55E' }} />
            <span className="text-sm font-medium uppercase tracking-wider text-white/60">Est. Duration</span>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{analysis?.duration}s</div>
        </div>
      </div>

      {/* 🔥 新增：人物生成区域（只对新项目显示） */}
      {shouldShowIntegratedFeatures && analysis && (
        <CharacterGenerationSection
          project={project}
          analysis={analysis}
          onStatusChange={setCharacterStatus}
          onUpdate={onUpdate}
        />
      )}

      {/* 🔥 新增：分镜生成区域（只对新项目显示，且需等待人物生成完成） */}
      {shouldShowIntegratedFeatures && analysis && characterStatus === 'completed' && (
        <StoryboardSection
          project={project}
          analysis={analysis}
          onStatusChange={setStoryboardStatus}
          onUpdate={onUpdate}
          onEditClick={handleEditClick}
          onFieldChange={handleFieldChange}
          getFieldValue={getFieldValue}
          onDeleteShot={requestDeleteShot}
          onAddShot={canAddShot ? handleAddShot : undefined}
          onVideoStatusChange={setVideoCanProceed}
        />
      )}

      {/* 2. Storyboard Cards（旧项目保留） */}
      {!shouldShowIntegratedFeatures && (
        <div>
          <div>
            <div className="flex items-center justify-between mb-6 px-1">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-slate-400" />
                <span>Storyboard Breakdown</span>
              </h3>

              {/* 🔥 保存/取消按钮 */}
              {hasUnsavedChanges && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleCancelChanges}
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    {isSaving ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {visibleShots.map((shot) => (
                <div
                  key={shot.shot_number}
                  className="group relative bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-8 transition-all duration-300"
                >
                  {/* 🔥 删除按钮 */}
                  <button
                    onClick={() => requestDeleteShot(shot.shot_number)}
                    disabled={deletingShot !== null}
                    className="absolute top-4 right-4 p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete this shot"
                  >
                    {deletingShot === shot.shot_number ? (
                      <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>

                  <div className="flex gap-8">
                    {/* Shot Number Column - Clean Style */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-4 pt-1">
                      <div className="text-3xl font-bold text-slate-600 group-hover:text-blue-500 transition-colors font-mono">
                        {shot.shot_number.toString().padStart(2, '0')}
                      </div>
                      {/* Vertical Line */}
                      <div className="w-px h-full bg-gradient-to-b from-slate-800 to-transparent group-hover:from-blue-500/20" />
                    </div>

                    {/* Content Column */}
                    <div className="flex-1 space-y-5">
                      <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                        <span className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-950/50 border border-slate-800">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-300">{shot.time_range}</span>
                        </span>
                      </div>

                      {/* 🔥 可编辑的分镜描述 */}
                      <Textarea
                        value={getFieldValue(shot.shot_number, 'description', shot.description)}
                        onChange={(e) => handleFieldChange(shot.shot_number, 'description', e.target.value)}
                        className="text-lg text-slate-200 leading-relaxed font-light tracking-wide bg-slate-900/50 border-slate-700/50 focus:border-blue-500/50 resize-none min-h-[80px]"
                        placeholder="Describe this shot..."
                      />

                      {/* camera_angle / mood removed */}

                      {/* 角色信息（只读） */}
                      {shot.characters && shot.characters.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs font-bold text-slate-400 uppercase tracking-wide">
                            <Users className="w-3.5 h-3.5" />
                            {shot.characters.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 分批渲染：先让首屏可交互，再逐步加载更多分镜 */}
            {analysis && Array.isArray(analysis.shots) && visibleShotCount < analysis.shots.length && (
              <div className="pt-4 flex justify-center">
                <Button
                  onClick={() =>
                    setVisibleShotCount((prev) =>
                      Math.min(prev + RENDER_BATCH, analysis.shots.length)
                    )
                  }
                  variant="outline"
                  className="border-white/10 text-slate-200 hover:bg-white/5"
                >
                  Load More ({visibleShotCount}/{analysis.shots.length})
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Action */}
      <div className="sticky bottom-0 -mb-6 p-6 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-8 pb-8 z-10">
        {/* 🔥 提示：有未保存修改时显示提醒 */}
        {hasUnsavedChanges && (
          <div className="flex justify-center mb-3">
            <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Your changes will be automatically saved when you continue</span>
            </div>
          </div>
        )}
        <div className="flex justify-center">
          <Button
            onClick={handleConfirm}
            disabled={shouldShowIntegratedFeatures && (!videoCanProceed)}
            size="lg"
            className={cn(
              "h-14 px-12 text-white font-bold text-lg transition-all rounded-xl",
              shouldShowIntegratedFeatures && !videoCanProceed
                ? "bg-gradient-disabled cursor-not-allowed"
                : "bg-gradient-primary shadow-glow-primary"
            )}
          >
            Combine Video Clips
          </Button>
        </div>
      </div>

      {/* 🔥 分镜编辑对话框 */}
      <StoryboardEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project}
        shotNumber={editingShotNumber}
        onRegenerate={handleRegenerateStoryboard}
        onVersionSwitched={handleVersionSwitched}
      />

      {/* 🔥 删除确认对话框 */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Shot {shotToDelete}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will delete Shot {shotToDelete} and all related storyboards and videos. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={cancelDeleteShot}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteShot}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 🔥 重新分析确认对话框 */}
      <AlertDialog open={reanalyzeConfirmOpen} onOpenChange={setReanalyzeConfirmOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Re-analyze Script?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will discard all current shots and generate a fresh analysis from your script.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReanalyze}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Confirm Re-analyze
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  )
}
