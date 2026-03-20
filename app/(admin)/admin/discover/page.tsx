/**
 * Admin Discover 页面
 * 管理 Discover 视频数据
 */

import { Metadata } from 'next'
import DiscoverListClient from '@/components/admin/discover/discover-list-client'

export const metadata: Metadata = {
  title: 'Discover Management | Admin',
  description: 'Manage discover videos'
}

export const dynamic = 'force-dynamic'

export default function AdminDiscoverPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Discover Management</h1>
        <p className="mt-2 text-gray-600">
          Manage videos displayed on the Discover page
        </p>
      </div>

      <DiscoverListClient />
    </div>
  )
}
