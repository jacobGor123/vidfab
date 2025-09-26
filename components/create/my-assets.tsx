"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FolderOpen, Download, Trash2, Play, Loader2, AlertTriangle, Sparkles } from "lucide-react"
import { useVideoContext } from "@/lib/contexts/video-context"
import { UserVideosDB } from "@/lib/database/user-videos"
import { UserVideo } from "@/lib/supabase"
import { VideoResult } from "@/lib/types/video"
import { StorageUtils } from "@/lib/utils/storage-helpers"
import { toast } from "sonner"


export function MyAssets() {
  const videoContext = useVideoContext()
  const { data: session, status: sessionStatus } = useSession()
  const [videos, setVideos] = useState<UserVideo[]>([])
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    processing: 0,
    storageUsed: 0
  })
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [isCleaningUp, setIsCleaningUp] = useState(false)

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

      if (sessionStatus === 'loading') {
        return
      }

      if (sessionStatus === 'unauthenticated' || !session?.user?.uuid) {
        toast.error('Please log in to view your videos')
        setStats({ total: 0, completed: 0, processing: 0, storageUsed: 0 })
        setVideos([])
        return
      }

      const userId = session.user.uuid

      try {
        // 🔥 新架构：首先从API获取数据库中的永久视频

        const response = await fetch(`/api/user/videos?page=1&limit=50&orderBy=created_at&orderDirection=desc`)

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`)
        }

        const apiData = await response.json()

        if (!apiData.success) {
          throw new Error(apiData.error || 'API returned success=false')
        }

        const permanentVideos = apiData.data.videos || []

        // 🔥 My Assets只显示永久存储的数据，不包含临时数据
        const allVideos = permanentVideos.map(video => ({
          ...video,
          _isTemporary: false
        })).sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        setVideos(allVideos)

        const videoStats = {
          total: allVideos.length,
          completed: allVideos.filter(v => v.status === 'completed').length,
          processing: allVideos.filter(v => ['processing', 'generating', 'downloading'].includes(v.status)).length,
          storageUsed: allVideos
            .filter(v => v.status === 'completed' && v.file_size)
            .reduce((total, v) => total + (v.file_size || 0), 0) / (1024 * 1024) // Convert to MB
        }

        setStats(videoStats)


      } catch (dbError) {
        console.error('❌ API/Database query failed:', dbError)
        toast.error('Failed to load videos from database')

        // 🔥 My Assets只显示永久数据，数据库不可用时显示空状态
        setVideos([])
        setStats({ total: 0, completed: 0, processing: 0, storageUsed: 0 })
      }


    } catch (error) {
      console.error('Failed to load user data:', error)
      toast.error('Failed to load your videos')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.uuid, sessionStatus])

  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  // Use all videos without filtering
  const filteredVideos = videos

  const loadMoreVideos = async () => {
    if (!session?.user?.uuid) {
      toast.error('Please log in to load videos')
      return
    }

    try {
      const moreVideos = await UserVideosDB.getUserVideos(session.user.uuid, {
        page: currentPage + 1,
        limit: 50,
        orderBy: 'created_at',
        orderDirection: 'desc'
      })

      setCurrentPage(prev => prev + 1)
      setVideos(prev => [...prev, ...moreVideos.videos])
    } catch (error) {
      console.error('Failed to load more videos:', error)
      toast.error('Failed to load more videos')
    }
  }

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this video? This action cannot be undone.")) {
      return
    }

    if (!session?.user?.uuid) {
      toast.error('Please log in to delete videos')
      return
    }

    try {
      await UserVideosDB.deleteVideo(videoId, session.user.uuid)
      setVideos(prev => prev.filter(v => v.id !== videoId))
      toast.success("Video deleted successfully")
      // Refresh stats after deletion
      await loadUserData()
    } catch (error) {
      console.error('Failed to delete video:', error)
      toast.error('Failed to delete video')
    }
  }


  const handleCleanupStorage = async () => {
    if (!confirm("This will automatically delete your oldest non-favorite videos to free up storage space. Are you sure?")) {
      return
    }

    if (!session?.user?.uuid) {
      toast.error('Please log in to cleanup storage')
      return
    }

    try {
      setIsCleaningUp(true)
      const result = await UserVideosDB.cleanupUserStorage(session.user.uuid)

      if (result.deletedVideos > 0) {
        toast.success(`Cleaned up ${result.deletedVideos} videos, freed ${result.freedSizeMB.toFixed(1)}MB`)
        await loadUserData() // Refresh data
      } else {
        toast.info("No cleanup needed - storage is within limits")
      }
    } catch (error) {
      console.error('Failed to cleanup storage:', error)
      toast.error('Failed to cleanup storage')
    } finally {
      setIsCleaningUp(false)
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
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-brand-cyan-DEFAULT">
                {StorageUtils.formatStorageSize(StorageUtils.mbToBytes(stats.storageUsed))}
              </div>
              <div className="text-sm text-gray-400">Storage Used</div>
              {videoContext.quotaInfo && (
                <div className="text-xs text-gray-500 mt-1">
                  {videoContext.quotaInfo.storage_percentage.toFixed(1)}% used
                  {videoContext.quotaInfo.is_subscribed ? ' (Pro)' : ' (Free)'}
                </div>
              )}
            </div>
            {videoContext.quotaInfo && videoContext.quotaInfo.storage_percentage > 80 && (
              <div className="flex items-center">
                <AlertTriangle
                  className={`w-5 h-5 ml-2 ${
                    videoContext.quotaInfo.storage_percentage > 95 ? 'text-red-400' : 'text-yellow-400'
                  }`}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Storage Warning Banner */}
      {videoContext.quotaInfo && videoContext.quotaInfo.storage_percentage > 80 && (
        <div className={`rounded-lg p-4 border ${
          videoContext.quotaInfo.storage_percentage > 95
            ? 'bg-red-900/20 border-red-800 text-red-300'
            : 'bg-yellow-900/20 border-yellow-800 text-yellow-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <div className="font-medium">
                  {videoContext.quotaInfo.storage_percentage > 95
                    ? '存储空间即将用尽'
                    : '存储空间使用量较高'}
                </div>
                <div className="text-sm opacity-80">
                  已使用 {videoContext.quotaInfo.current_size_mb.toFixed(1)}MB / {videoContext.quotaInfo.max_size_mb.toFixed(0)}MB
                  {!videoContext.quotaInfo.is_subscribed && ' (免费账户限制)'}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!videoContext.quotaInfo.is_subscribed && (
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-brand-purple-DEFAULT to-brand-cyan-DEFAULT hover:from-brand-purple-600 hover:to-brand-cyan-600"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  升级到Pro
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleCleanupStorage}
                disabled={isCleaningUp}
                className="border-current text-current hover:bg-current/10"
              >
                {isCleaningUp ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {isCleaningUp ? '清理中...' : '自动清理'}
              </Button>
            </div>
          </div>
        </div>
      )}


      {/* Assets List */}
      <div className="space-y-4">
        {filteredVideos.map((video) => {
          // 🔥 确定永久存储视频的URL和缩略图
          const videoUrl = video.storage_path
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/videos/${video.storage_path}` // 优先使用本地存储
            : video.original_url // 回退：如果没有本地存储，使用原始URL

          // 缩略图逻辑：只处理永久存储视频的缩略图
          const thumbnailUrl = video.thumbnail_path
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/videos/${video.thumbnail_path}` // Supabase存储的缩略图
            : null // 没有缩略图

          // 🔥 如果没有缩略图但有视频URL，使用视频作为预览源
          const shouldUseVideoPreview = !thumbnailUrl && videoUrl


          return (
            <Card key={video.id} className="bg-gray-950 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Thumbnail / Video Preview */}
                    <div className="w-20 h-14 bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden relative">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={video.prompt || 'Video thumbnail'}
                          className="w-full h-full object-cover"
                        />
                      ) : shouldUseVideoPreview ? (
                        <video
                          src={videoUrl}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                          poster=""
                          onError={(e) => {
                            // 如果视频加载失败，隐藏video元素，显示播放图标
                            e.currentTarget.style.display = 'none'
                            const playIcon = e.currentTarget.nextElementSibling as HTMLElement
                            if (playIcon) playIcon.style.display = 'flex'
                          }}
                        />
                      ) : null}

                      {/* 🔥 回退播放图标 - 当没有缩略图且视频预览失败时显示 */}
                      {!thumbnailUrl && (
                        <div
                          className={`absolute inset-0 flex items-center justify-center ${shouldUseVideoPreview ? 'hidden' : 'flex'}`}
                        >
                          <Play className="w-5 h-5 text-gray-500 ml-1" />
                        </div>
                      )}

                      {/* 🔥 预览按钮覆盖层 */}
                      {videoUrl && (
                        <div
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => {
                            // 在模态框中播放视频
                            const modal = document.createElement('div')
                            modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50'
                            modal.innerHTML = `
                              <div class="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
                                <video
                                  controls
                                  autoplay
                                  class="max-w-full max-h-full rounded-lg"
                                  src="${videoUrl}"
                                >
                                  Your browser does not support video playback.
                                </video>
                                <button
                                  class="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70"
                                  onclick="this.closest('.fixed').remove()"
                                >
                                  ×
                                </button>
                              </div>
                            `
                            document.body.appendChild(modal)

                            // 点击背景关闭
                            modal.addEventListener('click', (e) => {
                              if (e.target === modal) {
                                modal.remove()
                              }
                            })
                          }}
                        >
                          <Play className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Video Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1 line-clamp-1">
                        {video.prompt && video.prompt.trim() ? video.prompt : 'AI Generated Video'}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>
                          {video.settings?.model === 'image-to-video' ? 'Image to Video' : 'Text to Video'}
                        </span>
                        <span>{video.settings?.duration || '5s'}</span>
                        <span>{video.settings?.resolution || '1280x720'}</span>
                        <span>
                          {video.created_at && !isNaN(new Date(video.created_at).getTime())
                            ? new Date(video.created_at).toLocaleDateString()
                            : 'Recently created'}
                        </span>
                        {video.file_size && video.file_size > 0 && (
                          <span>{StorageUtils.formatStorageSize(video.file_size)}</span>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(video.status || 'unknown')}`}>
                      {(video.status || 'unknown').charAt(0).toUpperCase() + (video.status || 'unknown').slice(1)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">

                    {/* Download button */}
                    {video.status === "completed" && videoUrl && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-gray-400 hover:text-white hover:bg-gray-800"
                        onClick={async () => {
                          try {
                            // 🔥 优化下载逻辑，处理CORS问题
                            if (video.storage_path) {
                              // 本地存储的视频，直接下载
                              const link = document.createElement('a')
                              link.href = videoUrl
                              link.download = `vidfab-video-${video.id}.mp4`
                              document.body.appendChild(link)
                              link.click()
                              document.body.removeChild(link)
                            } else {
                              // 外部URL，尝试通过fetch下载（避免CORS问题）
                              toast.info('开始下载视频...')

                              const response = await fetch(videoUrl, {
                                mode: 'no-cors' // 尝试避免CORS限制
                              })

                              if (response.ok || response.type === 'opaque') {
                                const link = document.createElement('a')
                                link.href = videoUrl
                                link.download = `vidfab-video-${video.id}.mp4`
                                link.target = '_blank' // 在新标签页打开，让用户手动下载
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                                toast.success('视频下载已开始')
                              } else {
                                throw new Error('视频下载失败')
                              }
                            }
                          } catch (error) {
                            console.error('下载视频失败:', error)
                            // 🔥 如果下载失败，在新标签页打开视频
                            window.open(videoUrl, '_blank')
                            toast.info('已在新标签页打开视频，可右键保存')
                          }
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Delete button */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-gray-400 hover:text-red-400 hover:bg-red-400/10"
                      onClick={() => handleDeleteVideo(video.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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