"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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
import { FolderOpen, Download, Trash2, Play, Loader2, AlertTriangle, Sparkles, Video } from "lucide-react"
import { useVideoContext } from "@/lib/contexts/video-context"
import { UserVideosDB } from "@/lib/database/user-videos"
import { UserVideo } from "@/lib/supabase"
import { VideoResult } from "@/lib/types/video"
import { StorageUtils } from "@/lib/utils/storage-helpers"
import { UnifiedAsset, UserImage, mergeAssets } from "@/lib/types/asset"
import { toast } from "sonner"
import { VideoSkeleton, EmptyVideosSkeleton } from "./video-skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


export function MyAssets() {
  const videoContext = useVideoContext()
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [videos, setVideos] = useState<UserVideo[]>([])
  const [images, setImages] = useState<UserImage[]>([])
  const [assets, setAssets] = useState<UnifiedAsset[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalVideos, setTotalVideos] = useState(0)
  const [totalImages, setTotalImages] = useState(0)
  const [totalAssets, setTotalAssets] = useState(0)
  const [isCleaningUp, setIsCleaningUp] = useState(false)
  const [isPageChanging, setIsPageChanging] = useState(false)
  const ITEMS_PER_PAGE = 10

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
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; assetId: string | null; assetType: 'image' | 'video' | null }>({
    open: false,
    assetId: null,
    assetType: null
  })
  const [cleanupDialog, setCleanupDialog] = useState(false)

  // Track assets being deleted for loading states
  const [deletingAssetIds, setDeletingAssetIds] = useState<Set<string>>(new Set())

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
      if (sessionStatus === 'loading') {
        return
      }

      if (sessionStatus === 'unauthenticated' || !session?.user?.uuid) {
        toast.error('Please log in to view your videos')
        setVideos([])
        setLoadingState({ isInitialLoading: false, isDataLoaded: true, hasError: false })
        return
      }

      const userId = session.user.uuid

      try {
        // Show loading for page changes
        if (currentPage > 1) {
          setIsPageChanging(true)
        } else {
          setLoadingState(prev => ({ ...prev, isInitialLoading: true, hasError: false }))
        }

        // 🔥 New architecture: First get permanent videos from database via API
        const response = await fetch(`/api/user/videos?page=${currentPage}&limit=${ITEMS_PER_PAGE}&orderBy=created_at&orderDirection=desc`)

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`)
        }

        const apiData = await response.json()

        if (!apiData.success) {
          throw new Error(apiData.error || 'API returned success=false')
        }

        const permanentVideos = apiData.data.videos || []
        const videoPagination = apiData.data.pagination

        console.log(`📡 API returned ${permanentVideos.length} videos for page ${currentPage}:`, permanentVideos.map(v => ({
          id: v.id,
          status: v.status,
          prompt: v.prompt?.substring(0, 30) + '...'
        })))

        // 🔥 New: Load images data
        const imagesResponse = await fetch(`/api/user/images?page=${currentPage}&limit=${ITEMS_PER_PAGE}&orderBy=created_at&orderDirection=desc`)

        if (!imagesResponse.ok) {
          console.warn('⚠️ Failed to load images, continuing with videos only')
        }

        const imagesData = await imagesResponse.json()
        const permanentImages = imagesData.success ? (imagesData.data.images || []) : []
        const imagePagination = imagesData.success ? imagesData.data.pagination : { total: 0 }

        console.log(`📡 API returned ${permanentImages.length} images for page ${currentPage}`)

        // 🔥 Store videos and images separately
        const allVideos = permanentVideos.map(video => ({
          ...video,
          _isTemporary: false
        }))

        setVideos(allVideos)
        setImages(permanentImages)
        setTotalVideos(videoPagination.total)
        setTotalImages(imagePagination.total)

        // 🔥 Merge assets and sort by creation time
        const mergedAssets = mergeAssets(allVideos, permanentImages)
        setAssets(mergedAssets)

        // Calculate total assets and pages
        const totalCount = videoPagination.total + imagePagination.total
        setTotalAssets(totalCount)
        setTotalPages(Math.ceil(totalCount / ITEMS_PER_PAGE))

        console.log(`📊 Final merged assets: ${mergedAssets.length} (${allVideos.length} videos + ${permanentImages.length} images)`)

        setLoadingState({ isInitialLoading: false, isDataLoaded: true, hasError: false })
        setIsPageChanging(false)


      } catch (dbError) {
        console.error('❌ API/Database query failed:', dbError)
        toast.error('Failed to load videos from database')

        // 🔥 My Assets only shows permanent data, show empty state when database unavailable
        setVideos([])
        setLoadingState({ isInitialLoading: false, isDataLoaded: true, hasError: true })
        setIsPageChanging(false)
      }


    } catch (error) {
      console.error('Failed to load user data:', error)
      toast.error('Failed to load your videos')
      setLoadingState({ isInitialLoading: false, isDataLoaded: true, hasError: true })
      setIsPageChanging(false)
    }
  }, [session?.user?.uuid, sessionStatus, currentPage, ITEMS_PER_PAGE])

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

  // Use all assets without filtering
  const filteredAssets = assets

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setCurrentPage(newPage)
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openDeleteDialog = (assetId: string, assetType: 'image' | 'video') => {
    setDeleteDialog({ open: true, assetId, assetType })
  }

  // 🔥 跳转到 Image to Video（参考 remix 逻辑）
  const handleImageToVideo = useCallback((imageUrl: string, prompt: string) => {
    // 存储图片数据到 sessionStorage（5分钟有效期）
    const imageToVideoData = {
      imageUrl,
      prompt: prompt || '',
      timestamp: Date.now()
    }

    sessionStorage.setItem('vidfab-image-to-video', JSON.stringify(imageToVideoData))

    // 跳转到 Image to Video
    router.push('/create?tool=image-to-video')

    toast.success('Image ready for video generation')
  }, [router])

  const confirmDeleteAsset = async () => {
    const { assetId, assetType } = deleteDialog
    if (!assetId || !assetType) return

    // Close dialog first
    setDeleteDialog({ open: false, assetId: null, assetType: null })

    if (!session?.user?.uuid) {
      toast.error(`Please log in to delete ${assetType}s`)
      return
    }

    try {
      console.log(`🗑️ Starting ${assetType} deletion: ${assetId}`)
      console.log(`🔍 User UUID: ${session.user.uuid}`)

      // Add to deleting state for loading effect
      setDeletingAssetIds(prev => new Set([...prev, assetId]))

      // Determine API endpoint based on asset type
      const endpoint = assetType === 'image'
        ? `/api/user/images/delete?imageId=${encodeURIComponent(assetId)}`
        : `/api/user/videos/delete?videoId=${encodeURIComponent(assetId)}`

      // Call delete API
      console.log(`📡 Calling delete API for ${assetType}...`)
      const deleteResponse = await fetch(endpoint, {
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

      // Remove from deleting state
      setDeletingAssetIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(assetId)
        return newSet
      })

      toast.success(`${assetType === 'image' ? 'Image' : 'Video'} deleted successfully`)

      // 🔥 Force reload data from server to verify deletion
      console.log(`🔄 Reloading data to verify deletion...`)

      // If current page becomes empty after deletion, go to previous page
      if (filteredAssets.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1)
      } else {
        await loadUserData()
        // Restore loading state to prevent skeleton flash
        setLoadingState(prev => ({ ...prev, isInitialLoading: false }))
      }

      // 🔥 Refresh storage quota info after deletion (only for videos)
      if (assetType === 'video') {
        console.log(`📊 Refreshing storage quota after deletion...`)
        await videoContext.refreshQuotaInfo()
        console.log(`✅ Storage quota refreshed`)
      }

    } catch (error) {
      console.error(`❌ ${assetType} deletion failed:`, error)
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        assetId,
        assetType,
        userId: session.user.uuid
      })

      // Remove from deleting state on failure
      setDeletingAssetIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(assetId)
        return newSet
      })

      // Show detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Delete failed: ${errorMessage}`)

      // 🔥 Reload data to restore correct state
      console.log(`🔄 Reloading data after deletion failure...`)
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

        // Reset to first page after cleanup
        setCurrentPage(1)
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
  if (loadingState.isDataLoaded && assets.length === 0 && !loadingState.hasError) {
    // We could show EmptyVideosSkeleton briefly, but let's go directly to the real empty state
    // This prevents the flash you mentioned
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* 使用 calc 计算实际可用高度，减去 padding */}
      <div className="h-[calc(100vh-4rem)] max-w-7xl mx-auto w-full p-6 flex flex-col gap-4">

        {/* Storage Info - 新布局 */}
        <div className="flex-shrink-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Storage Rules */}
          <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              </div>
              <div className="text-sm text-blue-200">
                <strong className="text-blue-100">Storage Rules:</strong>
                <ul className="block mt-1 space-y-1">
                  <li>• All users: 1GB maximum storage limit</li>
                  <li>• {videoContext.quotaInfo?.is_subscribed ? (
                    <span>Pro users: Videos stored permanently during subscription</span>
                  ) : (
                    <span>Free users: Videos auto-deleted 24 hours after completion</span>
                  )}</li>
                  <li>• When storage exceeds 1GB: Oldest videos deleted automatically</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Storage Used */}
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
                        `${videoContext.quotaInfo.current_size_mb.toFixed(1)}MB` :
                        '0MB'}
                    </div>
                    <div className="text-sm text-gray-400">Storage Used</div>
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

        {/* 资产列表 - 占据剩余空间 */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {/* Page changing loading overlay */}
          {isPageChanging && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="flex flex-col items-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-cyan-DEFAULT" />
                <span className="text-sm text-gray-300">Loading page {currentPage}...</span>
              </div>
            </div>
          )}

          <div className={`h-full overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 pr-2 transition-opacity duration-200 ${isPageChanging ? 'opacity-30' : 'opacity-100'}`}>
        {filteredAssets.map((asset) => {
          // Check if this asset is being deleted
          const isDeleting = deletingAssetIds.has(asset.id)

          return (
            <Card key={asset.id} className="bg-gray-950 border-gray-800 relative">
              {/* Deleting Overlay */}
              {isDeleting && (
                <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center z-10">
                  <div className="flex items-center space-x-3 text-white">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">Deleting {asset.type}...</span>
                  </div>
                </div>
              )}
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Thumbnail / Preview */}
                    <div className="w-20 h-14 bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden relative">
                      {asset.type === 'image' ? (
                        // 🔥 Image preview
                        <>
                          <img
                            src={asset.previewUrl}
                            alt={asset.prompt || 'Image'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // If image loading fails, show placeholder
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                          {/* Preview overlay for image */}
                          <div
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={() => {
                              // Show image in modal
                              const modal = document.createElement('div')
                              modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50'
                              modal.innerHTML = `
                                <div class="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
                                  <img
                                    class="max-w-full max-h-full rounded-lg"
                                    src="${asset.previewUrl}"
                                    alt="${asset.prompt || 'Image'}"
                                  />
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
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                          </div>
                        </>
                      ) : (
                        // 🔥 Video preview
                        <>
                          {asset.previewUrl ? (
                            <img
                              src={asset.previewUrl}
                              alt={asset.prompt || 'Video thumbnail'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Play className="w-5 h-5 text-gray-500" />
                          )}

                          {/* Preview overlay for video */}
                          {asset.downloadUrl && (
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
                                      src="${asset.downloadUrl}"
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
                        </>
                      )}
                    </div>

                    {/* Asset Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {(() => {
                          const fullPrompt = asset.prompt && asset.prompt.trim() ? asset.prompt : `AI Generated ${asset.type === 'image' ? 'Image' : 'Video'}`
                          const maxLength = 60
                          const truncatedPrompt = fullPrompt.length > maxLength
                            ? fullPrompt.substring(0, maxLength) + '...'
                            : fullPrompt
                          const needsTooltip = fullPrompt.length > maxLength

                          return needsTooltip ? (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <h3 className="font-semibold text-white cursor-help truncate">
                                    {truncatedPrompt}
                                  </h3>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-md bg-gray-900 border border-gray-700 text-gray-200 p-3"
                                >
                                  <p className="text-sm leading-relaxed">{fullPrompt}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <h3 className="font-semibold text-white truncate">
                              {truncatedPrompt}
                            </h3>
                          )
                        })()}
                        {/* 🔥 Asset Type Badge */}
                        <span className={`px-2 py-0.5 text-xs rounded flex-shrink-0 ${
                          asset.type === 'image'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-cyan-500/20 text-cyan-300'
                        }`}>
                          {asset.type === 'image' ? 'Image' : 'Video'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>
                          {asset.createdAt && !isNaN(new Date(asset.createdAt).getTime())
                            ? new Date(asset.createdAt).toLocaleDateString()
                            : 'Recently created'}
                        </span>
                        {asset.fileSize && asset.fileSize > 0 && (
                          <span>{StorageUtils.formatStorageSize(asset.fileSize)}</span>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">

                    {/* Download button */}
                    {asset.status === "completed" && asset.downloadUrl && (
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
                            const filename = asset.type === 'image'
                              ? `vidfab-image-${asset.id}.jpg`
                              : `vidfab-video-${asset.id}.mp4`

                            // Simple download approach
                            const link = document.createElement('a')
                            link.href = asset.downloadUrl
                            link.download = filename

                            // For external URLs, try opening in new tab
                            if (!asset.downloadUrl.includes(process.env.NEXT_PUBLIC_SUPABASE_URL || '')) {
                              link.target = '_blank'
                            }

                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)

                            toast.success(`${asset.type === 'image' ? 'Image' : 'Video'} download started`)
                          } catch (error) {
                            console.error('Download failed:', error)
                            // Fallback: open in new tab
                            window.open(asset.downloadUrl, '_blank')
                            toast.info('Opened in new tab, right-click to save')
                          }
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}

                    {/* 🔥 Image to Video button - 仅对 Image 显示 */}
                    {asset.type === 'image' && asset.status === "completed" && asset.downloadUrl && (
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={isDeleting}
                        className={`${
                          isDeleting
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-gray-400 hover:text-purple-400 hover:bg-purple-400/10'
                        }`}
                        onClick={() => !isDeleting && handleImageToVideo(asset.downloadUrl, asset.prompt || '')}
                        title="Create video from this image"
                      >
                        <Video className="w-4 h-4" />
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
                      onClick={() => !isDeleting && openDeleteDialog(asset.id, asset.type)}
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
      {filteredAssets.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
            <FolderOpen className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No assets yet</h3>
          <p className="text-gray-500 mb-6">Start creating your first image or video to see it here</p>
          <Button className="bg-gradient-to-r from-brand-purple-DEFAULT to-brand-cyan-DEFAULT hover:from-brand-purple-600 hover:to-brand-cyan-600">
            Create First Asset
          </Button>
        </div>
      )}
          </div>
        </div>

        {/* Pagination - 固定在底部 */}
        <div className="flex-shrink-0">
        {filteredAssets.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalAssets)} of {totalAssets} assets ({totalImages} images, {totalVideos} videos)
            </div>
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(currentPage - 1)}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50 text-gray-600' : 'text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer'}
                />
              </PaginationItem>

              {/* First page */}
              {currentPage > 2 && (
                <>
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => handlePageChange(1)}
                      className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                    >
                      1
                    </PaginationLink>
                  </PaginationItem>
                  {currentPage > 3 && (
                    <PaginationItem>
                      <PaginationEllipsis className="text-gray-600" />
                    </PaginationItem>
                  )}
                </>
              )}

              {/* Current page and neighbors */}
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationLink
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                  >
                    {currentPage - 1}
                  </PaginationLink>
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationLink
                  isActive
                  className="bg-gradient-to-r from-purple-600/20 to-cyan-500/20 text-white border-purple-600 cursor-default"
                >
                  {currentPage}
                </PaginationLink>
              </PaginationItem>

              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationLink
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                  >
                    {currentPage + 1}
                  </PaginationLink>
                </PaginationItem>
              )}

              {/* Last page */}
              {currentPage < totalPages - 1 && (
                <>
                  {currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis className="text-gray-600" />
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => handlePageChange(totalPages)}
                      className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                </>
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50 text-gray-600' : 'text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Delete Asset Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, assetId: null, assetType: null })}>
        <AlertDialogContent className="bg-gray-950 border border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete {deleteDialog.assetType === 'image' ? 'Image' : 'Video'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this {deleteDialog.assetType === 'image' ? 'image' : 'video'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAsset}
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