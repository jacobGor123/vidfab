/**
 * StarryTalez CTA — Studio sidebar 底部曝光入口
 *
 * 设计意图（按 PDF 第 3 部分需求，仅作小入口曝光）：
 *   - sidebar 展开：单行紧凑横幅（图标 + 标题 + 副标 + NEW 角标）
 *   - sidebar 折叠：极简渐变图标按钮
 *
 * 跳转：https://starrytalez.com（新窗口）
 */

'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'

const TARGET_URL = 'https://starrytalez.com'
const LOGO_SRC = '/starrytalez-logo.png'
// 品牌名不翻译；其余文案走 i18n
const BRAND = 'StarryTalez'

interface StarryTalezCtaProps {
  isOpen: boolean
}

export function StarryTalezCta({ isOpen }: StarryTalezCtaProps) {
  const t = useTranslations('studio.sidebar')

  // 折叠态：纯 logo 图标按钮
  if (!isOpen) {
    return (
      <a
        href={TARGET_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('starryTalezAria')}
        className="mx-3 my-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff8e1]
                   border border-[#f5d98a]/80 shadow-[0_8px_18px_rgba(244,189,74,0.16)]
                   transition-transform hover:scale-105 hover:bg-[#fff3c7]"
      >
        <Image src={LOGO_SRC} alt={BRAND} width={28} height={28} className="rounded-md" />
      </a>
    )
  }

  // 展开态：单行紧凑横幅
  return (
    <a
      href={TARGET_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('starryTalezAria')}
      style={{ flexShrink: 0 }}
      className="group mx-3 my-2 flex items-center gap-2.5 rounded-lg bg-[#fff8e1]
                 border border-[#f5d98a]/80 shadow-[0_10px_24px_rgba(244,189,74,0.12)]
                 px-3 py-2 transition-all hover:border-[#f0c856] hover:bg-[#fff3c7]"
    >
      {/* 左侧 StarryTalez logo */}
      <Image
        src={LOGO_SRC}
        alt={BRAND}
        width={28}
        height={28}
        className="flex-shrink-0 rounded-md"
      />

      {/* 中间文字 */}
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-xs font-semibold text-[#24170c] truncate">{BRAND}</span>
        <span className="text-[10px] text-[#6f5940] truncate">{t('starryTalezTagline')}</span>
      </span>

      {/* 右侧 NEW 小角标 */}
      <span className="flex-shrink-0 rounded-full bg-[#24170c] px-1.5 py-[1px]
                       text-[9px] font-medium text-[#fff8e1]">
        {t('starryTalezNew')}
      </span>
    </a>
  )
}
