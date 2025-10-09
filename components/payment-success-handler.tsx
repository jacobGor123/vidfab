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
    // Check for payment success parameters
    const paymentSuccess = searchParams.get('payment_success')
    const plan = searchParams.get('plan')
    const sessionId = searchParams.get('session_id')

    if (paymentSuccess === 'true' && plan) {
      // Prevent duplicate toasts
      const toastKey = `payment-success-${sessionId || 'default'}`
      if (sessionStorage.getItem(toastKey)) {
        return
      }

      // Display plan names
      const planDisplayNames = {
        'lite': 'Lite',
        'pro': 'Pro',
        'premium': 'Premium'
      };

      const displayName = planDisplayNames[plan as keyof typeof planDisplayNames] || plan.charAt(0).toUpperCase() + plan.slice(1);

      // Show success toast
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

      sessionStorage.setItem(toastKey, 'shown')

      // Clean up URL parameters
      setTimeout(() => {
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }, 1000)
    }
  }, [searchParams])

  // This component doesn't render anything visible
  return null
}