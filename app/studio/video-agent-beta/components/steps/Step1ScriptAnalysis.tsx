/**
 * Step 1: Script Analysis & Optimization
 * AI 分析脚本并生成结构化分镜数据
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { VideoAgentProject, ScriptAnalysis } from '@/lib/stores/video-agent'
import { Film, Users, Clock, Video, Smile, User } from 'lucide-react'

interface Step1Props {
  project: VideoAgentProject
  onNext: () => void
  onUpdate: (updates: Partial<VideoAgentProject>) => void
}

export default function Step1ScriptAnalysis({ project, onNext, onUpdate }: Step1Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<ScriptAnalysis | null>(
    project.script_analysis || null
  )
  const [error, setError] = useState<string | null>(null)
  const [hasStarted, setHasStarted] = useState(false) // 防止重复触发

  const handleAnalyze = async () => {
    if (isAnalyzing || hasStarted) {
      console.log('[Step1] Analysis already in progress, skipping...')
      return
    }

    setHasStarted(true)
    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch(`/api/video-agent/projects/${project.id}/analyze-script`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Script analysis failed')
      }

      const { data } = await response.json()
      setAnalysis(data)
      onUpdate({ script_analysis: data })  // 不需要手动更新 current_step
    } catch (err: any) {
      setError(err.message)
      setHasStarted(false) // 失败后允许重试
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 如果已有分析结果，直接显示；否则自动开始分析（只触发一次）
  useEffect(() => {
    if (project.script_analysis) {
      setAnalysis(project.script_analysis)
      setHasStarted(true) // 标记已完成
    } else if (!hasStarted && !isAnalyzing && !error) {
      // 自动开始分析（只会执行一次）
      console.log('[Step1] Auto-starting script analysis')
      handleAnalyze()
    }
  }, [project.script_analysis]) // 只依赖 script_analysis

  const handleConfirm = () => {
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
        </div>

        <div className="space-y-6">
          {analysis?.shots.map((shot) => (
            <div
              key={shot.shot_number}
              className="group relative bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-8 transition-all duration-300"
            >
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
                    <span className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-950/50 border border-slate-800">
                      <span className="text-slate-300">{shot.duration_seconds}s</span>
                    </span>
                  </div>

                  <p className="text-xl text-slate-200 leading-relaxed font-light tracking-wide">
                    {shot.description}
                  </p>

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
