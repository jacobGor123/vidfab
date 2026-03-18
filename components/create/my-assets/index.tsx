"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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
import { FolderOpen, Loader2 } from "lucide-react"
import { useVideoContext } from "@/lib/contexts/video-context"
import { UnifiedAsset } from "@/lib/types/asset"
import { UserVideo } from "@/lib/supabase"
import { toast } from "sonner"
import { onAssetStored } from "@/lib/events/asset-events"
import { ImageCard } from "./image-card"
import { VideoCard } from "./video-card"
import { StorageBar } from "./storage-bar"
import { AssetDetailModal } from "./asset-detail-modal"
import { AssetFilterBar, type TypeFilter, type SortOrder } from "./asset-filter-bar"

const LOAD_LIMIT = 100

interface DateGroups {
  today: UnifiedAsset[]
  thisWeek: UnifiedAsset[]
  older: UnifiedAsset[]
}

function groupByDate(assets: UnifiedAsset[]): DateGroups {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000)
  return {
    today: assets.filter(a => new Date(a.createdAt) >= startOfToday),
    thisWeek: assets.filter(a => {
      const d = new Date(a.createdAt)
      return d >= startOfWeek && d < startOfToday
    }),
    older: assets.filter(a => new Date(a.createdAt) < startOfWeek),
  }
}

// Story videos are identified by model = 'video-agent' (saved via save-to-assets API)
function isStoryVideo(asset: UnifiedAsset): boolean {
  if (asset.type !== 'video') return false
  const video = asset.rawData as UserVideo
  return video.settings?.model === 'video-agent'
}

