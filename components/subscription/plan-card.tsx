import { Check } from "lucide-react"

interface PlanCardProps {
  /** 外层 1px 渐变描边 */
  borderGradient: string
  /** 卡片内背景渐变 */
  bgGradient: string
  /** 右上角 badge 文字，不传则不显示 */
  badge?: string
  /** 头部背景图 URL */
  headerImage: string
  /** 头部最小高度，默认 130 */
  headerMinHeight?: number
  /** 标题区域内容（名称 + 定价 + 描述） */
  header: React.ReactNode
  /** 功能列表 */
  features: string[]
  /** features li 间距，默认 space-y-2.5 */
  featureSpacing?: string
  /** check icon 与文字间距，默认 gap-2 */
  featureGap?: string
  /** 分隔线颜色 */
  dividerColor: string
  /** CTA 按钮 */
  button: React.ReactNode
  /** 按钮区域是否有顶部内边距 pt-4，默认 false */
  buttonPaddingTop?: boolean
  className?: string
}

/**
 * 通用订阅方案卡片
 * 用于 pricing 页与 upgrade-dialog，避免重复维护相同 UI 结构。
 * badge 放在 overflow-hidden 容器内，利用自然裁切实现圆角匹配。
 */
export function PlanCard({
  borderGradient,
  bgGradient,
  badge,
  headerImage,
  headerMinHeight = 130,
  header,
  features,
  featureSpacing = 'space-y-2.5',
  featureGap = 'gap-2',
  dividerColor,
  button,
  buttonPaddingTop = false,
  className,
}: PlanCardProps) {
  return (
    <div
      className={`p-[1px] rounded-[20px] h-full${className ? ` ${className}` : ''}`}
      style={{ background: borderGradient }}
    >
      <div
        className="relative rounded-[20px] overflow-hidden flex flex-col h-full"
        style={{ background: bgGradient }}
      >
        {badge && (
          <div
            className="absolute top-0 right-0 z-10 px-3 py-1.5 rounded-bl-[12px]"
            style={{ background: '#a63fff' }}
          >
            <span className="text-xs font-semibold text-white">{badge}</span>
          </div>
        )}

        {/* 头部：背景图 + 定价内容 */}
        <div
          className="px-5 md:px-6 pt-5 md:pt-6 pb-4 md:pb-5"
          style={{
            minHeight: headerMinHeight,
            backgroundImage: `url(${headerImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {header}
        </div>

        <div className="h-px mx-5 md:mx-6" style={{ background: dividerColor }} />

        {/* 功能列表 */}
        <div className="px-5 md:px-6 py-4 md:py-5 flex-1">
          <ul className={featureSpacing}>
            {features.map(f => (
              <li key={f} className={`flex items-start ${featureGap}`}>
                <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#30ff8e' }} />
                <span className="text-sm text-white">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA 按钮 */}
        <div className={`px-5 md:px-6 ${buttonPaddingTop ? 'pt-4 ' : ''}pb-5 md:pb-6`}>
          {button}
        </div>
      </div>
    </div>
  )
}
