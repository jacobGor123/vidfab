/**
 * Admin Discover 页面
 * 管理 Discover 视频数据
 */

import { Metadata } from 'next'
import AdminPageHeader from '@/components/admin/admin-page-header'
import DiscoverListClient from '@/components/admin/discover/discover-list-client'

export const metadata: Metadata = {
  title: 'Discover Management | Admin',
  description: 'Manage discover videos'
}

export const dynamic = 'force-dynamic'

export default function AdminDiscoverPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Discover"
        description="Manage media displayed on the Discover page."
      />
      <DiscoverListClient />
    </div>
  )
}
