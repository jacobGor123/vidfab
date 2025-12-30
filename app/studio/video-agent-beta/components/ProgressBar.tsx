/**
 * Video Agent Beta - 进度条组件
 * 显示 7 个步骤的完成进度，支持点击回溯
 */

'use client'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
  stepStatuses?: Record<number, 'pending' | 'processing' | 'completed' | 'failed' | undefined>
  onStepClick?: (step: number) => void
}

const STEP_LABELS = [
  'Script',
  'Characters',
  'Storyboard',
  'Videos',
  'Compose'
]

export default function ProgressBar({
  currentStep,
  totalSteps,
  stepStatuses = {},
  onStepClick
}: ProgressBarProps) {
  // 调整步骤从 1 开始，显示时减 1
  const displayStep = currentStep - 1

  const handleStepClick = (index: number) => {
    const step = index + 1

    // 检查是否可以点击
    const stepStatus = stepStatuses[step]
    const isClickable = stepStatus === 'completed' || step === currentStep

    if (isClickable && onStepClick) {
      onStepClick(step)
    }
  }

  // 渲染步骤图标
  const renderStepIcon = (index: number, stepStatus: string | undefined, isCompleted: boolean, isCurrent: boolean) => {
    // Processing 状态：显示旋转动画
    if (stepStatus === 'processing') {
      return (
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      )
    }

    // Failed 状态：显示 X 图标
    if (stepStatus === 'failed') {
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    }

    // Completed 状态：显示 ✓ 图标
    if (isCompleted) {
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )
    }

    // 默认：显示步骤数字
    return <span className="text-xs font-semibold">{index + 1}</span>
  }

  // 获取步骤颜色样式
  const getStepColorClass = (stepStatus: string | undefined, isCompleted: boolean, isCurrent: boolean) => {
    if (stepStatus === 'processing') {
      return 'bg-blue-500 border-blue-500 text-white'
    }
    if (stepStatus === 'failed') {
      return 'bg-red-500 border-red-500 text-white'
    }
    if (isCompleted) {
      return 'bg-primary border-primary text-primary-foreground'
    }
    if (isCurrent) {
      return 'bg-background border-primary text-primary ring-4 ring-primary/20'
    }
    return 'bg-background border-border text-muted-foreground'
  }

  return (
    <div className="w-full">
      {/* 进度条 */}
      <div className="relative">
        {/* 背景线 */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />

        {/* 进度线 */}
        <div
          className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{
            width: `${(displayStep / totalSteps) * 100}%`
          }}
        />

        {/* 步骤节点 */}
        <div className="relative flex justify-between">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const step = index + 1
            const stepStatus = stepStatuses[step]
            const isCompleted = index < displayStep
            const isCurrent = index === displayStep
            const isPending = index > displayStep
            const isClickable = stepStatus === 'completed' || step === currentStep

            return (
              <div key={index} className="flex flex-col items-center">
                {/* 圆点 */}
                <button
                  onClick={() => handleStepClick(index)}
                  disabled={!isClickable}
                  className={`
                    w-8 h-8 rounded-full border-2 flex items-center justify-center
                    transition-all duration-300 z-10
                    ${getStepColorClass(stepStatus, isCompleted, isCurrent)}
                    ${
                      isClickable
                        ? 'cursor-pointer hover:scale-110 hover:shadow-lg active:scale-95'
                        : 'cursor-not-allowed opacity-50'
                    }
                  `}
                  title={
                    isClickable
                      ? `Click to view Step ${step}: ${STEP_LABELS[index]}`
                      : `Step ${step}: ${STEP_LABELS[index]} (Not completed)`
                  }
                >
                  {renderStepIcon(index, stepStatus, isCompleted, isCurrent)}
                </button>

                {/* 标签 */}
                <div
                  className={`
                    mt-2 text-xs font-medium whitespace-nowrap
                    ${isCurrent ? 'text-primary' : 'text-muted-foreground'}
                  `}
                >
                  {STEP_LABELS[index]}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
