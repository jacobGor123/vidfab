"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import toast from "react-hot-toast"

/**
 * PaymentSuccessHandler Component
 * Handles payment success detection and toast notifications
 * Must be wrapped in Suspense when used
 */
export function PaymentSuccessHandler() {
  const searchParams = useSearchParams()

  useEffect(() => {
    console.log('🔥 [PAYMENT-HANDLER] 组件已挂载，开始检查URL参数...')

    // Check for payment success parameters
    const paymentSuccess = searchParams.get('payment_success')
    const plan = searchParams.get('plan')
    const sessionId = searchParams.get('session_id')

    console.log('🔧 [PAYMENT-HANDLER] 检查URL参数:', {
      paymentSuccess,
      plan,
      sessionId,
      allParams: searchParams.toString()
    })

    if (paymentSuccess === 'true' && plan) {
      console.log('🎉 [PAYMENT-HANDLER] 检测到支付成功，显示toast')

      // 🔥 防止重复显示toast - 检查是否已经显示过
      const toastKey = `payment-success-${sessionId || 'default'}`
      if (sessionStorage.getItem(toastKey)) {
        console.log('⚠️ [PAYMENT-HANDLER] Toast已显示过，跳过')
        return
      }

      // 🔥 修复：正确显示套餐名称
      const planDisplayNames = {
        'lite': 'Lite',
        'pro': 'Pro',
        'premium': 'Premium'
      };

      const displayName = planDisplayNames[plan as keyof typeof planDisplayNames] || plan.charAt(0).toUpperCase() + plan.slice(1);

      // Show success toast with correct plan name
      toast.success(
        `🎉 Payment Successful! Welcome to VidFab ${displayName}! Your subscription is now active.`,
        {
          duration: 6000,
          style: {
            background: '#065f46',
            color: '#ffffff',
            border: '1px solid #34d399',
          },
        }
      )

      // 记录已显示过toast
      sessionStorage.setItem(toastKey, 'shown')

      console.log('✅ [PAYMENT-HANDLER] Toast已显示:', displayName)

      // Clean up URL parameters after a short delay
      setTimeout(() => {
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }, 1000)
    } else if (paymentSuccess === 'true') {
      console.log('⚠️ [PAYMENT-HANDLER] payment_success=true但没有plan参数')
    }
  }, [searchParams])

  // This component doesn't render anything visible
  return null
}