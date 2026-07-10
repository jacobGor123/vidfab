import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { collectPaginatedRows } from '@/lib/data/collect-paginated-rows'

export interface BlogSitemapPost {
  slug: string
}

const SITEMAP_PAGE_SIZE = 1000

let adminClient: ReturnType<typeof createClient<Database>> | undefined

function getAdminClient() {
  if (adminClient) return adminClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for sitemap generation')
  }

  adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}

/**
 * Fetch every published slug without loading article bodies. Supabase ranges are
 * inclusive, so the upper bound is pageSize - 1.
 */
export async function getPublishedBlogPostsForSitemap(): Promise<BlogSitemapPost[]> {
  const supabase = getAdminClient()

  return collectPaginatedRows(async (from, to) => {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to)

    if (error) {
      throw new Error(`Error fetching blog posts for sitemap: ${error.message}`)
    }

    return (data ?? []) as BlogSitemapPost[]
  }, SITEMAP_PAGE_SIZE)
}
