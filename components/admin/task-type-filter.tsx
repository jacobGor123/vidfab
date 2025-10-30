/**
 * Task Type Filter Component
 * Allows filtering tasks by type
 */

'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TaskType } from '@/types/admin/tasks';
import { getTaskTypeLabel } from '@/lib/admin/all-tasks-fetcher';

const TASK_TYPES: (TaskType | 'all')[] = [
  'all',
  'video_generation',
  'audio_generation',
  'watermark_removal',
  'video_upscaler',
  'video_effects',
  'face_swap',
];

interface TaskTypeFilterProps {
  currentType?: TaskType | 'all';
}

function getColor(type: TaskType | 'all'): string {
  const colors: Record<TaskType | 'all', string> = {
    all: 'bg-gray-100 text-gray-800 border-gray-300',
    video_generation: 'bg-blue-100 text-blue-800 border-blue-300',
    audio_generation: 'bg-orange-100 text-orange-800 border-orange-300',
    watermark_removal: 'bg-purple-100 text-purple-800 border-purple-300',
    video_upscaler: 'bg-green-100 text-green-800 border-green-300',
    video_effects: 'bg-pink-100 text-pink-800 border-pink-300',
    face_swap: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  };
  return colors[type] || colors.all;
}

export default function TaskTypeFilter({ currentType = 'all' }: TaskTypeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTypeChange = (type: TaskType | 'all') => {
    const params = new URLSearchParams(searchParams.toString());

    if (type === 'all') {
      params.delete('type');
    } else {
      params.set('type', type);
    }

    router.push(`/admin/tasks?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {TASK_TYPES.map((type) => {
        const isActive = type === currentType;
        const baseColor = getColor(type);
        const activeStyle = isActive
          ? 'ring-2 ring-offset-1 ring-current font-semibold'
          : 'opacity-70 hover:opacity-100';

        return (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={`px-3 py-1.5 rounded-md text-xs transition-all border ${baseColor} ${activeStyle}`}
          >
            {getTaskTypeLabel(type)}
          </button>
        );
      })}
    </div>
  );
}
