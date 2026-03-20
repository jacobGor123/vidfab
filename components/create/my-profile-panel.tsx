"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { ArrowUpCircle, XCircle, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSubscription } from "@/hooks/use-subscription"
import { useCancelSubscription } from "@/hooks/use-cancel-subscription"
import { CancelSubscriptionDialog } from "@/components/ui/cancel-subscription-dialog"
import { SubscriptionInfoCard } from "./subscription-info-card"
import { CreditsBalanceCard } from "./credits-balance-card"
import { OrdersHistoryList } from "./orders-history-list"
import toast from "react-hot-toast"
import { trackUpgradeClick } from "@/lib/analytics/gtm"

export function MyProfilePanel() {
  const t = useTranslations('studio')
  const router = useRouter()
  const { data: session } = useSession()
  const {
    subscription,
    creditsRemaining,
    isLoading,
    refreshSubscription
  } = useSubscription()

  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const { cancelling, cancelSubscription } = useCancelSubscription({
    onSuccess: () => {
      setShowCancelDialog(false)
      refreshSubscription()
    },
    onError: (error) => {
      console.error('Cancel subscription error:', error)
    }
  })

  // 未登录状态
  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <LogIn className="h-16 w-16 mx-auto mb-4 text-gray-600" />
          <h2 className="text-2xl font-bold text-white mb-2">
            {t('myProfile.pleaseSignIn')}
          </h2>
          <p className="text-gray-400 mb-6">
            {t('myProfile.signInPrompt')}
          </p>
          <Button
            onClick={() => router.push('/login')}
            className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90"
          >
            {t('myProfile.signIn')}
          </Button>
        </div>
      </div>
    )
  }

  const handleUpgrade = () => {
    // 🔥 GTM 升级按钮点击事件跟踪
    trackUpgradeClick(subscription?.plan_id || 'free')
    router.push('/pricing')
  }

  const handleCancelClick = () => {
    if (subscription?.plan_id === 'free') {
      toast.error(t('myProfile.alreadyFree'))
      return
    }
    setShowCancelDialog(true)
  }

  const handleConfirmCancel = async () => {
    await cancelSubscription()
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* 使用 calc 计算实际可用高度，减去 padding */}
      <div className="h-[calc(100vh-4rem)] max-w-7xl mx-auto w-full p-6 flex flex-col gap-4">
        {/* 订阅信息 & 积分余额 - 自动高度 */}
        <div className="grid md:grid-cols-2 gap-4 flex-shrink-0">
          <SubscriptionInfoCard
            subscription={subscription}
            isLoading={isLoading}
          />
          <CreditsBalanceCard
            subscription={subscription}
            creditsRemaining={creditsRemaining}
            isLoading={isLoading}
          />
        </div>

        {/* 操作按钮 - 自动高度 */}
        <div className="flex gap-4 flex-shrink-0">
          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 text-white"
          >
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            {t('myProfile.upgradePlan')}
          </Button>

          {subscription?.plan_id !== 'free' && (
            <Button
              onClick={handleCancelClick}
              disabled={isLoading || cancelling}
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-600/10"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {cancelling ? t('myProfile.cancelling') : t('myProfile.cancelSubscription')}
            </Button>
          )}
        </div>

        {/* 历史订单 - 占据剩余空间 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <OrdersHistoryList
            onError={(error) => {
              console.error('Orders error:', error)
              toast.error(error)
            }}
          />
        </div>
      </div>

      {/* 退订确认对话框 */}
      <CancelSubscriptionDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={handleConfirmCancel}
        isLoading={cancelling}
        currentPlan={subscription?.plan_id}
        creditsRemaining={creditsRemaining}
      />
    </div>
  )
}