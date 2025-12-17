/**
 * Video Agent Beta - 主页面
 * 从脚本到成片的 AI 自动化视频生成
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthModal } from '@/hooks/use-auth-modal'
import { UnifiedAuthModal } from '@/components/auth/unified-auth-modal'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useVideoAgentStore } from '@/lib/stores/video-agent'
import InputStage from './components/InputStage'
import StepDialog from './components/StepDialog'
import ProjectList from './components/ProjectList'

export default function VideoAgentBetaPage() {
  const router = useRouter()
  const authModal = useAuthModal()

  const {
    currentProject,
    createProject,
    resumeProject,
    updateProject,
    reset,
    error,
    setError
  } = useVideoAgentStore()

  // 使用项目中的 current_step，如果项目不存在则使用默认值 1
  const currentStep = currentProject?.current_step || 1

  // 清理轮询定时器
  useEffect(() => {
    return () => {
      const store = useVideoAgentStore.getState()
      if (store.pollingInterval) {
        clearInterval(store.pollingInterval)
      }
    }
  }, [])

  const handleStart = async (data: {
    duration: number
    storyStyle: string
    originalScript: string
    aspectRatio: '16:9' | '9:16'
    enableNarration: boolean
  }) => {
    // 检查登录状态
    if (!authModal.isAuthenticated) {
      // 未登录，显示登录弹框，但不保存待执行操作
      authModal.showAuthModal()
      return
    }

    // 已登录，执行创建项目
    try {
      await createProject(data)
    } catch (error: any) {
      console.error('创建项目失败:', error)
      setError(error.message)
    }
  }

  const handleCloseDialog = () => {
    // 保存草稿并返回首页
    reset()
  }

  return (
    <>
      {/* 登录弹框 */}
      <Dialog open={authModal.isAuthModalOpen} onOpenChange={() => authModal.hideAuthModal()}>
        <DialogContent className="p-0 max-w-md">
          <DialogTitle className="sr-only">user login</DialogTitle>
          <UnifiedAuthModal className="min-h-0 p-0" />
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-y-auto bg-black relative w-full h-full">
        {/* Background Gradients */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-8 sm:px-12 py-12 pb-32">
          {/* Premium Hero Header */}
          <div className="mb-12 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 mb-2 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
              <span className="text-xs font-medium text-purple-200 tracking-wide uppercase">Video Agent Beta</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-purple-100 to-blue-100 bg-clip-text text-transparent pb-2">
              Create Stunning Videos with AI
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Transform your ideas into fully produced videos in minutes.
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-8 p-4 bg-red-950/30 border border-red-500/30 rounded-xl max-w-2xl mx-auto backdrop-blur-md">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-red-500/10 rounded-full">
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-red-200 mb-1">Something went wrong</h4>
                  <p className="text-sm text-red-300/80">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-300 transition-colors p-1"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          {!currentProject ? (
            <div className="space-y-16">
              <InputStage onStart={handleStart} />

              <div className="border-t border-white/5 pt-16">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-white/90">Your Drafts</h2>
                  <div className="text-sm text-slate-500">
                    Auto-saved while you work
                  </div>
                </div>
                <ProjectList onResume={resumeProject} />
              </div>
            </div>
          ) : (
            <StepDialog
              open={true}
              onOpenChange={(open) => {
                if (!open) {
                  handleCloseDialog()
                }
              }}
              step={currentStep}
              project={currentProject}
              onProjectUpdate={updateProject}
            />
          )}
        </div>
      </div>
    </>
  )
}
