/**
 * Admin Video Agent Project Detail API
 * GET /api/admin/video-agent/projects/[id]/detail
 * 返回项目的 characters（含参考图）、shots（含分镜图和视频）
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getSupabaseAdminClient } from '@/models/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const supabase = getSupabaseAdminClient();
    const projectId = params.id;

    // 1. 查人物 + 参考图
    const { data: characters, error: charError } = await supabase
      .from('project_characters')
      .select(`
        id,
        character_name,
        source,
        character_reference_images (
          image_url,
          image_order
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (charError) throw charError;

    // 2. 查 shots
    const { data: shots, error: shotsError } = await supabase
      .from('project_shots')
      .select('shot_number, time_range, description, duration_seconds')
      .eq('project_id', projectId)
      .order('shot_number', { ascending: true });

    if (shotsError) throw shotsError;

    // 3. 查当前版本分镜图
    const { data: storyboards, error: sbError } = await supabase
      .from('project_storyboards')
      .select('shot_number, image_url, status')
      .eq('project_id', projectId)
      .eq('is_current', true);

    if (sbError) throw sbError;

    // 4. 查视频片段
    const { data: clips, error: clipError } = await supabase
      .from('project_video_clips')
      .select('shot_number, video_url, status')
      .eq('project_id', projectId);

    if (clipError) throw clipError;

    // 5. 合并 shots + storyboards + clips
    const sbMap = new Map((storyboards ?? []).map((s: any) => [s.shot_number, s]));
    const clipMap = new Map((clips ?? []).map((c: any) => [c.shot_number, c]));

    const shotsWithMedia = (shots ?? []).map((shot: any) => ({
      ...shot,
      storyboard: sbMap.get(shot.shot_number) ?? null,
      video_clip: clipMap.get(shot.shot_number) ?? null,
    }));

    // 6. 排序参考图
    const charactersWithSortedImages = (characters ?? []).map((char: any) => ({
      ...char,
      reference_images: (char.character_reference_images ?? [])
        .sort((a: any, b: any) => a.image_order - b.image_order),
    }));

    return NextResponse.json({
      success: true,
      characters: charactersWithSortedImages,
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
