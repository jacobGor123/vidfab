"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Zap } from "lucide-react"
import { useSimpleSubscription } from "@/hooks/use-subscription-simple"
import { calculateRequiredCredits, type VideoModel } from "@/lib/credits-calculator"

interface CreditsDisplayProps {
  className?: string
}

export function CreditsDisplaySimple({ className }: CreditsDisplayProps) {
  const [showDialog, setShowDialog] = useState(false)
  const { creditsRemaining, isLoading, creditsInfo } = useSimpleSubscription()

  // 🔥 简化：只有在明确没有登录用户时才隐藏
  if (!isLoading && !creditsInfo) {
    return null
  }

  // 简化的积分消耗配置（使用本地计算）
  const getCreditsForConfig = (model: VideoModel, resolution: string, duration: string) => {
    return calculateRequiredCredits(model, resolution, duration)
  }

  return (
    <>
      <div className="relative">
        {isLoading ? (
          <Button
            variant="outline"
            className="bg-white/5 border-white/20 text-white transition-all duration-300 ease-apple"
            disabled
          >
            <Zap className="h-4 w-4 mr-2 text-yellow-400 animate-pulse" />
            <span className="animate-pulse">Credits | ---</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            className="bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 text-white transition-all duration-300 ease-apple"
            onClick={() => setShowDialog(true)}
          >
            <Zap className="h-4 w-4 mr-2 text-yellow-400" />
            Credits | {creditsRemaining}
          </Button>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl bg-gray-950 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center">
              Credits Consumption Guide
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 当前积分状态 */}
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Your Current Credits:</span>
                <Badge variant="outline" className="bg-yellow-400/20 text-yellow-300 border-yellow-600">
                  <Zap className="h-3 w-3 mr-1" />
                  {creditsRemaining} Credits
                </Badge>
              </div>
              {creditsInfo?.is_pro && (
                <div className="mt-2">
                  <Badge variant="outline" className="bg-purple-400/20 text-purple-300 border-purple-600">
                    Pro Member
                  </Badge>
                </div>
              )}
            </div>

            {/* VidFab Q1 模型消耗表 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                VidFab Q1 (Standard Model)
              </h3>
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="text-left p-3 text-gray-300 font-medium">Resolution</th>
                      <th className="text-left p-3 text-gray-300 font-medium">5 Seconds</th>
                      <th className="text-left p-3 text-gray-300 font-medium">10 Seconds</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-200">
                    <tr className="border-t border-gray-700">
                      <td className="p-3">480p</td>
                      <td className="p-3">
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                          {getCreditsForConfig('vidfab-q1', '480p', '5')} Credits
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                          {getCreditsForConfig('vidfab-q1', '480p', '10')} Credits
                        </Badge>
                      </td>
                    </tr>
                    <tr className="border-t border-gray-700">
                      <td className="p-3">720p HD</td>
                      <td className="p-3">
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                          {getCreditsForConfig('vidfab-q1', '720p', '5')} Credits
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                          {getCreditsForConfig('vidfab-q1', '720p', '10')} Credits
                        </Badge>
                      </td>
                    </tr>
                    <tr className="border-t border-gray-700">
                      <td className="p-3">1080p Full HD</td>
                      <td className="p-3">
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                          {getCreditsForConfig('vidfab-q1', '1080p', '5')} Credits
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                          {getCreditsForConfig('vidfab-q1', '1080p', '10')} Credits
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* VidFab Pro 模型消耗表 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                VidFab Pro (Advanced Model)
              </h3>
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="text-left p-3 text-gray-300 font-medium">Resolution</th>
                      <th className="text-left p-3 text-gray-300 font-medium">8 Seconds</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-200">
                    <tr className="border-t border-gray-700">
                      <td className="p-3">720p HD</td>
                      <td className="p-3">
                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                          {getCreditsForConfig('vidfab-pro', '720p', '8')} Credits
                        </Badge>
                      </td>
                    </tr>
                    <tr className="border-t border-gray-700">
                      <td className="p-3">1080p Full HD</td>
                      <td className="p-3">
                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                          {getCreditsForConfig('vidfab-pro', '1080p', '8')} Credits
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 视频特效消耗 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Video Effects
              </h3>
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">4 Seconds Duration:</span>
                  <Badge variant="secondary" className="bg-green-500/20 text-green-300">
                    {getCreditsForConfig('video-effects', 'standard', '4')} Credits
                  </Badge>
                </div>
              </div>
            </div>

            {/* 不足积分提示 */}
            {creditsRemaining < 20 && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                <h4 className="text-red-300 font-medium mb-2">Low Credits Warning</h4>
                <p className="text-red-200 text-sm">
                  You're running low on credits. Consider purchasing more to continue creating amazing videos.
                </p>
              </div>
            )}

          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}