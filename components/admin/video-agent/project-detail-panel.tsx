/**
 * Video Agent Project Detail Panel
 * 展开后懒加载并渲染项目详情：步骤进度、人物参考图、分镜图/视频
 */

'use client';

import { useEffect, useState } from 'react';

interface ReferenceImage {
  image_url: string;
  image_order: number;
}

interface Character {
  id: string;
  character_name: string;
  source: string;
  reference_images: ReferenceImage[];
}

interface Storyboard {
  image_url: string | null;
  status: string;
}

interface VideoClip {
  video_url: string | null;
  status: string;
}

interface Shot {
  shot_number: number;
  time_range: string | null;
  description: string | null;
  duration_seconds: number | null;
  storyboard: Storyboard | null;
  video_clip: VideoClip | null;
}

interface DetailData {
  characters: Character[];
  shots: Shot[];
}

interface Props {
  projectId: string;
  stepStatuses: Record<string, string>;
}

const STEP_LABELS = ['Script', 'Characters', 'Style', 'Storyboards', 'Videos', 'Music', 'Compose'];

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-500 text-white',
  in_progress: 'bg-blue-500 text-white animate-pulse',
  failed: 'bg-red-500 text-white',
  pending: 'bg-gray-200 text-gray-500',
};

export default function ProjectDetailPanel({ projectId, stepStatuses }: Props) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/video-agent/projects/${projectId}/detail`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setData(json);
        } else {
          setError(json.error || 'Failed to load');
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400 text-sm animate-pulse">
        Loading project details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500 text-sm">{error}</div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-gray-50 border-t border-gray-200 p-6 space-y-6">

      {/* ① 步骤进度条 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Step Progress
        </h3>
        <div className="flex gap-2 flex-wrap">
          {STEP_LABELS.map((label, i) => {
            const stepKey = `step_${i + 1}_status`;
            const status = stepStatuses[stepKey] || 'pending';
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.pending}`}
                >
                  {i + 1}. {label}
                </div>
                <span className="text-[10px] text-gray-400 capitalize">{status}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ② Characters */}
      {data.characters.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Characters ({data.characters.length})
          </h3>
          <div className="flex gap-4 flex-wrap">
            {data.characters.map((char) => (
              <div key={char.id} className="bg-white border border-gray-200 rounded-lg p-3 min-w-[160px]">
                <p className="text-sm font-medium text-gray-800 mb-2 truncate">{char.character_name}</p>
                <div className="flex gap-1 flex-wrap">
                  {char.reference_images.length > 0 ? (
                    char.reference_images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img.image_url}
                        alt={`${char.character_name} ref ${img.image_order}`}
                        className="w-14 h-14 object-cover rounded border border-gray-100"
                      />
                    ))
                  ) : (
                    <div className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-[10px] text-gray-400">No img</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ③ Shots */}
      {data.shots.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Shots ({data.shots.length})
          </h3>
          <div className="space-y-3">
            {data.shots.map((shot) => (
              <div
                key={shot.shot_number}
                className="bg-white border border-gray-200 rounded-lg p-3 flex gap-4 items-start"
              >
                {/* 左：Shot 信息 */}
                <div className="w-40 shrink-0">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold mb-1">
                    {shot.shot_number}
                  </span>
                  {shot.time_range && (
                    <p className="text-[10px] text-gray-400 mb-1">{shot.time_range}</p>
                  )}
                  <p className="text-xs text-gray-600 line-clamp-3">{shot.description}</p>
                </div>

                {/* 中：分镜图 */}
                <div className="shrink-0">
                  <p className="text-[10px] text-gray-400 mb-1">Storyboard</p>
                  {shot.storyboard?.image_url ? (
                    <img
                      src={shot.storyboard.image_url}
                      alt={`Shot ${shot.shot_number} storyboard`}
                      className="w-32 h-20 object-cover rounded border border-gray-100"
                    />
                  ) : (
                    <div className="w-32 h-20 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-[10px] text-gray-400">
                        {shot.storyboard?.status === 'failed' ? 'Failed' : 'Not generated'}
                      </span>
                    </div>
                  )}
                </div>

                {/* 右：视频片段 */}
                <div className="shrink-0">
                  <p className="text-[10px] text-gray-400 mb-1">Video Clip</p>
                  {shot.video_clip?.video_url ? (
                    <video
                      src={shot.video_clip.video_url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-32 h-20 object-cover rounded border border-gray-100"
                    />
                  ) : (
                    <div className="w-32 h-20 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-[10px] text-gray-400">
                        {shot.video_clip?.status === 'failed' ? 'Failed' : 'Not generated'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
