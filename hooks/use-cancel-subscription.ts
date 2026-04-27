/**
 * 退订逻辑复用 Hook
 * 从 pricing 页面提取并封装为可复用的逻辑
 */

import { useState } from 'react'
import toast from 'react-hot-toast'

interface UseCancelSubscriptionOptions {
  onSuccess?: () => void
  onError?: (error: string) => void
}

interface UseCancelSubscriptionReturn {
  cancelling: boolean
  cancelSubscription: () => Promise<void>
}

export function useCancelSubscription(
  options: UseCancelSubscriptionOptions = {}
): UseCancelSubscriptionReturn {
  const [cancelling, setCancelling] = useState(false)

  const cancelSubscription = async () => {
    setCancelling(true)

    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancel_at_period_end: false // 立即取消
        }),
      })

      const data = await response.json()

      if (data.success) {
        // 🔥 区分清理完成和正常取消
        if (data.cleaned) {
          // ✅ 数据已清理,直接刷新页面
          console.log('✅ Orphaned subscription data cleaned up, refreshing page...')
          toast.success('Your account has been updated. Refreshing...', {
            duration: 2000,
          })
          setTimeout(() => {
            window.location.reload()
          }, 2000)
          return
        }

        // ✅ 正常取消：等待 webhook 处理完成后再刷新状态
        toast.success('Subscription cancellation in progress...', {
          duration: 3000,
        })

        // 🔥 轮询检查订阅状态，等待 webhook 更新
        let attempts = 0
        const maxAttempts = 10 // 最多等待 10 秒
        const checkInterval = setInterval(async () => {
          attempts++

          try {
            const statusResponse = await fetch('/api/subscription/status')
            const statusData = await statusResponse.json()

            if (statusData.success && statusData.subscription?.plan_id === 'free') {
              // ✅ 状态已更新为 free
              clearInterval(checkInterval)
              toast.success('Subscription cancelled successfully. You are now on the Free plan.', {
                duration: 5000,
              })
              setCancelling(false)

              // 调用成功回调
              if (options.onSuccess) {
                options.onSuccess()
              }
            } else if (attempts >= maxAttempts) {
              // ⏱️ 超时：Stripe webhook 未在预期内返回，
              // 取消请求已发出但结果未确认，不能显示"成功"
              clearInterval(checkInterval)
              setCancelling(false)
              toast('Cancellation request sent. Please refresh the page in a moment to confirm the updated status.', {
                duration: 6000,
                icon: '⏳',
              })
            }
          } catch (error) {
            console.error('Error checking subscription status:', error)
            if (attempts >= maxAttempts) {
              clearInterval(checkInterval)
              setCancelling(false)
            }
          }
        }, 1000) // 每秒检查一次

      } else {
        console.error('Failed to cancel subscription:', data.error)
        toast.error(`Failed to cancel subscription: ${data.error}`)
        setCancelling(false)

        // 调用错误回调
        if (options.onError) {
          options.onError(data.error)
        }
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      toast.error('Failed to cancel subscription. Please try again.')
      setCancelling(false)

      // 调用错误回调
      if (options.onError) {
        options.onError(error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  return {
    cancelling,
    cancelSubscription,
  }
}