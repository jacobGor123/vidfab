/**
 * Discover 列表客户端组件
 * 包含列表展示、筛选、新增、编辑、删除功能
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { DiscoverVideo, DiscoverStatus, DiscoverCategory } from '@/types/discover'
import { getCategoryDisplayName } from '@/lib/discover/categorize'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function DiscoverListClient() {
  const [category, setCategory] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // 构建查询 URL
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: '50',
    ...(category !== 'all' && { category }),
    ...(status !== 'all' && { status }),
    ...(search && { search })
  })

  const { data, error, isLoading, mutate } = useSWR(
    `/api/admin/discover?${queryParams}`,
    fetcher
  )

  const videos: DiscoverVideo[] = data?.data || []
  const pagination = data?.pagination

  // 删除视频
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个视频吗？')) return

    try {
      const res = await fetch(`/api/admin/discover/${id}`, { method: 'DELETE' })
      const result = await res.json()

      if (result.success) {
        alert('删除成功')
        mutate()
      } else {
        alert(`删除失败: ${result.error}`)
      }
    } catch (error) {
      alert('删除失败')
      console.error(error)
    }
  }

  return (
    <div className="space-y-6">
      {/* 筛选栏 */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 分类筛选 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Categories</option>
              {Object.values(DiscoverCategory).map(cat => (
                <option key={cat} value={cat}>
                  {getCategoryDisplayName(cat)}
                </option>
              ))}
            </select>
          </div>

          {/* 状态筛选 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {/* 搜索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search prompt..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* 新增按钮 */}
        <div>
          <Link
            href="/admin/discover/new"
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md hover:from-purple-700 hover:to-blue-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Video
          </Link>
        </div>
      </div>

      {/* 列表 */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">加载失败，请刷新重试</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-600">暂无数据</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Preview
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Prompt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {videos.map((video) => (
                  <tr key={video.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {video.image_url ? (
                        <img
                          src={video.image_url}
                          alt=""
                          className="w-20 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-20 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 line-clamp-2 max-w-md">
                        {video.prompt}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                        {getCategoryDisplayName(video.category as DiscoverCategory)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        video.status === 'active' ? 'bg-green-100 text-green-800' :
                        video.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {video.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(video.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        href={`/admin/discover/${video.id}/edit`}
                        className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(video.id)}
                        className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
