"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { SpaceBackground } from "@/components/space-background"
import { LoadingState } from "@/components/loading-state"
import { SkeletonLoader } from "@/components/skeleton-loader"
import { Check, User, Crown, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function PricingPage() {
  const [loading, setLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const [annual, setAnnual] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener("scroll", handleScroll)

    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      clearTimeout(timer)
    }
  }, [])

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black text-white">
        <SpaceBackground />
        <Navbar scrolled={scrolled} />
        <div className="container mx-auto px-4 pt-32 pb-20">
          <div className="max-w-4xl mx-auto">
            <SkeletonLoader type="title" className="mb-6" />
            <SkeletonLoader type="text" count={2} className="mb-12" />

            <div className="grid md:grid-cols-3 gap-8">
              <SkeletonLoader type="card" className="h-[500px]" />
              <SkeletonLoader type="card" className="h-[500px]" />
              <SkeletonLoader type="card" className="h-[500px]" />
            </div>
          </div>
        </div>
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
          <LoadingState message="Loading Pricing Plans..." />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <SpaceBackground />
      <Navbar scrolled={scrolled} />

      <main>
        <div className="container mx-auto px-4 pt-32 pb-20">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg text-gray-300 mb-8">
              Choose the plan that's right for you and start exploring the power of AI-driven research.
            </p>

            <div className="flex items-center justify-center mb-12">
              <Label htmlFor="billing-toggle" className={annual ? "text-gray-400" : "text-white"}>
                Monthly
              </Label>
              <Switch id="billing-toggle" checked={annual} onCheckedChange={setAnnual} className="mx-4" />
              <Label htmlFor="billing-toggle" className={!annual ? "text-gray-400" : "text-white"}>
                Annual <span className="text-xs text-pink-500">(Save 20%)</span>
              </Label>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Basic Plan */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden group hover:border-pink-500/50 transition-colors">
              <div className="p-6 border-b border-white/10">
                <h3 className="text-xl font-bold mb-2">Basic</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">${annual ? "12" : "15"}</span>
                  <span className="text-gray-400 ml-2">/ month</span>
                </div>
                {annual && <p className="text-xs text-pink-500 mt-1">Billed annually (${12 * 12})</p>}
                <p className="text-gray-400 mt-4">Perfect for individuals just getting started with AI research.</p>
              </div>
              <div className="p-6">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-pink-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">10 research queries per month</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-pink-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">Basic AI research capabilities</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-pink-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">Knowledge Graph Visualization</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-pink-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">Standard processing speed</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-pink-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">Email support</span>
                  </li>
                </ul>
                <Button className="w-full mt-8 bg-white/10 hover:bg-white/20 text-white group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/20">
                  <User className="h-4 w-4 mr-2 transition-all duration-300 group-hover:scale-110 relative z-10 text-white group-hover:text-gray-800" />
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/30 opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-x-0 group-hover:scale-x-100 origin-left -z-10"></div>
                </Button>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="bg-white/5 backdrop-blur-sm border border-purple-500/30 rounded-xl overflow-hidden relative group hover:border-purple-500/70 transition-colors transform scale-105 z-10">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                MOST POPULAR
              </div>
              <div className="p-6 border-b border-white/10">
                <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  Pro
                </h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">${annual ? "39" : "49"}</span>
                  <span className="text-gray-400 ml-2">/ month</span>
                </div>
                {annual && <p className="text-xs text-pink-500 mt-1">Billed annually (${39 * 12})</p>}
                <p className="text-gray-400 mt-4">
                  Ideal for professionals who need comprehensive research capabilities.
                </p>
              </div>
              <div className="p-6">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-purple-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">50 research queries per month</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-purple-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">Advanced AI research capabilities</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-purple-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">Knowledge Graph with export options</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-purple-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">Priority processing</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-purple-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">Advanced fact verification</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-purple-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">Priority email & chat support</span>
                  </li>
                </ul>
                <Button className="w-full mt-8 bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90 group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30">
                  <Crown className="h-4 w-4 mr-2 transition-all duration-300 group-hover:rotate-12 relative z-10 text-white group-hover:text-gray-900" />
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-all duration-500 -z-10"></div>
                </Button>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden group hover:border-cyan-400/50 transition-colors">
              <div className="p-6 border-b border-white/10">
                <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">${annual ? "79" : "99"}</span>
                  <span className="text-gray-400 ml-2">/ month</span>
                </div>
                {annual && <p className="text-xs text-pink-500 mt-1">Billed annually (${79 * 12})</p>}
                <p className="text-gray-400 mt-4">
                  For organizations that need the most powerful research capabilities.
                </p>
              </div>
              <div className="p-6">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-cyan-400 mr-2 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">Unlimited research queries</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-cyan-400 mr-2 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">Enterprise-grade AI research</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-cyan-400 mr-2 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">Custom data sources integration</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-cyan-400 mr-2 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">Highest priority processing</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-cyan-400 mr-2 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">API access</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-cyan-400 mr-2 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">Dedicated support manager</span>
                  </li>
                </ul>
                <Button className="w-full mt-8 bg-white/10 hover:bg-white/20 text-white group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-400/20">
                  <Building className="h-4 w-4 mr-2 transition-all duration-300 group-hover:scale-110 relative z-10 text-white group-hover:text-gray-800" />
                  <span className="relative z-10">Contact Sales</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-cyan-300/30 opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-x-0 group-hover:scale-x-100 origin-left -z-10"></div>
                </Button>
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto mt-20 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
              Frequently Asked Questions
            </h2>

            <div className="mt-8 space-y-6 text-left">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-2">Can I change plans later?</h3>
                <p className="text-gray-400">
                  Yes, you can upgrade or downgrade your plan at any time. Changes will be applied at the start of your
                  next billing cycle.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-2">What happens if I exceed my monthly query limit?</h3>
                <p className="text-gray-400">
                  If you reach your monthly query limit, you can purchase additional queries or upgrade to a higher plan
                  to continue using the service.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-2">Do you offer a free trial?</h3>
                <p className="text-gray-400">
                  Yes, we offer a 7-day free trial for all new users to test our Basic plan features. No credit card
                  required.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-2">What payment methods do you accept?</h3>
                <p className="text-gray-400">
                  We accept all major credit cards, PayPal, and for Enterprise customers, we can arrange invoicing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
