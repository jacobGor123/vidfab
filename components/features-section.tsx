import { Sparkles, Shield, Clock, Zap, BookOpen, BarChart } from "lucide-react"

export function FeaturesSection() {
  return (
    <section id="features" className="py-20">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-6 text-gradient-brand">
          Elevate Your Understanding
        </h2>
        <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
          NeuralArchive isn't just about finding information; it's about forging connections and revealing insights.
          Explore features crafted for clarity and depth.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="bg-brand-gray-800/70 backdrop-blur-md border border-brand-gray-700 rounded-xl p-6 shadow-apple-soft transition-all duration-300 ease-apple hover:bg-brand-gray-700/90 hover:shadow-apple-medium hover:border-brand-purple-DEFAULT/30">
          <div className="mb-5 p-3.5 bg-gradient-to-br from-brand-pink-DEFAULT/15 to-brand-purple-DEFAULT/15 rounded-full w-fit">
            <Sparkles className="h-6 w-6 text-brand-pink-DEFAULT" />
          </div>
          <h3 className="text-xl font-heading font-semibold mb-3 text-gray-100">AI-Powered Research</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Leverage advanced AI models to analyze complex topics and generate comprehensive research reports.
          </p>
        </div>

        <div className="bg-brand-gray-800/70 backdrop-blur-md border border-brand-gray-700 rounded-xl p-6 shadow-apple-soft transition-all duration-300 ease-apple hover:bg-brand-gray-700/90 hover:shadow-apple-medium hover:border-brand-purple-DEFAULT/30">
          <div className="mb-5 p-3.5 bg-gradient-to-br from-brand-pink-DEFAULT/15 to-brand-purple-DEFAULT/15 rounded-full w-fit">
            <BookOpen className="h-6 w-6 text-brand-purple-DEFAULT" />
          </div>
          <h3 className="text-xl font-heading font-semibold mb-3 text-gray-100">Interactive Book Format</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            View your research results in an elegant, interactive book format with page-turning animations and
            structured content.
          </p>
        </div>

        <div className="bg-brand-gray-800/70 backdrop-blur-md border border-brand-gray-700 rounded-xl p-6 shadow-apple-soft transition-all duration-300 ease-apple hover:bg-brand-gray-700/90 hover:shadow-apple-medium hover:border-brand-purple-DEFAULT/30">
          <div className="mb-5 p-3.5 bg-gradient-to-br from-brand-pink-DEFAULT/15 to-brand-purple-DEFAULT/15 rounded-full w-fit">
            <Shield className="h-6 w-6 text-cyan-400" />
          </div>
          <h3 className="text-xl font-heading font-semibold mb-3 text-gray-100">Fact Verification</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Our system cross-references information from multiple sources to ensure accuracy and reliability of research
            findings.
          </p>
        </div>

        <div className="bg-brand-gray-800/70 backdrop-blur-md border border-brand-gray-700 rounded-xl p-6 shadow-apple-soft transition-all duration-300 ease-apple hover:bg-brand-gray-700/90 hover:shadow-apple-medium hover:border-brand-purple-DEFAULT/30">
          <div className="mb-5 p-3.5 bg-gradient-to-br from-brand-pink-DEFAULT/15 to-brand-purple-DEFAULT/15 rounded-full w-fit">
            <Clock className="h-6 w-6 text-brand-pink-DEFAULT" />
          </div>
          <h3 className="text-xl font-heading font-semibold mb-3 text-gray-100">Real-Time Processing</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Get research results quickly with our optimized processing pipeline that works in real-time to deliver
            insights.
          </p>
        </div>

        <div className="bg-brand-gray-800/70 backdrop-blur-md border border-brand-gray-700 rounded-xl p-6 shadow-apple-soft transition-all duration-300 ease-apple hover:bg-brand-gray-700/90 hover:shadow-apple-medium hover:border-brand-purple-DEFAULT/30">
          <div className="mb-5 p-3.5 bg-gradient-to-br from-brand-pink-DEFAULT/15 to-brand-purple-DEFAULT/15 rounded-full w-fit">
            <Zap className="h-6 w-6 text-brand-purple-DEFAULT" />
          </div>
          <h3 className="text-xl font-heading font-semibold mb-3 text-gray-100">Multi-Stage Processing</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Your query goes through multiple specialized AI agents, each contributing their expertise to the final
            result.
          </p>
        </div>

        <div className="bg-brand-gray-800/70 backdrop-blur-md border border-brand-gray-700 rounded-xl p-6 shadow-apple-soft transition-all duration-300 ease-apple hover:bg-brand-gray-700/90 hover:shadow-apple-medium hover:border-brand-purple-DEFAULT/30">
          <div className="mb-5 p-3.5 bg-gradient-to-br from-brand-pink-DEFAULT/15 to-brand-purple-DEFAULT/15 rounded-full w-fit">
            <BarChart className="h-6 w-6 text-cyan-400" />
          </div>
          <h3 className="text-xl font-heading font-semibold mb-3 text-gray-100">Visual Data Representation</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Complex data is transformed into easy-to-understand visual representations to enhance comprehension.
          </p>
        </div>
      </div>
    </section>
  )
}
