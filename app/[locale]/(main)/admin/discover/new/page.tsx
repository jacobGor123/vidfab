/**
 * Admin Discover - 新增页面
 */

import { Metadata } from 'next'
import Link from 'next/link'
import DiscoverForm from '@/components/admin/discover/discover-form'

export const metadata: Metadata = {
  title: 'Add New Discover Video | Admin',
  description: 'Add a new discover video'
}

export default function NewDiscoverPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <Link href="/admin/discover" className="text-blue-600 hover:text-blue-800 flex items-center mb-4">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to List
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Add New Discover Video</h1>
        <p className="mt-2 text-gray-600">
          Upload a new video to the Discover page
        </p>
      </div>

      <DiscoverForm />
    </div>
  )
}
