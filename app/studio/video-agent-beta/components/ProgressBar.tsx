/**
 * Video Agent Beta - 进度条组件
 * 显示 7 个步骤的完成进度
 */

'use client'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

const STEP_LABELS = [
  'Script',
  'Characters',
  'Storyboard',
  'Videos',
  'Compose'
]

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  // 调整步骤从 1 开始，显示时减 1
  const displayStep = currentStep - 1

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
            const isCompleted = index < displayStep
            const isCurrent = index === displayStep
            const isPending = index > displayStep

            return (
              <div key={index} className="flex flex-col items-center">
                {/* 圆点 */}
                <div
                  className={`
                    w-8 h-8 rounded-full border-2 flex items-center justify-center
                    transition-all duration-300 z-10
                    ${
                      isCompleted
                        ? 'bg-primary border-primary text-primary-foreground'
                        : isCurrent
                        ? 'bg-background border-primary text-primary ring-4 ring-primary/20'
                        : 'bg-background border-border text-muted-foreground'
                    }
                  `}
                >
                  {isCompleted ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}
                </div>

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
