import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const VIEW_COOKIE_TTL_SECONDS = 30 * 60;

function json(
  body: Record<string, unknown>,
  init?: ResponseInit
): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}

function getViewCookieName(slug: string): string {
  const hash = createHash('sha256').update(slug).digest('hex').slice(0, 16);
  return `vf_blog_view_${hash}`;
}

function isLikelyBot(userAgent: string): boolean {
  if (!userAgent) return true;

  return /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|linkedinbot|twitterbot|lighthouse|pagespeed/i.test(
    userAgent
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;

    if (!slug) {
      return json({ success: false, error: 'Missing slug' }, { status: 400 });
    }

    const { data: post, error: postError } = await supabaseAdmin
      .from('blog_posts')
      .select('id, view_count, status')
      .eq('slug', slug)
      .maybeSingle();

    if (postError) {
      console.error('[BlogView] Failed to load post:', postError);
      return json(
        { success: false, error: 'Failed to load post' },
        { status: 500 }
      );
    }

    if (!post || post.status !== 'published') {
      return json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const userAgent = request.headers.get('user-agent') || '';
    if (isLikelyBot(userAgent)) {
      return json({
        success: true,
        counted: false,
        view_count: post.view_count || 0,
      });
    }

    const cookieName = getViewCookieName(slug);
    if (request.cookies.get(cookieName)?.value) {
      return json({
        success: true,
        counted: false,
        view_count: post.view_count || 0,
      });
    }

    const { error: incrementError } = await (supabaseAdmin as any).rpc(
      'increment_blog_view_count',
      { post_id: post.id }
    );

    if (incrementError) {
      console.error('[BlogView] Failed to increment view count:', incrementError);
      return json(
        { success: false, error: 'Failed to increment view count' },
        { status: 500 }
      );
    }

    const { data: updatedPost, error: updatedPostError } = await supabaseAdmin
      .from('blog_posts')
      .select('view_count')
      .eq('id', post.id)
      .maybeSingle();

    if (updatedPostError) {
      console.error('[BlogView] Failed to load updated count:', updatedPostError);
    }

    const response = json({
      success: true,
      counted: true,
      view_count: updatedPost?.view_count ?? (post.view_count || 0) + 1,
    });

    response.cookies.set(cookieName, '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: VIEW_COOKIE_TTL_SECONDS,
    });

    return response;
  } catch (error) {
    console.error('[BlogView] Unexpected error:', error);
    return json(
      { success: false, error: 'Failed to track view' },
      { status: 500 }
    );
  }
}
