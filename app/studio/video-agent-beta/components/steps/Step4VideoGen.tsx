/**
 * Step 4: Video Clip Generation
 * 生成视频片段，支持重试
 */

'use client'

import { Button } from '@/components/ui/button'
import { useVideoGeneration } from './useVideoGeneration'
import { Step4PreparingState } from './Step4PreparingState'
import { Step4ProgressCard } from './Step4ProgressCard'
import { Step4VideoCard } from './Step4VideoCard'
import type { Step4Props, DisplayVideoItem } from './Step4VideoGen.types'

export default function Step4VideoGen({ project, onNext, onUpdate }: Step4Props) {
  const { state, actions, stats, storyboardsReady, setIsShowingConfirm } = useVideoGeneration({
    project,
    onUpdate,
    onNext
  })

  const {
    isGenerating,
    isInitializing,
    videoClips,
    error,
    retryingShot,
    customPrompts,
    expandedPrompts,
    isShowingConfirm
  } = state

  const {
    handleConfirm,
    getDefaultPrompt,
    updateCustomPrompt,
    togglePromptExpand
  } = actions

  const { totalShots, completedShots, failedShots, generatingShots, progress } = stats

  // 根据项目尺寸比决定容器 aspect ratio
  const aspectRatioClass = project.aspect_ratio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'

  // 准备阶段：显示简单的加载提示
  if (isInitializing) {
    return <Step4PreparingState storyboardsReady={storyboardsReady} />
  }

  // 创建占位数组 - 始终显示 totalShots 个卡片
  const displayItems: DisplayVideoItem[] = Array.from({ length: totalShots }, (_, index) => {
    const shotNumber = index + 1
    const clip = videoClips.find(vc => vc.shot_number === shotNumber)

    // 🎬 查找对应的分镜图作为视频首帧占位
    const storyboard = project.storyboards?.find((sb: any) => sb.shot_number === shotNumber)
    const posterUrl = storyboard?.status === 'success' ? storyboard.image_url : undefined

    if (clip) {
      return { ...clip, poster_url: posterUrl }
    }

    return {
      shot_number: shotNumber,
      status: 'pending' as const,
      poster_url: posterUrl
    }
  })

  return (
    <div className="space-y-6">
      {/* 进度概览 */}
      <Step4ProgressCard
        totalShots={totalShots}
        completedShots={completedShots}
        generatingShots={generatingShots}
        failedShots={failedShots}
        progress={progress}
      />

      {/* 视频网格 - 使用占位符确保高度稳定 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {displayItems.map((item) => {
          // 🔥 获取对应的 Shot 对象
          const shot = project.script_analysis?.shots.find(s => s.shot_number === item.shot_number)

          return (
            <Step4VideoCard
              key={item.shot_number}
              item={item}
              shot={shot}  // 🔥 传递完整的 Shot 对象
              aspectRatioClass={aspectRatioClass}
              retryingShot={retryingShot}
              isShowingConfirm={isShowingConfirm}
              expandedPrompts={expandedPrompts}
              customPrompts={customPrompts}
              onRetryClick={actions.handleRetry}
              onTogglePrompt={togglePromptExpand}
              onUpdatePrompt={updateCustomPrompt}
              getDefaultPrompt={getDefaultPrompt}
              setIsShowingConfirm={setIsShowingConfirm}
            />
          )
        })}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      {/* 确认按钮 - 只有在所有视频都完成（成功或失败）且不在生成中时才显示 */}
      {!isGenerating && generatingShots === 0 && (completedShots + failedShots === totalShots) && totalShots > 0 && (
        <div className="sticky bottom-0 -mx-6 -mb-6 p-6 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex justify-center pt-8 pb-8 z-10">
          <Button
            onClick={handleConfirm}
            size="lg"
            className="h-14 px-12 rounded-full bg-white text-black hover:bg-blue-50 hover:text-blue-600 font-bold text-lg shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all hover:scale-105"
          >
            Confirm & Continue
          </Button>
        </div>
      )}
    </div>
  )
}
