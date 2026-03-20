/**
 * Admin Discover - 编辑页面
 */

import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import DiscoverForm from '@/components/admin/discover/discover-form'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin/auth'

export const metadata: Metadata = {
  title: 'Edit Discover Video | Admin',
  description: 'Edit discover video'
}

interface PageProps {
  params: {
    id: string
  }
}

async function getDiscoverVideo(id: string) {
  const { data, error } = await supabaseAdmin
    .from('discover_videos')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

export default async function EditDiscoverPage({ params }: PageProps) {
  await requireAdmin()

  const video = await getDiscoverVideo(params.id)

  if (!video) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <Link href="/admin/discover" className="text-blue-600 hover:text-blue-800 flex items-center mb-4">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to List
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit Discover Video</h1>
        <p className="mt-2 text-gray-600">
          Update video information
        </p>
      </div>

      <DiscoverForm initialData={video} isEdit={true} />
    </div>
  )
}
