"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FolderOpen, Download, Trash2, Play, Loader2, AlertTriangle, Sparkles } from "lucide-react"
import { useVideoContext } from "@/lib/contexts/video-context"
import { UserVideosDB } from "@/lib/database/user-videos"
import { UserVideo } from "@/lib/supabase"
import { VideoResult } from "@/lib/types/video"
import { StorageUtils } from "@/lib/utils/storage-helpers"
import { toast } from "sonner"
import { VideoSkeleton, EmptyVideosSkeleton } from "./video-skeleton"


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
  const [currentPage, setCurrentPage] = useState(1)
  const [isCleaningUp, setIsCleaningUp] = useState(false)

  // Enhanced loading states
  const [loadingState, setLoadingState] = useState<{
    isInitialLoading: boolean
    isDataLoaded: boolean
    hasError: boolean
  }>({
    isInitialLoading: true,
    isDataLoaded: false,
    hasError: false
  })

  // Alert dialog states
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; videoId: string | null }>({
    open: false,
    videoId: null
  })
  const [cleanupDialog, setCleanupDialog] = useState(false)

  // Track videos being deleted for loading states
  const [deletingVideoIds, setDeletingVideoIds] = useState<Set<string>>(new Set())

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
      // Only show initial loading on first load
      if (!loadingState.isDataLoaded) {
        setLoadingState(prev => ({ ...prev, isInitialLoading: true, hasError: false }))
      }

      if (sessionStatus === 'loading') {
        return
      }

      if (sessionStatus === 'unauthenticated' || !session?.user?.uuid) {
        toast.error('Please log in to view your videos')
        setStats({ total: 0, completed: 0, processing: 0, storageUsed: 0 })
        setVideos([])
        setLoadingState({ isInitialLoading: false, isDataLoaded: true, hasError: false })
        return
      }

      const userId = session.user.uuid

      try {
        // 🔥 New architecture: First get permanent videos from database via API

        const response = await fetch(`/api/user/videos?page=1&limit=50&orderBy=created_at&orderDirection=desc`)

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`)
        }

        const apiData = await response.json()

        if (!apiData.success) {
          throw new Error(apiData.error || 'API returned success=false')
        }

        const permanentVideos = apiData.data.videos || []
        console.log(`📡 API returned ${permanentVideos.length} videos:`, permanentVideos.map(v => ({
          id: v.id,
          status: v.status,
          prompt: v.prompt?.substring(0, 30) + '...'
        })))

        // 🔥 My Assets only shows permanent storage data, no temporary data
        const allVideos = permanentVideos.map(video => ({
          ...video,
          _isTemporary: false
        })).sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        console.log(`📊 Final processed videos: ${allVideos.length}`)
        setVideos(allVideos)

        const videoStats = {
          total: allVideos.length,
          completed: allVideos.filter(v => v.status === 'completed').length,
          processing: allVideos.filter(v => ['processing', 'generating', 'downloading'].includes(v.status)).length,
          storageUsed: 0 // Now using videoContext.quotaInfo for storage data
        }

        setStats(videoStats)
        setLoadingState({ isInitialLoading: false, isDataLoaded: true, hasError: false })


      } catch (dbError) {
        console.error('❌ API/Database query failed:', dbError)
        toast.error('Failed to load videos from database')

        // 🔥 My Assets only shows permanent data, show empty state when database unavailable
        setVideos([])
        setStats({ total: 0, completed: 0, processing: 0, storageUsed: 0 })
        setLoadingState({ isInitialLoading: false, isDataLoaded: true, hasError: true })
      }


    } catch (error) {
      console.error('Failed to load user data:', error)
      toast.error('Failed to load your videos')
      setLoadingState({ isInitialLoading: false, isDataLoaded: true, hasError: true })
    }
  }, [session?.user?.uuid, sessionStatus, loadingState.isDataLoaded])

  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  // 🔥 Refresh storage quota when switching to my-assets page
  useEffect(() => {
    console.log(`📊 MyAssets component mounted, refreshing storage quota...`)
    if (sessionStatus === 'authenticated' && session?.user?.uuid) {
      videoContext.refreshQuotaInfo()
        .then(() => console.log(`✅ Storage quota refreshed on page switch`))
        .catch(error => console.error(`❌ Failed to refresh storage quota:`, error))
    }
  }, [sessionStatus, session?.user?.uuid, videoContext])

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

  const openDeleteDialog = (videoId: string) => {
    setDeleteDialog({ open: true, videoId })
  }

  const confirmDeleteVideo = async () => {
    const videoId = deleteDialog.videoId
    if (!videoId) return

    // Close dialog first
    setDeleteDialog({ open: false, videoId: null })

    if (!session?.user?.uuid) {
      toast.error('Please log in to delete videos')
      return
    }

    try {
      console.log(`🗑️ Starting video deletion: ${videoId}`)
      console.log(`🔍 User UUID: ${session.user.uuid}`)

      // Add to deleting state for loading effect
      setDeletingVideoIds(prev => new Set([...prev, videoId]))

      // Call enhanced delete API with detailed logging
      console.log(`📡 Calling enhanced delete API...`)
      const deleteResponse = await fetch(`/api/user/videos/delete?videoId=${encodeURIComponent(videoId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const deleteResult = await deleteResponse.json()
      console.log(`📡 Delete API response:`, deleteResult)

      if (!deleteResponse.ok || !deleteResult.success) {
        throw new Error(deleteResult.error || `Delete API failed with status: ${deleteResponse.status}`)
      }

      console.log(`✅ Delete API completed successfully:`, deleteResult.data)

      console.log(`✅ Video deletion verified successfully: ${videoId}`)

      // Remove from deleting state
      setDeletingVideoIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(videoId)
        return newSet
      })

      toast.success("Video deleted successfully")

      // 🔥 Force reload data from server to verify deletion
      console.log(`🔄 Reloading data to verify deletion...`)
      // Don't show skeleton during deletion reload since it's a background refresh
      const currentLoadingState = loadingState
      await loadUserData()
      // Restore loading state to prevent skeleton flash
      setLoadingState(prev => ({ ...prev, isInitialLoading: false }))

      // 🔥 Refresh storage quota info after deletion
      console.log(`📊 Refreshing storage quota after deletion...`)
      await videoContext.refreshQuotaInfo()
      console.log(`✅ Storage quota refreshed`)

    } catch (error) {
      console.error('❌ Video deletion failed:', error)
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        videoId,
        userId: session.user.uuid
      })

      // Remove from deleting state on failure
      setDeletingVideoIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(videoId)
        return newSet
      })

      // Show detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Delete failed: ${errorMessage}`)

      // 🔥 Reload data to restore correct state
      console.log(`🔄 Reloading data after deletion failure...`)
      // Don't show skeleton during error recovery reload
      await loadUserData()
      setLoadingState(prev => ({ ...prev, isInitialLoading: false }))
    }
  }


  const openCleanupDialog = () => {
    setCleanupDialog(true)
  }

  const confirmCleanupStorage = async () => {
    // Close dialog first
    setCleanupDialog(false)

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
        setLoadingState(prev => ({ ...prev, isInitialLoading: false }))

        // 🔥 Refresh storage quota info after cleanup
        console.log(`📊 Refreshing storage quota after cleanup...`)
        await videoContext.refreshQuotaInfo()
        console.log(`✅ Storage quota refreshed`)
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

  // Show skeleton during initial loading
  if (loadingState.isInitialLoading) {
    // If we don't know if there will be data yet, show content skeleton
    return <VideoSkeleton count={5} />
  }

  // Show empty skeleton if we know there's no data
  if (loadingState.isDataLoaded && videos.length === 0 && !loadingState.hasError) {
    // We could show EmptyVideosSkeleton briefly, but let's go directly to the real empty state
    // This prevents the flash you mentioned
  }

  return (
    <div className="h-screen flex flex-col p-6">

      {/* Storage Rules Notice */}
      <div className="flex-none mb-4">
        <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            </div>
            <div className="text-sm text-blue-200">
              <strong className="text-blue-100">Storage Rules:</strong>
              <ul className="block mt-1">
                 <li>All users: 1GB maximum storage limit</li>
                 <li>{videoContext.quotaInfo?.is_subscribed ? (
                  <span> Pro users: Videos stored permanently during subscription</span>
                ) : (
                  <span> Free users: Videos auto-deleted 24 hours after completion</span>
                )}</li>
                <li> When storage exceeds 1GB: Oldest videos deleted automatically</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Header: Stats */}
      <div className="flex-none mb-6">
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
              <div className="flex-1">
                {/* 🔥 存储配额数据显示 - 支持 loading 状态 */}
                {videoContext.quotaLoading ? (
                  // Loading 状态显示
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-700 rounded w-24 mb-1"></div>
                    <div className="h-4 bg-gray-700 rounded w-20 mb-3"></div>
                    <div className="mt-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-800 rounded-full h-2">
                          <div className="h-2 bg-gray-600 rounded-full w-1/3 animate-pulse"></div>
                        </div>
                        <div className="h-3 bg-gray-700 rounded w-8"></div>
                      </div>
                      <div className="h-3 bg-gray-700 rounded w-24 mt-1"></div>
                    </div>
                  </div>
                ) : (
                  // 实际数据显示
                  <>
                    <div className="text-2xl font-bold text-brand-cyan-DEFAULT transition-all duration-300">
                      {videoContext.quotaInfo ?
                        `${videoContext.quotaInfo.current_size_mb.toFixed(0)}MB` :
                        '0B'}
                    </div>
                    <div className="text-sm text-gray-400">Storage Used</div>
                    {/* 🔥 临时调试 */}
                    {console.log('🔥 quotaInfo debug:', videoContext.quotaInfo)}
                    {console.log('🔥 current_size_mb:', videoContext.quotaInfo?.current_size_mb)}
                    {videoContext.quotaInfo && (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-800 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                videoContext.quotaInfo.storage_percentage > 90
                                  ? 'bg-red-500'
                                  : videoContext.quotaInfo.storage_percentage > 70
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(videoContext.quotaInfo.storage_percentage, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 min-w-0 transition-all duration-300">
                            {videoContext.quotaInfo.storage_percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 transition-all duration-300">
                          {videoContext.quotaInfo.current_size_mb.toFixed(1)}MB / 1GB
                          {videoContext.quotaInfo.is_subscribed ? ' (Pro)' : ' (Free)'}
                        </div>
                        {!videoContext.quotaInfo.is_subscribed && videoContext.quotaInfo.current_videos > 0 && (
                          <div className="text-xs text-orange-400 mt-1">
                            Videos expire 24h after completion
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              {!videoContext.quotaLoading && videoContext.quotaInfo && videoContext.quotaInfo.storage_percentage > 80 && (
                <div className="flex items-center ml-3 transition-opacity duration-300">
                  <AlertTriangle
                    className={`w-5 h-5 ${
                      videoContext.quotaInfo.storage_percentage > 95 ? 'text-red-400' : 'text-yellow-400'
                    }`}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Storage Warning Banner */}
      {!videoContext.quotaLoading && videoContext.quotaInfo && videoContext.quotaInfo.storage_percentage > 80 && (
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
                    ? 'Storage space almost full'
                    : 'Storage usage is high'}
                </div>
                <div className="text-sm opacity-80">
                  Used {videoContext.quotaInfo.current_size_mb.toFixed(1)}MB / {videoContext.quotaInfo.max_size_mb.toFixed(0)}MB
                  {!videoContext.quotaInfo.is_subscribed && ' (Free account limit)'}
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
                  Upgrade to Pro
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={openCleanupDialog}
                disabled={isCleaningUp}
                className="border-current text-current hover:bg-current/10"
              >
                {isCleaningUp ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {isCleaningUp ? 'Cleaning...' : 'Auto Cleanup'}
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Scrollable Content: Assets List */}
      <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2 pb-10">
        {filteredVideos.map((video) => {
          // 🔥 Determine URL and thumbnail for permanent storage video
          const videoUrl = video.storage_path
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/videos/${video.storage_path}` // Prefer local storage
            : video.original_url // Fallback: use original URL if no local storage

          // Thumbnail logic: only handle thumbnails for permanent storage videos
          const thumbnailUrl = video.thumbnail_path
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/videos/${video.thumbnail_path}` // Supabase stored thumbnail
            : null // No thumbnail

          // 🔥 If no thumbnail but has video URL, use video as preview source
          const shouldUseVideoPreview = !thumbnailUrl && videoUrl

          // Check if this video is being deleted
          const isDeleting = deletingVideoIds.has(video.id)

          return (
            <Card key={video.id} className="bg-gray-950 border-gray-800 relative">
              {/* Deleting Overlay */}
              {isDeleting && (
                <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center z-10">
                  <div className="flex items-center space-x-3 text-white">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">Deleting video...</span>
                  </div>
                </div>
              )}
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
                            // If video loading fails, hide video element and show play icon
                            e.currentTarget.style.display = 'none'
                            const playIcon = e.currentTarget.nextElementSibling as HTMLElement
                            if (playIcon) playIcon.style.display = 'flex'
                          }}
                        />
                      ) : null}

                      {/* 🔥 Fallback play icon - shown when no thumbnail and video preview fails */}
                      {!thumbnailUrl && (
                        <div
                          className={`absolute inset-0 flex items-center justify-center ${shouldUseVideoPreview ? 'hidden' : 'flex'}`}
                        >
                          <Play className="w-5 h-5 text-gray-500 ml-1" />
                        </div>
                      )}

                      {/* 🔥 Preview button overlay */}
                      {videoUrl && (
                        <div
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => {
                            // Play video in modal
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

                            // Click background to close
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
                        disabled={isDeleting}
                        className={`${
                          isDeleting
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                        onClick={async () => {
                          try {
                            // 🔥 Optimize download logic, handle CORS issues
                            if (video.storage_path) {
                              // Local storage video, download directly
                              const link = document.createElement('a')
                              link.href = videoUrl
                              link.download = `vidfab-video-${video.id}.mp4`
                              document.body.appendChild(link)
                              link.click()
                              document.body.removeChild(link)
                            } else {
                              // External URL, try downloading via fetch (avoid CORS issues)
                              toast.info('Starting video download...')

                              const response = await fetch(videoUrl, {
                                mode: 'no-cors' // Try to avoid CORS restrictions
                              })

                              if (response.ok || response.type === 'opaque') {
                                const link = document.createElement('a')
                                link.href = videoUrl
                                link.download = `vidfab-video-${video.id}.mp4`
                                link.target = '_blank' // Open in new tab for manual download
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                                toast.success('Video download started')
                              } else {
                                throw new Error('Video download failed')
                              }
                            }
                          } catch (error) {
                            console.error('Video download failed:', error)
                            // 🔥 If download fails, open video in new tab
                            window.open(videoUrl, '_blank')
                            toast.info('Video opened in new tab, right-click to save')
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
                      disabled={isDeleting}
                      className={`${
                        isDeleting
                          ? 'text-gray-600 cursor-not-allowed'
                          : 'text-gray-400 hover:text-red-400 hover:bg-red-400/10'
                      }`}
                      onClick={() => !isDeleting && openDeleteDialog(video.id)}
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

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
      </div>

      {/* Fixed Footer: Pagination */}
      <div className="flex-none pt-4">
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

      {/* Delete Video Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, videoId: null })}>
        <AlertDialogContent className="bg-gray-950 border border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Video</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this video? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteVideo}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cleanup Storage Confirmation Dialog */}
      <AlertDialog open={cleanupDialog} onOpenChange={setCleanupDialog}>
        <AlertDialogContent className="bg-gray-950 border border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Cleanup Storage</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will automatically delete your oldest videos to free up storage space and enforce the 1GB limit.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCleanupStorage}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Cleanup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}