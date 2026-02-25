/**
 * Admin Video Agent Project Detail API
 * GET /api/admin/video-agent/projects/[id]/detail
 * 返回项目的 characters（含参考图）、shots（含分镜图和视频）
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getSupabaseAdminClient } from '@/models/db';

export const dynamic = 'force-dynamic';

// ── Local row types ──────────────────────────────────────────────────────────

interface CharacterRow {
  id: string;
  character_name: string;
  source: string;
  character_reference_images: { image_url: string; image_order: number }[];
}

interface ShotRow {
  shot_number: number;
  time_range: string | null;
  description: string | null;
  duration_seconds: number | null;
}

interface StoryboardRow {
  shot_number: number;
  image_url: string | null;
  status: string;
}

interface ClipRow {
  shot_number: number;
  video_url: string | null;
  status: string;
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const supabase = getSupabaseAdminClient();
    const projectId = params.id;

    // 并行查询四张表（互相无数据依赖）
    const [
      { data: characters, error: charError },
      { data: shots, error: shotsError },
      { data: storyboards, error: sbError },
      { data: clips, error: clipError },
    ] = await Promise.all([
      supabase
        .from('project_characters')
        .select(`id, character_name, source, character_reference_images ( image_url, image_order )`)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true }),

      supabase
        .from('project_shots')
        .select('shot_number, time_range, description, duration_seconds')
        .eq('project_id', projectId)
        .order('shot_number', { ascending: true }),

      supabase
        .from('project_storyboards')
        .select('shot_number, image_url, status')
        .eq('project_id', projectId)
        .eq('is_current', true),

      supabase
        .from('project_video_clips')
        .select('shot_number, video_url, status')
        .eq('project_id', projectId),
    ]);

    if (charError) throw charError;
    if (shotsError) throw shotsError;
    if (sbError) throw sbError;
    if (clipError) throw clipError;

    // 组装响应数据
    const sbMap = new Map((storyboards as StoryboardRow[] ?? []).map((s) => [s.shot_number, s]));
    const clipMap = new Map((clips as ClipRow[] ?? []).map((c) => [c.shot_number, c]));

    const shotsWithMedia = (shots as ShotRow[] ?? []).map((shot) => ({
      ...shot,
      storyboard: sbMap.get(shot.shot_number) ?? null,
      video_clip: clipMap.get(shot.shot_number) ?? null,
    }));

    const charactersFormatted = (characters as CharacterRow[] ?? []).map(
      ({ character_reference_images, ...rest }) => ({
        ...rest,
        reference_images: character_reference_images
          .slice()
          .sort((a, b) => a.image_order - b.image_order),
      })
    );

    return NextResponse.json({
      success: true,
      characters: charactersFormatted,
      shots: shotsWithMedia,
    });
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[Admin] Video agent detail error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch detail' }, { status: 500 });
  }
}
