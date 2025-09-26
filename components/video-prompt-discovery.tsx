"use client"

import React, { useState, useMemo } from 'react'
import { CategoryTabs, useCategoryFilter } from '@/components/ui/category-tabs'
import { VideoPromptCategory } from '@/types/video-prompts'
import { promptClassifier } from '@/utils/video-prompt-classifier'
import { generateCategoryReport, getCategoryCounts } from '@/utils/video-prompt-demo'
import { cn } from '@/lib/utils'
import { Search, Copy, Check, BarChart3, Sparkles } from 'lucide-react'

interface VideoPromptCardProps {
  prompt: {
    id: string
    content: string
    category: VideoPromptCategory
    confidence: number
    tags?: string[]
  }
  onCopy?: () => void
}

const VideoPromptCard: React.FC<VideoPromptCardProps> = ({ prompt, onCopy }) => {
  const [copied, setCopied] = useState(false)
  const categoryInfo = promptClassifier.getCategory(prompt.category)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt.content)
      setCopied(true)
      onCopy?.()
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 hover:bg-white/10 transition-all duration-200 border border-white/10">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <p className="text-white text-sm leading-relaxed">{prompt.content}</p>
        </div>
        <button
          onClick={handleCopy}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
          title="Copy prompt"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded-full">
            {categoryInfo?.name || 'Unknown'}
          </span>
          <span className="text-gray-400">
            {Math.round(prompt.confidence * 100)}% confidence
          </span>
        </div>

        {prompt.tags && prompt.tags.length > 0 && (
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-yellow-400" />
            <span className="text-gray-400">{prompt.tags.length} keywords</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, description, icon }) => (
  <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 bg-blue-600/20 rounded-lg">
        {icon}
      </div>
      <div>
        <h3 className="text-white font-semibold text-lg">{value}</h3>
        <p className="text-gray-300 text-sm">{title}</p>
      </div>
    </div>
    <p className="text-gray-400 text-xs">{description}</p>
  </div>
)

export const VideoPromptDiscovery: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const { activeCategory, setActiveCategory, filterItems } = useCategoryFilter()

  // 生成演示数据
  const report = useMemo(() => generateCategoryReport(), [])
  const categories = promptClassifier.getCategories()
  const counts = getCategoryCounts(report.prompts)

  // 过滤提示词
  const filteredPrompts = useMemo(() => {
    let filtered = filterItems(report.prompts)

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(prompt =>
        prompt.content.toLowerCase().includes(searchLower) ||
        prompt.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    return filtered
  }, [activeCategory, searchTerm, report.prompts, filterItems])

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Video Prompt Discovery
          </h1>
          <p className="text-gray-400 text-lg">
            Explore and discover AI video generation prompts organized by intelligent categories
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Prompts"
            value={report.summary.totalPrompts}
            description="Categorized video prompts"
            icon={<BarChart3 className="w-5 h-5 text-blue-400" />}
          />
          <StatsCard
            title="Most Popular"
            value={report.summary.mostPopularCategory}
            description="Category with most prompts"
            icon={<Sparkles className="w-5 h-5 text-purple-400" />}
          />
          <StatsCard
            title="Avg Confidence"
            value={`${(report.summary.averageConfidence * 100).toFixed(1)}%`}
            description="Classification accuracy"
            icon={<BarChart3 className="w-5 h-5 text-green-400" />}
          />
          <StatsCard
            title="Languages"
            value={`${report.summary.languageDistribution.english + report.summary.languageDistribution.chinese}`}
            description="English & Chinese prompts"
            icon={<BarChart3 className="w-5 h-5 text-yellow-400" />}
          />
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-8">
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            counts={counts}
          />
        </div>

        {/* Results */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {filteredPrompts.length} {filteredPrompts.length === 1 ? 'Prompt' : 'Prompts'}
              {searchTerm && (
                <span className="text-gray-400 font-normal"> matching "{searchTerm}"</span>
              )}
            </h2>
          </div>

          {filteredPrompts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPrompts.map((prompt) => (
                <VideoPromptCard
                  key={prompt.id}
                  prompt={prompt}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No prompts found</p>
                <p className="text-sm">Try adjusting your search or category filter</p>
              </div>
            </div>
          )}
        </div>

        {/* Category Distribution */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Category Distribution</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {report.stats
              .filter(stat => stat.category !== VideoPromptCategory.ALL)
              .map((stat) => {
                const categoryInfo = promptClassifier.getCategory(stat.category)
                return (
                  <div
                    key={stat.category}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <div className="text-center">
                      <h3 className="text-white font-medium mb-2">
                        {categoryInfo?.name || 'Unknown'}
                      </h3>
                      <div className="text-2xl font-bold text-blue-400 mb-1">
                        {stat.count}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {stat.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}