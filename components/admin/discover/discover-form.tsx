/**
 * Discover 表单组件
 * 用于新增和编辑 Discover 视频
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DiscoverCategory, DiscoverStatus } from '@/types/discover'
import { getAllCategories } from '@/lib/discover/categorize'

interface DiscoverFormProps {
  initialData?: any
  isEdit?: boolean
}

export default function DiscoverForm({ initialData, isEdit = false }: DiscoverFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    prompt: initialData?.prompt || '',
    videoUrl: initialData?.video_url || '',
    imageUrl: initialData?.image_url || '',
    category: initialData?.category || '',
    status: initialData?.status || DiscoverStatus.DRAFT,
    is_featured: initialData?.is_featured || false,
    display_order: initialData?.display_order || 0
  })

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('prompt', formData.prompt)
      formDataToSend.append('status', formData.status)
      formDataToSend.append('is_featured', formData.is_featured.toString())
      formDataToSend.append('display_order', formData.display_order.toString())

      if (formData.category) {
        formDataToSend.append('category', formData.category)
      }

      // 视频处理
      if (videoFile) {
        formDataToSend.append('videoFile', videoFile)
      } else if (formData.videoUrl) {
        formDataToSend.append('videoUrl', formData.videoUrl)
      }

      // 图片处理
      if (imageFile) {
        formDataToSend.append('imageFile', imageFile)
      } else if (formData.imageUrl) {
        formDataToSend.append('imageUrl', formData.imageUrl)
      }

      const url = isEdit ? `/api/admin/discover/${initialData.id}` : '/api/admin/discover'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        body: formDataToSend
      })

      const result = await res.json()

      if (result.success) {
        alert(isEdit ? '更新成功' : '创建成功')
        router.push('/admin/discover')
      } else {
        setError(result.error || '操作失败')
      }
    } catch (err: any) {
      setError(err.message || '操作失败')
    } finally {
      setLoading(false)
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
          {loading ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
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
