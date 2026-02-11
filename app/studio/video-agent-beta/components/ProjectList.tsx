/**
 * Video Agent Beta - Project List Component
 * Displays user drafts with premium visuals
 */

'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { VideoAgentProject } from '@/lib/stores/video-agent'
import { Clock, Trash2, ChevronRight, PlayCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { showConfirm, showSuccess, showError, showLoading } from '@/lib/utils/toast'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'

interface ProjectListProps {
  onResume: (project: VideoAgentProject) => void
}

export default function ProjectList({ onResume }: ProjectListProps) {
  const [projects, setProjects] = useState<VideoAgentProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { getProjects, deleteProject } = useVideoAgentAPI()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setIsLoading(true)
    try {
      const data = await getProjects()
      setProjects(data || [])
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmed = await showConfirm(
      'This draft will be permanently deleted.',
      {
        title: 'Delete Draft',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    )
    if (!confirmed) return

    const dismissLoading = showLoading('Deleting draft...')
    try {
      await deleteProject(id)
      dismissLoading()
      setProjects(prev => prev.filter(p => p.id !== id))
      showSuccess('Draft deleted successfully')
    } catch (error) {
      dismissLoading()
      console.error('Failed to delete project:', error)
      showError('Failed to delete draft')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse" />
        ))}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <Card className="bg-slate-900/30 border-slate-800/50 border-dashed backdrop-blur-sm">
        <div className="py-12 text-center">
          <h3 className="text-lg font-semibold text-slate-200 mb-2">No drafts yet</h3>
          <p className="text-sm text-slate-500">
            Start creating your first video above.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map(project => (
        <div
          key={project.id}
          className="group relative border border-slate-800/50 hover:border-slate-700/50 rounded-xl p-8 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
          style={{
            background: 'linear-gradient(to bottom right, #252238, #1a1828, #281a28)'
          }}
          onClick={() => onResume(project)}
        >
          {/* Gradient Glow Effect on Hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/3 group-hover:via-purple-500/3 group-hover:to-pink-500/3 transition-all duration-500" />

          <div className="relative flex justify-between items-start mb-6">
            <div className="flex items-center gap-2">
              <span className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider",
                project.status === 'completed' ? "bg-transparent text-green-500 border-2 border-green-500" :
                  project.status === 'processing' ? "bg-blue-500/10 text-blue-400 border-2 border-blue-500/20" :
                    "bg-slate-800/60 text-slate-500 border-2 border-slate-700/60"
              )}>
                {project.status === 'processing' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                {project.status === 'completed' ? 'READY' : project.status === 'processing' ? 'PROCESSING' : 'DRAFT'}
              </span>

            </div>

            <button
              onClick={(e) => handleDelete(project.id, e)}
              className="text-red-400 hover:text-red-300 transition-colors p-1 rounded-md hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="relative mb-6">
            <h4 className="text-lg font-semibold text-white mb-2">
              {project.story_style.charAt(0).toUpperCase() + project.story_style.slice(1)} Story
            </h4>
            <p className="text-sm text-slate-400 line-clamp-2 h-10 leading-relaxed">
              {project.original_script}
            </p>
          </div>

          <div className="relative flex items-center justify-between pt-6 border-t border-slate-700/30">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDate(project.created_at)}</span>
              <span className="w-1 h-1 rounded-full bg-slate-600 mx-1" />
              <span>{project.duration}s</span>
            </div>

            <div className="text-slate-400 group-hover:translate-x-1 transition-transform duration-300">
              {project.status === 'completed' ? <PlayCircle className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
          </div>
        </div>
      ))
      }
    </div >
  )
}
