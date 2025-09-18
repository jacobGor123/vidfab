"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FolderOpen, Search, Filter, Download, Share2, Trash2, Play, Heart, Eye, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useVideoContext } from "@/lib/contexts/video-context"
import { UserVideosDB } from "@/lib/database/user-videos"
import { UserVideo } from "@/lib/supabase"
import { toast } from "sonner"


export function MyAssets() {
  const videoContext = useVideoContext()
  const [videos, setVideos] = useState<UserVideo[]>([])
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    processing: 0,
    storageUsed: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [currentPage, setCurrentPage] = useState(1)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-400"
      case "downloading":
      case "processing": return "text-yellow-400"
      case "generating": return "text-blue-400"
      case "failed": return "text-red-400"
      default: return "text-gray-400"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-400/10 text-green-400"
      case "downloading":
      case "processing": return "bg-yellow-400/10 text-yellow-400"
      case "generating": return "bg-blue-400/10 text-blue-400"
      case "failed": return "bg-red-400/10 text-red-400"
      default: return "bg-gray-400/10 text-gray-400"
    }
  }

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true)

      // Load videos from context (which loads from database)
      await videoContext.loadCompletedVideos(1)
      setVideos(videoContext.completedVideos)

      // Load quota info
      await videoContext.refreshQuotaInfo()

      // Calculate stats (this could be optimized with a dedicated API)
      const videoStats = {
        total: videoContext.totalVideos,
        completed: videoContext.completedVideos.length,
        processing: videoContext.activeJobs.filter(job =>
          ['processing', 'generating', 'downloading'].includes(job.status)
        ).length,
        storageUsed: videoContext.quotaInfo?.current_size_mb || 0
      }

      setStats(videoStats)
    } catch (error) {
      console.error('Failed to load user data:', error)
      toast.error('Failed to load your videos')
    } finally {
      setLoading(false)
    }
  }, [videoContext])

  useEffect(() => {
    loadUserData()
  }, [])

  // Filter videos based on search and category
  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.prompt.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" ||
      (selectedCategory === "Recent" && new Date(video.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
      (selectedCategory === "Favorites" && video.is_favorite) ||
      (selectedCategory === "Completed" && video.status === 'completed')

    return matchesSearch && matchesCategory
  })

  const assetCategories = [
    { name: "All", count: videos.length },
    { name: "Recent", count: videos.filter(v => new Date(v.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length },
    { name: "Favorites", count: videos.filter(v => v.is_favorite).length },
    { name: "Completed", count: videos.filter(v => v.status === 'completed').length },
  ]

  const loadMoreVideos = async () => {
    try {
      await videoContext.loadCompletedVideos(currentPage + 1)
      setCurrentPage(prev => prev + 1)
      setVideos(videoContext.completedVideos)
    } catch (error) {
      console.error('Failed to load more videos:', error)
      toast.error('Failed to load more videos')
    }
  }

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this video? This action cannot be undone.")) {
      return
    }

    try {
      await videoContext.deleteVideo(videoId)
      setVideos(prev => prev.filter(v => v.id !== videoId))
      toast.success("Video deleted successfully")
      // Refresh stats after deletion
      await loadUserData()
    } catch (error) {
      console.error('Failed to delete video:', error)
      toast.error('Failed to delete video')
    }
  }

  const handleToggleFavorite = async (videoId: string) => {
    try {
      const newStatus = await videoContext.toggleVideoFavorite(videoId)
      setVideos(prev => prev.map(v =>
        v.id === videoId ? { ...v, is_favorite: newStatus } : v
      ))
      toast.success(newStatus ? "Added to favorites" : "Removed from favorites")
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      toast.error('Failed to update favorite status')
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span className="text-gray-400">Loading your videos...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-y-auto p-6 space-y-6 custom-scrollbar">

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-gray-400">Total Videos</div>
        </div>
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
          <div className="text-sm text-gray-400">Completed</div>
        </div>
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">{stats.processing}</div>
          <div className="text-sm text-gray-400">Processing</div>
        </div>
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-brand-cyan-DEFAULT">
            {stats.storageUsed.toFixed(1)}MB
          </div>
          <div className="text-sm text-gray-400">Storage Used</div>
          {videoContext.quotaInfo && (
            <div className="text-xs text-gray-500 mt-1">
              {videoContext.quotaInfo.storage_percentage.toFixed(1)}% used
            </div>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search your videos..."
            className="pl-10 bg-gray-900 border-gray-700 text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
          onClick={() => setSearchQuery("")}
        >
          <Filter className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {assetCategories.map((category) => (
          <button
            key={category.name}
            onClick={() => setSelectedCategory(category.name)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === category.name
                ? 'bg-brand-cyan-DEFAULT text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-brand-cyan-DEFAULT hover:text-white'
            }`}
          >
            {category.name} ({category.count})
          </button>
        ))}
      </div>

      {/* Assets List */}
      <div className="space-y-4">
        {filteredVideos.map((video) => {
          const thumbnailUrl = video.thumbnail_path
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/videos/${video.thumbnail_path}`
            : null

          return (
            <Card key={video.id} className="bg-gray-950 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Thumbnail */}
                    <div className="w-20 h-14 bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={video.prompt}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Play className="w-5 h-5 text-gray-500 ml-1" />
                      )}
                    </div>

                    {/* Video Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1 line-clamp-1">{video.prompt}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>Text to Video</span>
                        <span>{video.settings.duration}</span>
                        <span>{video.settings.resolution}</span>
                        <span>{new Date(video.created_at).toLocaleDateString()}</span>
                        {video.file_size && (
                          <span>{Math.round(video.file_size / (1024 * 1024) * 100) / 100}MB</span>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(video.status)}`}>
                      {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {/* Favorite button */}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleToggleFavorite(video.id)}
                      className={`hover:bg-gray-800 ${
                        video.is_favorite ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${video.is_favorite ? 'fill-current' : ''}`} />
                    </Button>

                    {video.status === "completed" && video.storage_path && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-gray-400 hover:text-white hover:bg-gray-800"
                          onClick={() => {
                            const videoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/videos/${video.storage_path}`
                            const link = document.createElement('a')
                            link.href = videoUrl
                            link.download = `vidfab-video-${video.id}.mp4`
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-gray-400 hover:text-white hover:bg-gray-800"
                          onClick={async () => {
                            const videoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/videos/${video.storage_path}`
                            try {
                              await navigator.clipboard.writeText(videoUrl)
                              toast.success("Video link copied to clipboard")
                            } catch (error) {
                              toast.error("Failed to copy link")
                            }
                          }}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-gray-400 hover:text-red-400 hover:bg-red-400/10"
                      onClick={() => handleDeleteVideo(video.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>

                    {/* View count */}
                    {video.view_count > 0 && (
                      <div className="flex items-center space-x-1 text-xs text-gray-500 ml-2">
                        <Eye className="w-3 h-3" />
                        <span>{video.view_count}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State - shown when no assets */}
      {filteredVideos.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
            <FolderOpen className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No videos yet</h3>
          <p className="text-gray-500 mb-6">Start creating your first video to see it here</p>
          <Button className="bg-gradient-to-r from-brand-purple-DEFAULT to-brand-cyan-DEFAULT hover:from-brand-purple-600 hover:to-brand-cyan-600">
            Create First Video
          </Button>
        </div>
      )}

      {/* Pagination */}
      {videoContext.hasMore && filteredVideos.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
            onClick={loadMoreVideos}
          >
            Load More Videos
          </Button>
        </div>
      )}
    </div>
  )
}