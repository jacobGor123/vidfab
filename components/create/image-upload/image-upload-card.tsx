/**
 * 单个图片上传卡片组件
 * 显示预览、进度、状态和操作按钮
 */

import { Button } from "@/components/ui/button"
import { Loader2, AlertTriangle, CheckCircle, X, ImageIcon } from "lucide-react"
import { UploadTask } from "./types"

interface ImageUploadCardProps {
  task: UploadTask
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
  disabled?: boolean
}

export function ImageUploadCard({
  task,
  isSelected,
  onSelect,
  onRemove,
  disabled = false
}: ImageUploadCardProps) {
  return (
    <div
      onClick={() => task.status === 'completed' && onSelect()}
      className={`relative rounded-lg overflow-hidden transition-all ${
        isSelected
          ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-950'
          : task.status === 'completed'
          ? 'cursor-pointer hover:ring-2 hover:ring-gray-600'
          : ''
      }`}
    >
      {/* 图片预览 */}
      <div className="aspect-video bg-gray-800 flex items-center justify-center">
        {task.previewUrl ? (
          <img
            src={task.previewUrl}
            alt={task.fileName}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="w-8 h-8 text-gray-600" />
        )}
      </div>

      {/* 状态覆盖层 - 上传中 */}
      {task.status === 'uploading' && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin mb-2" />
          <div className="w-3/4 bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-purple-500 to-cyan-400 h-1.5 rounded-full transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-300 mt-1">{task.progress}%</span>
        </div>
      )}

      {/* 状态覆盖层 - 失败 */}
      {task.status === 'failed' && (
        <div className="absolute inset-0 bg-red-900/60 flex flex-col items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-400 mb-1" />
          <span className="text-xs text-red-300 text-center px-2">
            {task.error || 'Upload failed'}
          </span>
        </div>
      )}

      {/* 删除按钮 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        disabled={disabled}
        className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white w-6 h-6 rounded-full"
      >
        <X className="w-3 h-3" />
      </Button>

      {/* 选中标记 */}
      {isSelected && task.status === 'completed' && (
        <div className="absolute top-1 left-1 bg-purple-500 rounded-full p-1">
          <CheckCircle className="w-3 h-3 text-white" />
        </div>
      )}

      {/* 文件信息 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <p className="text-xs text-gray-200 truncate">{task.fileName}</p>
        {task.status === 'completed' && (
          <p className="text-xs text-gray-400">
            {(task.size / 1024).toFixed(1)}KB
          </p>
        )}
      </div>
    </div>
  )
}
