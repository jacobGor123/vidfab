import { LoadingState } from "@/components/loading-state"

export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
      <LoadingState message="Loading Pricing Plans..." />
    </div>
  )
}
