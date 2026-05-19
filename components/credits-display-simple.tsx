"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Zap } from "lucide-react"
import { useSimpleSubscription } from "@/hooks/use-subscription-simple"

interface CreditsDisplayProps {
  className?: string
}

/**
 * 顶部 navbar 「Credits | N」按钮 + 点击弹出的简化 Dialog。
 *
 * 改版前：弹层含 3 段大表格（Q1 / Pro / Effects），模型多了一塞挤又过时。
 * 改版后（PDF 第 5 部分需求）：仅显示 2 条核心数据 —— 当前积分 + 当月已消耗。
 */
export function CreditsDisplaySimple({ className }: CreditsDisplayProps) {
  const t = useTranslations('studio.creditsDialog')
  const [showDialog, setShowDialog] = useState(false)
  const { creditsRemaining, isLoading, creditsInfo } = useSimpleSubscription()

  // 未登录或加载完成后无 creditsInfo（实际未登录）→ 不渲染按钮
  if (!isLoading && !creditsInfo) {
    return null
  }

  const isPro = creditsInfo?.is_pro ?? false
  const monthlyTotal = creditsInfo?.monthly_total ?? null
  const monthlyUsed = creditsInfo?.monthly_used ?? null

  return (
    <>
      <div className="relative">
        {isLoading ? (
          <Button
            variant="outline"
            className="bg-white/5 border-white/20 text-white transition-all duration-300 ease-apple"
            disabled
          >
            <Zap className="h-4 w-4 mr-2 text-yellow-400 animate-pulse" />
            <span className="animate-pulse">Credits | ---</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            className="bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 text-white transition-all duration-300 ease-apple"
            onClick={() => setShowDialog(true)}
          >
            <Zap className="h-4 w-4 mr-2 text-yellow-400" />
            Credits | {creditsRemaining}
          </Button>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md bg-gray-950 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {t('title')}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              {t('subtitle')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 当前现有积分 */}
            <StatRow
              label={t('currentCredits')}
              value={
                <Badge variant="outline" className="bg-yellow-400/20 text-yellow-300 border-yellow-600">
                  <Zap className="h-3 w-3 mr-1" />
                  {creditsRemaining}
                </Badge>
              }
              hint={isPro ? t('proMember') : t('freePlan')}
            />

            {/* 当月已消耗 */}
            <StatRow
              label={t('usedThisMonth')}
              value={
                <Badge variant="outline" className="bg-blue-400/15 text-blue-200 border-blue-500/50">
                  {monthlyUsed !== null ? monthlyUsed : '—'}
                </Badge>
              }
              hint={
                monthlyTotal !== null
                  ? t('usedOfMonthly', { total: monthlyTotal })
                  : t('subscribePrompt')
              }
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function StatRow({
  label,
  value,
  hint,
}: {
  label: string
  value: React.ReactNode
  hint?: string
}) {
  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <span className="text-gray-300">{label}</span>
        {value}
      </div>
      {hint && (
        <div className="mt-2 text-xs text-gray-500">{hint}</div>
      )}
    </div>
  )
}
