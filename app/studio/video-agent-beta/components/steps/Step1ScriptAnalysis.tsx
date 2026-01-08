/**
 * Step 1: Script Analysis & Optimization
 * AI 分析脚本并生成结构化分镜数据
 */

'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { VideoAgentProject, ScriptAnalysis } from '@/lib/stores/video-agent'
import { Film, Users, Clock, Video, Smile, User, Edit3, Save, X, Trash2 } from 'lucide-react'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'
import { showConfirm } from '@/lib/utils/toast'

interface Step1Props {
  project: VideoAgentProject
  onNext: () => void
  onUpdate: (updates: Partial<VideoAgentProject>) => void
}

export default function Step1ScriptAnalysis({ project, onNext, onUpdate }: Step1Props) {
  const { analyzeScript, updateProject, deleteShot } = useVideoAgentAPI()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<ScriptAnalysis | null>(
    project.script_analysis || null
  )
  const [error, setError] = useState<string | null>(null)
  const [hasStarted, setHasStarted] = useState(false) // 防止重复触发
  const [deletingShot, setDeletingShot] = useState<number | null>(null) // 正在删除的分镜

  // 性能观测：分析请求 + 首次渲染耗时
  const [analysisReceivedAt, setAnalysisReceivedAt] = useState<number | null>(null)

  // 首次渲染分镜卡片数量限制：避免 analysis 返回后一次性渲染过多 DOM 导致卡顿
  const INITIAL_RENDER_SHOTS = 12
  const RENDER_BATCH = 12
  const [visibleShotCount, setVisibleShotCount] = useState(INITIAL_RENDER_SHOTS)

  // 当拿到新的 analysis 时重置可见数量（也能覆盖“恢复草稿”场景）
  useEffect(() => {
    if (!analysis) return
    setVisibleShotCount(Math.min(INITIAL_RENDER_SHOTS, analysis.shots.length))
  }, [analysis])

  const visibleShots = useMemo(() => {
    if (!analysis) return []
    return analysis.shots.slice(0, visibleShotCount)
  }, [analysis, visibleShotCount])

  // “滚动接近底部自动加载更多”——比纯按钮更顺滑，但依然简单可控
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    if (!analysis) return

    const onScroll = () => {
      if (!analysis) return
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
  const [editedShots, setEditedShots] = useState<Record<number, string>>({}) // 记录修改的分镜描述
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false) // 是否有未保存的修改
  const [isSaving, setIsSaving] = useState(false) // 是否正在保存

  // 🔥 使用 useRef 防止竞态条件
  const isAnalyzingRef = useRef(false)

  const handleAnalyze = async () => {
    if (isAnalyzingRef.current || hasStarted) {
      return
    }

    isAnalyzingRef.current = true
    setHasStarted(true)
    setIsAnalyzing(true)
    setError(null)

    try {
      const data = await analyzeScript(project.id)
      setAnalysis(data)
      setAnalysisReceivedAt(performance.now())
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

  useEffect(() => {
    if (project.script_analysis) {
      setAnalysis(project.script_analysis)
      setAnalysisReceivedAt(performance.now())
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

  // 性能观测：analysis 数据到位后，首帧渲染（commit+paint）大概耗时
  useEffect(() => {
    if (!analysisReceivedAt || !analysis) return

    const start = analysisReceivedAt
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const costMs = performance.now() - start
        console.log('[Perf][Step1] analysis->first paint (approx):', {
          projectId: project.id,
          shotCount: analysis.shot_count,
          characters: analysis.characters?.length ?? 0,
          costMs: Math.round(costMs)
        })
      })
    })
  }, [analysisReceivedAt, analysis, project.id])

  // 🔥 处理分镜描述修改
  const handleShotDescriptionChange = (shotNumber: number, newDescription: string) => {
    setEditedShots(prev => ({
      ...prev,
      [shotNumber]: newDescription
    }))
    setHasUnsavedChanges(true)
  }

  // 🔥 保存修改后的分镜
  const handleSaveChanges = async () => {
    if (!analysis || Object.keys(editedShots).length === 0) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // 创建更新后的 shots 数组
      const updatedShots = analysis.shots.map(shot => {
        if (editedShots[shot.shot_number]) {
          return {
            ...shot,
            description: editedShots[shot.shot_number]
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

  // 🔥 获取分镜描述（优先使用编辑后的）
  const getShotDescription = (shotNumber: number, originalDescription: string) => {
    return shotNumber in editedShots ? editedShots[shotNumber] : originalDescription
  }

  // 🔥 删除分镜
  const handleDeleteShot = async (shotNumber: number) => {
    if (!analysis || deletingShot !== null) {
      return
    }

    // 如果只剩一个分镜，不允许删除
    if (analysis.shots.length === 1) {
      setError('Cannot delete the last shot. At least one shot is required.')
      return
    }

    // 显示确认对话框
    const confirmed = await showConfirm(
      `This will delete Shot ${shotNumber} and all related storyboards and videos. This action cannot be undone.`,
      {
        title: 'Delete Shot',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    )

    if (!confirmed) {
      return
    }

    setDeletingShot(shotNumber)
    setError(null)

    try {
      // 调用删除 API
      const result = await deleteShot(project.id, shotNumber)

      console.log('[Step1] Shot deleted:', result)

      // 重新获取项目数据以获取最新的 script_analysis
      // 因为后端已经重新编号和更新了角色列表
      const updatedAnalysis: ScriptAnalysis = {
        ...analysis,
        shots: analysis.shots
          .filter(s => s.shot_number !== shotNumber)
          .map((shot, index) => ({
            ...shot,
            shot_number: index + 1
          })),
        characters: result.newCharacters,
        shot_count: result.newShotCount
      }

      setAnalysis(updatedAnalysis)
      onUpdate({ script_analysis: updatedAnalysis })

      // 清除所有编辑状态（因为 shot_number 已经改变）
      setEditedShots({})
      setHasUnsavedChanges(false)

      console.log('[Step1] Local state updated after deletion')
    } catch (err: any) {
      setError(err.message || 'Failed to delete shot')
      console.error('[Step1] Delete shot failed:', err)
    } finally {
      setDeletingShot(null)
    }
  }

  const handleConfirm = async () => {
    // 如果有未保存的修改，先保存
    if (hasUnsavedChanges) {
      await handleSaveChanges()
    }
    onNext()
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
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700"
    >
      {/* 1. Analysis Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="px-6 py-6 bg-blue-500/10 border border-blue-500/20 rounded-xl relative overflow-hidden group flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-4 right-4 text-blue-400/20 group-hover:text-blue-400/40 transition-colors">
            <Film className="w-12 h-12" />
          </div>
          <div>
            <div className="text-4xl font-bold text-white mb-1 tracking-tight">{analysis?.shot_count}</div>
            <div className="text-sm text-blue-200/60 font-medium uppercase tracking-wider">Total Shots</div>
          </div>
        </div>

        <div className="px-6 py-6 bg-purple-500/10 border border-purple-500/20 rounded-xl relative overflow-hidden group flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-4 right-4 text-purple-400/20 group-hover:text-purple-400/40 transition-colors">
            <Users className="w-12 h-12" />
          </div>
          <div>
            <div className="text-4xl font-bold text-white mb-1 tracking-tight">{analysis?.characters.length}</div>
            <div className="text-sm text-purple-200/60 font-medium uppercase tracking-wider">Characters</div>
          </div>
        </div>

        <div className="px-6 py-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl relative overflow-hidden group flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-4 right-4 text-emerald-400/20 group-hover:text-emerald-400/40 transition-colors">
            <Clock className="w-12 h-12" />
          </div>
          <div>
            <div className="text-4xl font-bold text-white mb-1 tracking-tight">{analysis?.duration}s</div>
            <div className="text-sm text-emerald-200/60 font-medium uppercase tracking-wider">Est. Duration</div>
          </div>
        </div>
      </div>

      {/* Characters Detected */}
      {analysis && analysis.characters.length > 0 && (
        <div className="flex flex-wrap gap-4 items-center p-6 bg-white/5 border border-white/5 rounded-2xl">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mr-2 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Cast Detected
          </span>
          {analysis.characters.map((char, idx) => (
            <span
              key={idx}
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm font-medium text-slate-300 shadow-sm flex items-center gap-2 transition-colors hover:bg-slate-800 hover:border-slate-600"
            >
              <User className="w-3.5 h-3.5 opacity-50" />
              {char}
            </span>
          ))}
        </div>
      )}

      {/* 2. Storyboard Cards */}
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
                onClick={() => handleDeleteShot(shot.shot_number)}
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
                    value={getShotDescription(shot.shot_number, shot.description)}
                    onChange={(e) => handleShotDescriptionChange(shot.shot_number, e.target.value)}
                    className="text-lg text-slate-200 leading-relaxed font-light tracking-wide bg-slate-900/50 border-slate-700/50 focus:border-blue-500/50 resize-none min-h-[80px]"
                    placeholder="Describe this shot..."
                  />

                  <div className="flex flex-wrap gap-3 pt-2">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-xs font-bold text-indigo-300 uppercase tracking-wide">
                      <Video className="w-3.5 h-3.5" />
                      {shot.camera_angle}
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/5 border border-rose-500/10 text-xs font-bold text-rose-300 uppercase tracking-wide">
                      <Smile className="w-3.5 h-3.5" />
                      {shot.mood}
                    </div>
                    {shot.characters && shot.characters.length > 0 && (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs font-bold text-slate-400 uppercase tracking-wide">
                        <Users className="w-3.5 h-3.5" />
                        {shot.characters.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 分批渲染：先让首屏可交互，再逐步加载更多分镜 */}
        {analysis && visibleShotCount < analysis.shots.length && (
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

      {/* Confirm Action */}
      <div className="sticky bottom-0 -mx-6 -mb-6 p-6 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex justify-center pt-8 pb-8 z-10">
        <Button
          onClick={handleConfirm}
          size="lg"
          className="h-14 px-12 rounded-full bg-white text-black hover:bg-blue-50 hover:text-blue-600 font-bold text-lg shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all hover:scale-105"
        >
          Confirm & Continue
        </Button>
      </div>
    </div>
  )
}
