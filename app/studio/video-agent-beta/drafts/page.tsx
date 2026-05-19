/**
 * Video Agent Beta - Drafts 页面
 * 独立显示用户的所有草稿；点击草稿后跳回主页并通过 ?resume=<id> 触发 StepDialog 接续。
 */

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import type { VideoAgentProject } from '@/lib/stores/video-agent'
import ProjectList from '../components/ProjectList'

export const dynamic = 'force-dynamic'

export default function DraftsPage() {
  const router = useRouter()
  const t = useTranslations('studio.storyToVideo')

  const handleResume = (project: VideoAgentProject) => {
    router.push(`/studio/video-agent-beta?resume=${project.id}`)
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-black relative w-full">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-12 pb-32 box-border">
        <Link
          href="/studio/video-agent-beta"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('backToVideoAgent')}</span>
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            {t('draftsPageTitle')}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {t('draftsPageHint')}
          </p>
        </div>

        <ProjectList onResume={handleResume} />
      </div>
    </div>
  )
}
