/**
 * 图片上传网格组件
 * 显示所有上传任务的网格布局
 */

import { Button } from "@/components/ui/button"
import { UploadTask } from "./types"
import { ImageUploadCard } from "./image-upload-card"

interface ImageUploadGridProps {
  tasks: Map<string, UploadTask>
  selectedId: string | null
  onSelectImage: (taskId: string) => void
  onRemoveTask: (taskId: string) => void
  onClearAll: () => void
  disabled?: boolean
}

export function ImageUploadGrid({
  tasks,
  selectedId,
  onSelectImage,
  onRemoveTask,
  onClearAll,
  disabled = false
}: ImageUploadGridProps) {
  if (tasks.size === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">
          {tasks.size} image{tasks.size > 1 ? 's' : ''} uploaded
        </span>
        {tasks.size > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            disabled={disabled}
            className="text-xs text-gray-500 hover:text-red-400 h-6 px-2"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* 图片网格 */}
      <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
        {Array.from(tasks.values())
          .sort((a, b) => b.timestamp - a.timestamp)
          .map((task) => (
            <ImageUploadCard
              key={task.id}
              task={task}
              isSelected={selectedId === task.id}
              onSelect={() => onSelectImage(task.id)}
              onRemove={() => onRemoveTask(task.id)}
              disabled={disabled}
            />
          ))}
      </div>
    </div>
  )
}
