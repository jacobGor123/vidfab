import { BrainCircuit } from "lucide-react"
import type { LucideProps } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * NeuralArchiveIcon component.
 * Displays the brand icon for NeuralArchive.
 * Uses BrainCircuit from lucide-react.
 * @param {LucideProps} props - Props to pass to the Lucide icon.
 */
export function NeuralArchiveIcon({ className, ...props }: LucideProps) {
  return <BrainCircuit className={cn("text-brand-purple-DEFAULT", className)} {...props} />
}
