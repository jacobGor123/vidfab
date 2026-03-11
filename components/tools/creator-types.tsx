import { cn } from "@/lib/utils"
import { Clapperboard, TrendingUp, BookOpen } from "lucide-react"
import { CreatorType } from "@/lib/tools/tool-configs"

interface CreatorTypesProps {
  title: string
  types: CreatorType[]
  className?: string
}

const ICONS = [
  <Clapperboard className="w-6 h-6" />,
  <TrendingUp className="w-6 h-6" />,
  <BookOpen className="w-6 h-6" />,
]

export function CreatorTypes({ title, types, className }: CreatorTypesProps) {
  return (
    <section className={cn("py-20 bg-black/40", className)}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold text-white">
            {title}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mx-auto">
          {types.map((type, i) => (
            <div
              key={i}
              className="rounded-2xl border border-brand-gray-700 bg-brand-gray-900/60 p-7 hover:border-brand-purple-DEFAULT/30 hover:bg-brand-gray-800/60 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-shrink-0 p-3 rounded-full bg-gradient-to-br from-brand-purple-DEFAULT/15 to-brand-pink-DEFAULT/15 text-brand-purple-DEFAULT">
                  {ICONS[i]}
                </div>
                <h3 className="text-xl font-heading font-semibold text-white">{type.title}</h3>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{type.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
