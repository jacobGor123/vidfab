import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  count?: number
  type?: "text" | "title" | "image" | "card" | "avatar"
}

export function SkeletonLoader({ className, count = 1, type = "text" }: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i)

  const renderSkeleton = () => {
    switch (type) {
      case "title":
        return <div className={cn("h-8 w-3/4 rounded-md bg-white/10 animate-pulse", className)} />
      case "text":
        return <div className={cn("h-4 w-full rounded-md bg-white/10 animate-pulse", className)} />
      case "image":
        return <div className={cn("h-48 w-full rounded-md bg-white/10 animate-pulse", className)} />
      case "card":
        return (
          <div className={cn("rounded-xl overflow-hidden bg-white/5 animate-pulse", className)}>
            <div className="h-48 bg-white/10" />
            <div className="p-4 space-y-3">
              <div className="h-6 w-3/4 bg-white/10 rounded-md" />
              <div className="h-4 w-full bg-white/10 rounded-md" />
              <div className="h-4 w-full bg-white/10 rounded-md" />
              <div className="h-4 w-2/3 bg-white/10 rounded-md" />
            </div>
          </div>
        )
      case "avatar":
        return <div className={cn("h-10 w-10 rounded-full bg-white/10 animate-pulse", className)} />
      default:
        return <div className={cn("h-4 w-full rounded-md bg-white/10 animate-pulse", className)} />
    }
  }

  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </div>
  )
}
