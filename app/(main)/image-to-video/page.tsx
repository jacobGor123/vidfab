'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { ImageUploadWidget, UploadedImage } from '@/components/image-upload/image-upload-widget'
import { useAuth } from '@/hooks/use-auth'
import { Play, ArrowRight, Image as ImageIcon, Video, Settings } from 'lucide-react'

export default function ImageToVideoPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // 处理图片上传成功
  const handleImageUploaded = (image: UploadedImage) => {
    setSelectedImage(image)
    toast.success('图片上传成功！')
  }

  // 处理上传错误
  const handleUploadError = (error: string) => {
    toast.error(`上传失败: ${error}`)
  }

  // 开始生成视频
  const handleGenerateVideo = async () => {
    if (!selectedImage) {
      toast.error('请先上传图片')
      return
    }

    if (!isAuthenticated) {
      toast.error('请先登录')
      return
    }

    setIsGenerating(true)

    try {
      // 这里应该调用实际的视频生成API
      // 现在我们模拟这个过程
      await new Promise(resolve => setTimeout(resolve, 2000))

      toast.success('视频生成任务已提交！')
      router.push('/my-videos') // 跳转到视频列表页面
    } catch (error) {
      console.error('生成视频失败:', error)
      toast.error('生成视频失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>请先登录</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              您需要登录才能使用图片转视频功能
            </p>
            <Button onClick={() => router.push('/login')}>
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          图片转视频
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          上传一张图片，使用AI技术将其转换为生动的视频动画
        </p>
      </div>

      {/* 功能流程指示 */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              selectedImage ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
            }`}>
              <ImageIcon className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">上传图片</span>
          </div>

          <ArrowRight className="w-4 h-4 text-gray-400" />

          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              selectedImage ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-500'
            }`}>
              <Settings className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">配置参数</span>
          </div>

          <ArrowRight className="w-4 h-4 text-gray-400" />

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-500 flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">生成视频</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：图片上传 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                选择图片
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUploadWidget
                onImageUploaded={handleImageUploaded}
                onError={handleUploadError}
                maxImages={1}
                className="mb-4"
              />

              {selectedImage && (
                <div className="mt-6 p-4 border rounded-lg bg-green-50">
                  <div className="flex items-start gap-4">
                    <img
                      src={selectedImage.url}
                      alt="Selected image"
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-green-800">
                        图片准备就绪
                      </h4>
                      <p className="text-sm text-green-600 mt-1">
                        {selectedImage.originalName || '来自URL的图片'}
                      </p>
                      <div className="text-xs text-green-600 mt-2">
                        尺寸: {selectedImage.metadata.width} × {selectedImage.metadata.height}px
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：生成配置和操作 */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                生成设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 这里可以添加视频生成的各种参数设置 */}
              <div>
                <label className="text-sm font-medium">视频时长</label>
                <select className="w-full mt-1 p-2 border rounded">
                  <option value="3">3秒</option>
                  <option value="5">5秒</option>
                  <option value="10">10秒</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">动画风格</label>
                <select className="w-full mt-1 p-2 border rounded">
                  <option value="smooth">平滑缩放</option>
                  <option value="pan">平移</option>
                  <option value="zoom">缩放</option>
                  <option value="rotate">旋转</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">输出分辨率</label>
                <select className="w-full mt-1 p-2 border rounded">
                  <option value="720p">720p (1280×720)</option>
                  <option value="1080p">1080p (1920×1080)</option>
                  <option value="4k">4K (3840×2160)</option>
                </select>
              </div>

              <Separator />

              <Button
                onClick={handleGenerateVideo}
                disabled={!selectedImage || isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    开始生成视频
                  </>
                )}
              </Button>

              {!selectedImage && (
                <p className="text-sm text-gray-500 text-center">
                  请先上传图片以开始生成视频
                </p>
              )}
            </CardContent>
          </Card>

          {/* 功能说明 */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">功能说明</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <p>• 支持JPG、PNG、WebP格式</p>
              <p>• 图片大小限制10MB以内</p>
              <p>• 自动优化图片质量和尺寸</p>
              <p>• 多种动画效果可选</p>
              <p>• 高清视频输出</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 底部提示 */}
      <div className="mt-12 text-center">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-2">
              💡 使用技巧
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• 选择清晰度高、对比度强的图片效果更佳</p>
              <p>• 建议图片尺寸比例为16:9或4:3</p>
              <p>• 人物或主体居中的图片动画效果更好</p>
              <p>• 生成过程需要1-3分钟，请耐心等待</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}