export function MyAssets() {
  const videoContext = useVideoContext()
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [assets, setAssets] = useState<UnifiedAsset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean; id: string | null; type: 'image' | 'video' | null
  }>({ open: false, id: null, type: null })
  const [detailAsset, setDetailAsset] = useState<UnifiedAsset | null>(null)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')

  const loadAssets = useCallback(async () => {
    if (sessionStatus === 'loading') return
    if (sessionStatus === 'unauthenticated' || !session?.user?.uuid) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const res = await fetch(
        `/api/user/assets?page=1&limit=${LOAD_LIMIT}&orderBy=created_at&orderDirection=desc`
      )
      const data = await res.json()
      if (data.success) setAssets(data.data.assets || [])
      else throw new Error(data.error)
    } catch {
      toast.error('Failed to load assets')
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.uuid, sessionStatus])

  useEffect(() => { loadAssets() }, [loadAssets])

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      videoContext.refreshQuotaInfo().catch(console.error)
    }
  }, [sessionStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  // 监听新资产入库事件，自动刷新列表
  useEffect(() => {
    return onAssetStored(() => { loadAssets() })
  }, [loadAssets])

  const handleDownload = useCallback(async (asset: UnifiedAsset) => {
    const ext = asset.type === 'image' ? 'jpg' : 'mp4'
    const filename = `vidfab-${asset.type}-${asset.id}.${ext}`
    try {
      // Fetch as blob so cross-origin URLs are force-downloaded (not opened in new tab)
      const response = await fetch(asset.downloadUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
      toast.success('Download started')
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Download failed. Please try again.')
    }
  }, [])

  const handleImageToVideo = useCallback((asset: UnifiedAsset) => {
    sessionStorage.setItem('vidfab-image-to-video', JSON.stringify({
      imageUrl: asset.downloadUrl, prompt: asset.prompt || '', timestamp: Date.now(),
    }))
    router.push('/studio/image-to-video')
    toast.success('Image ready for video generation')
  }, [router])

  const handleImageToImage = useCallback((asset: UnifiedAsset) => {
    sessionStorage.setItem('vidfab-image-to-image', JSON.stringify({
      imageUrl: asset.downloadUrl, prompt: asset.prompt || '', timestamp: Date.now(),
    }))
    router.push('/studio/image-to-image')
    toast.success('Image ready for transformation')
  }, [router])

  const handleOpen = useCallback((asset: UnifiedAsset) => {
    setDetailAsset(asset)
  }, [])

  const openDelete = useCallback((id: string, type: 'image' | 'video') => {
    setDeleteDialog({ open: true, id, type })
  }, [])

  const confirmDelete = async () => {
    const { id, type } = deleteDialog
    if (!id || !type) return
    setDeleteDialog({ open: false, id: null, type: null })
    setDeletingIds(prev => new Set([...prev, id]))
    try {
      const endpoint = type === 'image'
        ? `/api/user/images/delete?imageId=${encodeURIComponent(id)}`
        : `/api/user/videos/delete?videoId=${encodeURIComponent(id)}`
      const res = await fetch(endpoint, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || 'Delete failed')
      toast.success(`${type === 'image' ? 'Image' : 'Video'} deleted`)
      if (type === 'video') await videoContext.refreshQuotaInfo()
      await loadAssets()
    } catch (e) {
      toast.error(`Delete failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
      await loadAssets()
    } finally {
      setDeletingIds(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  // 筛选 + 排序
  const filteredAssets = assets
    .filter(a => {
      if (typeFilter === 'all') return true
      if (typeFilter === 'story') return isStoryVideo(a)
      if (typeFilter === 'video') return a.type === 'video' && !isStoryVideo(a)
      if (typeFilter === 'image') return a.type === 'image'
      return true
    })
    .sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return sortOrder === 'newest' ? diff : -diff
    })

  const videoCount = assets.filter(a => a.type === 'video').length
  const imageCount = assets.filter(a => a.type === 'image').length

  const groups = groupByDate(filteredAssets)
  const DATE_SECTIONS: { key: keyof DateGroups; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'thisWeek', label: 'This Week' },
    { key: 'older', label: 'Older' },
  ]

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7c6fe0' }} />
        </div>
        <StorageBar />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 筛选/排序栏 */}
      <AssetFilterBar
        total={assets.length}
        videoCount={videoCount}
        imageCount={imageCount}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      <div className="flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-6">
        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ background: '#1a1539' }}
            >
              <FolderOpen className="w-8 h-8" style={{ color: '#5a5580' }} />
            </div>
            <h3 className="text-base font-semibold mb-2" style={{ color: '#9d9ab8' }}>
              No assets yet
            </h3>
            <p className="text-sm" style={{ color: '#5a5580' }}>
              Start creating your first image or video to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {DATE_SECTIONS.map(({ key, label }) => {
              const items = groups[key]
              if (items.length === 0) return null
              return (
                <section key={key}>
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: '#5a5580' }}
                  >
                    {label}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 md:gap-3">
                    {items.map(asset => {
                      const isDeleting = deletingIds.has(asset.id)
                      if (asset.type === 'image') {
                        return (
                          <ImageCard
                            key={asset.id}
                            asset={asset}
                            isDeleting={isDeleting}
                            onOpen={() => handleOpen(asset)}
                            onDelete={() => openDelete(asset.id, 'image')}
                            onDownload={() => handleDownload(asset)}
                            onImageToVideo={() => handleImageToVideo(asset)}
                            onImageToImage={() => handleImageToImage(asset)}
                          />
                        )
                      }
                      return (
                        <VideoCard
                          key={asset.id}
                          asset={asset}
                          isStory={isStoryVideo(asset)}
                          isDeleting={isDeleting}
                          onDelete={() => openDelete(asset.id, 'video')}
                          onDownload={() => handleDownload(asset)}
                          onOpen={() => handleOpen(asset)}
                        />
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>

      <StorageBar />

      {/* Asset detail modal */}
      <AssetDetailModal
        asset={detailAsset}
        isOpen={!!detailAsset}
        onClose={() => setDetailAsset(null)}
        isDeleting={!!detailAsset && deletingIds.has(detailAsset.id)}
        onDownload={() => detailAsset && handleDownload(detailAsset)}
        onDelete={() => {
          if (!detailAsset) return
          setDetailAsset(null)
          openDelete(detailAsset.id, detailAsset.type)
        }}
        onImageToVideo={() => {
          if (!detailAsset) return
          setDetailAsset(null)
          handleImageToVideo(detailAsset)
        }}
        onImageToImage={() => {
          if (!detailAsset) return
          setDetailAsset(null)
          handleImageToImage(detailAsset)
        }}
      />

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={open => setDeleteDialog({ open, id: null, type: null })}
      >
        <AlertDialogContent className="bg-gray-950 border border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete {deleteDialog.type === 'image' ? 'Image' : 'Video'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
