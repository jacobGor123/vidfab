"use client"

import { useEffect, useState } from 'react'
import { isBlackFridayActive } from '@/lib/black-friday/coupons'

export default function DebugBannerPage() {
  const [bannerDismissed, setBannerDismissed] = useState<string | null>(null)
  const [isActive, setIsActive] = useState<boolean>(false)
  const [endDate, setEndDate] = useState<string>('')
  const [currentTime, setCurrentTime] = useState<string>('')

  useEffect(() => {
    // 检查 localStorage
    const dismissed = localStorage.getItem('bf2025_banner_dismissed')
    setBannerDismissed(dismissed)

    // 检查活动是否激活
    setIsActive(isBlackFridayActive())

    // 获取环境变量
    setEndDate(process.env.NEXT_PUBLIC_BLACK_FRIDAY_END_DATE || 'Not set')
    setCurrentTime(new Date().toISOString())
  }, [])

  const clearBannerDismissed = () => {
    localStorage.removeItem('bf2025_banner_dismissed')
    setBannerDismissed(null)
    alert('✅ 已清除横幅关闭标记,请返回首页刷新查看')
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔧 黑五横幅调试页面</h1>

        <div className="space-y-6">
          {/* 活动状态 */}
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">活动状态</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">活动是否激活:</span>
                <span className={isActive ? 'text-green-500' : 'text-red-500'}>
                  {isActive ? '✅ 是' : '❌ 否'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">活动结束时间:</span>
                <span className="text-purple-400">{endDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">当前时间:</span>
                <span className="text-cyan-400">{currentTime}</span>
              </div>
            </div>
          </div>

          {/* localStorage 状态 */}
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">LocalStorage 状态</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">横幅是否被关闭:</span>
                <span className={bannerDismissed === 'true' ? 'text-red-500' : 'text-green-500'}>
                  {bannerDismissed === 'true' ? '❌ 是 (已关闭)' : '✅ 否 (未关闭)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">存储值:</span>
                <span className="text-yellow-400">{bannerDismissed || 'null'}</span>
              </div>
            </div>
          </div>

          {/* 环境变量 */}
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">环境变量</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-400">NEXT_PUBLIC_BLACK_FRIDAY_ENABLED:</span>
                <span className="ml-2 text-green-400">
                  {process.env.NEXT_PUBLIC_BLACK_FRIDAY_ENABLED || 'Not set'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">NEXT_PUBLIC_BLACK_FRIDAY_END_DATE:</span>
                <span className="ml-2 text-purple-400">
                  {process.env.NEXT_PUBLIC_BLACK_FRIDAY_END_DATE || 'Not set'}
                </span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">调试操作</h2>
            <div className="space-y-3">
              <button
                onClick={clearBannerDismissed}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                🗑️ 清除横幅关闭标记
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                🏠 返回首页
              </button>
            </div>
          </div>

          {/* 诊断结果 */}
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">诊断结果</h2>
            <div className="space-y-2">
              {!isActive && (
                <div className="text-red-400 flex items-start gap-2">
                  <span>❌</span>
                  <div>
                    <strong>活动未激活</strong>
                    <p className="text-sm text-gray-400 mt-1">
                      可能原因: 活动已过期或未启用。请检查环境变量。
                    </p>
                  </div>
                </div>
              )}
              {bannerDismissed === 'true' && (
                <div className="text-yellow-400 flex items-start gap-2">
                  <span>⚠️</span>
                  <div>
                    <strong>横幅已被关闭</strong>
                    <p className="text-sm text-gray-400 mt-1">
                      点击上方"清除横幅关闭标记"按钮即可恢复显示。
                    </p>
                  </div>
                </div>
              )}
              {isActive && bannerDismissed !== 'true' && (
                <div className="text-green-400 flex items-start gap-2">
                  <span>✅</span>
                  <div>
                    <strong>一切正常</strong>
                    <p className="text-sm text-gray-400 mt-1">
                      横幅应该会在首页显示。如果仍未显示,请检查浏览器控制台是否有错误。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
