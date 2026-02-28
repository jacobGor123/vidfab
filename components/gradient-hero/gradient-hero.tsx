import { HeroBackground } from "./hero-background"
import { HeroCopy } from "./hero-copy"
import { HeroFloatingCards } from "./hero-floating-cards"
import { HeroFeatureCards } from "./hero-feature-cards"

export function GradientHero() {
  return (
    <div>
      {/* Hero 主区域：背景 + 浮动卡片 + 文案 */}
      <div className="relative min-h-screen xl:min-h-0 xl:h-[948px] overflow-hidden" style={{ backgroundColor: "#0A0A12" }}>
        <HeroBackground />
        <HeroFloatingCards />
        <HeroCopy />
      </div>

      {/* Hero 下方紧贴的特性卡片 */}
      <HeroFeatureCards />
    </div>
  )
}
