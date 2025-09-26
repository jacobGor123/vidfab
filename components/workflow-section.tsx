import { ArrowRight, Search, BookOpen, Brain, CheckCircle } from "lucide-react"

export function WorkflowSection() {
  return (
    <section id="workflow" className="py-20">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-6 text-gradient-brand">
          The Genesis of Insight
        </h2>
        <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
          Follow your query's journey as NeuralArchive meticulously crafts understanding from complexity, transforming
          raw data into refined knowledge.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-brand-gray-800/70 backdrop-blur-md border border-brand-gray-700 rounded-xl p-6 relative overflow-hidden group shadow-apple-soft transition-all duration-300 ease-apple hover:bg-brand-gray-700/90 hover:shadow-apple-medium hover:border-brand-purple-DEFAULT/30">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-pink-300" />
          <div className="mb-4 p-3 bg-brand-purple-DEFAULT/10 rounded-full w-fit">
            <Brain className="h-6 w-6 text-brand-purple-DEFAULT" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-gray-100">AI Researcher</h3>
          <p className="text-gray-400 mb-4 text-balance">
            Our primary AI researcher analyzes your query, breaks it down into components, and formulates a research
            strategy.
          </p>
          <ul className="space-y-2">
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-brand-purple-DEFAULT mr-2 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-300">Query analysis and decomposition</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-brand-purple-DEFAULT mr-2 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-300">Research strategy formulation</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-brand-purple-DEFAULT mr-2 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-300">Initial knowledge assessment</span>
            </li>
          </ul>
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="h-5 w-5 text-brand-purple-DEFAULT" />
          </div>
        </div>

        <div className="bg-brand-gray-800/70 backdrop-blur-md border border-brand-gray-700 rounded-xl p-6 relative overflow-hidden group shadow-apple-soft transition-all duration-300 ease-apple hover:bg-brand-gray-700/90 hover:shadow-apple-medium hover:border-brand-purple-DEFAULT/30">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-300" />
          <div className="mb-4 p-3 bg-brand-purple-DEFAULT/10 rounded-full w-fit">
            <Search className="h-6 w-6 text-brand-purple-DEFAULT" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-gray-100">Search Engine</h3>
          <p className="text-gray-400 mb-4 text-balance">
            Our specialized search tool gathers information from various sources, filtering and prioritizing relevant
            data.
          </p>
          <ul className="space-y-2">
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-brand-purple-DEFAULT mr-2 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-300">Multi-source information gathering</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-brand-purple-DEFAULT mr-2 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-300">Relevance filtering and ranking</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-brand-purple-DEFAULT mr-2 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-300">Data extraction and organization</span>
            </li>
          </ul>
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="h-5 w-5 text-brand-purple-DEFAULT" />
          </div>
        </div>

        <div className="bg-brand-gray-800/70 backdrop-blur-md border border-brand-gray-700 rounded-xl p-6 relative overflow-hidden group shadow-apple-soft transition-all duration-300 ease-apple hover:bg-brand-gray-700/90 hover:shadow-apple-medium hover:border-brand-purple-DEFAULT/30">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-cyan-300" />
          <div className="mb-4 p-3 bg-brand-purple-DEFAULT/10 rounded-full w-fit">
            <BookOpen className="h-6 w-6 text-brand-purple-DEFAULT" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-gray-100">Senior Researcher</h3>
          <p className="text-gray-400 mb-4 text-balance">
            Our senior researcher synthesizes findings, validates information, and structures the final report.
          </p>
          <ul className="space-y-2">
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-brand-purple-DEFAULT mr-2 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-300">Information synthesis and validation</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-brand-purple-DEFAULT mr-2 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-300">Structured report generation</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-brand-purple-DEFAULT mr-2 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-300">Quality assurance and fact-checking</span>
            </li>
          </ul>
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="h-5 w-5 text-brand-purple-DEFAULT" />
          </div>
        </div>
      </div>
    </section>
  )
}
