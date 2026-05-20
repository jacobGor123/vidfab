/**
 * Discover 表单组件
 * 用于新增和编辑 Discover 视频
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { DiscoverCategory, DiscoverContentTab, DiscoverMediaType, DiscoverStatus } from '@/types/discover'
import { getAllCategories } from '@/lib/discover/categorize'

type ApiResponse<T = Record<string, unknown>> = T & {
  success?: boolean
  error?: string
  message?: string
}

type UploadKind = 'video' | 'image'

const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function readApiResponse<T = Record<string, unknown>>(response: Response): Promise<ApiResponse<T>> {
  const text = await response.text()
  let data: ApiResponse<T> | null = null

  if (text) {
    try {
      data = JSON.parse(text) as ApiResponse<T>
    } catch {
      data = { error: text } as ApiResponse<T>
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || `${response.status} ${response.statusText}`)
  }

  return data || ({} as ApiResponse<T>)
}

async function uploadDiscoverAsset(file: File, kind: UploadKind) {
  const contentType = file.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg')

  const signResponse = await fetch('/api/admin/discover/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind,
      fileName: file.name,
      contentType
    })
  })

  const signed = await readApiResponse<{
    bucket?: string
    path?: string
    token?: string
    publicUrl?: string
  }>(signResponse)

  if (!signed.bucket || !signed.path || !signed.token || !signed.publicUrl) {
    throw new Error('上传链接创建失败')
  }

  const { error } = await supabaseBrowser.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, {
      cacheControl: '3600',
      contentType
    })

  if (error) {
    throw new Error(`${kind === 'video' ? '视频' : '图片'}上传失败: ${error.message}`)
  }

  return signed.publicUrl
}

interface DiscoverFormProps {
  initialData?: any
  isEdit?: boolean
}

export default function DiscoverForm({ initialData, isEdit = false }: DiscoverFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progressMessage, setProgressMessage] = useState('')

  const [formData, setFormData] = useState({
    prompt: initialData?.prompt || '',
    videoUrl: initialData?.video_url || '',
    imageUrl: initialData?.image_url || '',
    category: initialData?.category || '',
    status: initialData?.status || DiscoverStatus.DRAFT,
    is_featured: initialData?.is_featured || false,
    display_order: initialData?.display_order || 0,
    media_type: initialData?.media_type || DiscoverMediaType.VIDEO,
    content_tab: initialData?.content_tab || DiscoverContentTab.ENTERTAINMENT,
  })

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setProgressMessage('')

    try {
      let uploadedVideoUrl = ''
      let uploadedImageUrl = ''

      if (videoFile) {
        setProgressMessage('Uploading video...')
        uploadedVideoUrl = await uploadDiscoverAsset(videoFile, 'video')
      }

      if (imageFile) {
        setProgressMessage('Uploading thumbnail...')
        uploadedImageUrl = await uploadDiscoverAsset(imageFile, 'image')
      }

      setProgressMessage(isEdit ? 'Updating...' : 'Creating...')

      const formDataToSend = new FormData()
      formDataToSend.append('prompt', formData.prompt)
      formDataToSend.append('status', formData.status)
      formDataToSend.append('is_featured', formData.is_featured.toString())
      formDataToSend.append('display_order', formData.display_order.toString())
      formDataToSend.append('media_type', formData.media_type)
      formDataToSend.append('content_tab', formData.content_tab)

      if (formData.category) {
        formDataToSend.append('category', formData.category)
      }

      // 视频处理
      if (uploadedVideoUrl) {
        formDataToSend.append('videoUrl', uploadedVideoUrl)
      } else if (formData.videoUrl) {
        formDataToSend.append('videoUrl', formData.videoUrl)
      }

      // 图片处理
      if (uploadedImageUrl) {
        formDataToSend.append('imageUrl', uploadedImageUrl)
      } else if (formData.imageUrl) {
        formDataToSend.append('imageUrl', formData.imageUrl)
      }

      const url = isEdit ? `/api/admin/discover/${initialData.id}` : '/api/admin/discover'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        body: formDataToSend
      })

      const result = await readApiResponse(res)

      if (result.success) {
        alert(typeof result.message === 'string' ? result.message : (isEdit ? '更新成功' : '创建成功'))
        router.push('/admin/discover')
      } else {
        setError(result.error || '操作失败')
      }
    } catch (err: any) {
      setError(err.message || '操作失败')
    } finally {
      setLoading(false)
      setProgressMessage('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Prompt *
        </label>
        <textarea
          value={formData.prompt}
          onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
          required
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Describe the video..."
        />
      </div>

      {/* Video Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Video *
        </label>
        <div className="space-y-2">
          <input
            type="file"
            accept="video/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                setVideoFile(file)
                setFormData({ ...formData, videoUrl: '' })
              }
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
          />
          <p className="text-xs text-gray-500">Or provide a URL:</p>
          <input
            type="url"
            value={formData.videoUrl}
            onChange={(e) => {
              setFormData({ ...formData, videoUrl: e.target.value })
              setVideoFile(null)
            }}
            placeholder="https://example.com/video.mp4"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Thumbnail (Optional)
        </label>
        <div className="space-y-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                setImageFile(file)
                setFormData({ ...formData, imageUrl: '' })
              }
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
          />
          <p className="text-xs text-gray-500">Or provide a URL:</p>
          <input
            type="url"
            value={formData.imageUrl}
            onChange={(e) => {
              setFormData({ ...formData, imageUrl: e.target.value })
              setImageFile(null)
            }}
            placeholder="https://example.com/image.jpg"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category (Leave empty for auto-detect)
        </label>
        <input
          type="text"
          list="category-suggestions"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          placeholder="Enter category or leave empty for auto-detect"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <datalist id="category-suggestions">
          {getAllCategories().map(cat => (
            <option key={cat.value} value={cat.value} />
          ))}
        </datalist>
        <p className="mt-1 text-xs text-gray-500">
          Suggestions: {getAllCategories().map(c => c.label).join(', ')}
        </p>
      </div>

      {/* Media Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Media Type
        </label>
        <select
          value={formData.media_type}
          onChange={(e) => setFormData({ ...formData, media_type: e.target.value as DiscoverMediaType })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value={DiscoverMediaType.VIDEO}>Video</option>
          <option value={DiscoverMediaType.IMAGE}>Image</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Decides which URL drives the card preview (image_url for image, video_url for video).
        </p>
      </div>

      {/* Content Tab */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content Tab
        </label>
        <select
          value={formData.content_tab}
          onChange={(e) => setFormData({ ...formData, content_tab: e.target.value as DiscoverContentTab })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value={DiscoverContentTab.ENTERTAINMENT}>Entertainment</option>
          <option value={DiscoverContentTab.PRODUCT_DEMO}>Product Demo</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Front-end Discover page groups inspirations by this tab.
        </p>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as DiscoverStatus })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value={DiscoverStatus.DRAFT}>Draft</option>
          <option value={DiscoverStatus.ACTIVE}>Active</option>
          <option value={DiscoverStatus.INACTIVE}>Inactive</option>
        </select>
      </div>

      {/* Display Order */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Display Order
        </label>
        <input
          type="number"
          value={formData.display_order}
          onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="mt-1 text-xs text-gray-500">Higher numbers appear first</p>
      </div>

      {/* Featured */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.is_featured}
            onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm font-medium text-gray-700">Featured</span>
        </label>
      </div>

      {/* Submit */}
      <div className="flex space-x-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (progressMessage || 'Saving...') : (isEdit ? 'Update' : 'Create')}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
