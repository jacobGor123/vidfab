import { Suspense } from "react"
import { Hero } from "@/components/hero"
import { ScriptSection } from "@/components/sections/script-section"
import { WorkspaceSection } from "@/components/sections/workspace-section"
import { CreativeSuiteSection } from "@/components/sections/creative-suite-section"
import { EngineeredSection } from "@/components/sections/engineered-section"
import { CreatorTestimonialsSection } from "@/components/sections/creator-testimonials-section"
import { CTASection } from "@/components/sections/cta-section"
import { PaymentSuccessHandler } from "@/components/payment-success-handler"

export default async function HomeClient() {
  return (
    <div className="relative min-h-screen overflow-hidden text-white" style={{ backgroundColor: "#0A0A12" }}>
      <Suspense fallback={null}>
        <PaymentSuccessHandler />
      </Suspense>

      <main>
        <Hero />
        <ScriptSection />
        <WorkspaceSection />
        <CreativeSuiteSection />
        <EngineeredSection />
        <CreatorTestimonialsSection />
        <CTASection />
      </main>
    </div>
  )
}
