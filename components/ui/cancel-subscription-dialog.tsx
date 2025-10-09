"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CancelSubscriptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isLoading?: boolean
  currentPlan?: string
  creditsRemaining?: number
}

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  currentPlan = "subscription",
  creditsRemaining = 0,
}: CancelSubscriptionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold text-white">
            Cancel Subscription?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300 space-y-3">
            <p>
              Are you sure you want to cancel your <span className="font-semibold text-white">{currentPlan}</span> subscription?
            </p>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 space-y-2">
              <p className="text-yellow-400 font-medium">⚠️ What happens after cancellation:</p>
              <ul className="text-sm text-gray-300 space-y-1 ml-4 list-disc">
                <li>Your subscription will be cancelled immediately</li>
                <li>You will lose access to premium features</li>
                <li>Your remaining <span className="font-semibold text-white">{creditsRemaining} credits</span> will be retained</li>
                <li>You will be downgraded to the Free plan</li>
              </ul>
            </div>

            <p className="text-sm text-gray-400">
              You can reactivate your subscription anytime from the Pricing page.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="bg-gray-800 text-white hover:bg-gray-700 border-gray-700"
            disabled={isLoading}
          >
            Keep Subscription
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? "Cancelling..." : "Yes, Cancel Subscription"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}