import type { TaskType } from '@/types/admin/tasks';

/**
 * Get task type display label.
 */
export function getTaskTypeLabel(taskType: TaskType | 'all'): string {
  const labels: Record<TaskType | 'all', string> = {
    all: 'All Tasks',
    video_generation: 'Video Generation',
    image_generation: 'Image Generation',
  };
  return labels[taskType] || taskType;
}
