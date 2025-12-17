#!/usr/bin/env tsx

import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

import { supabaseAdmin, TABLES } from '@/lib/supabase'

async function main() {
  const slug = process.argv[2]
  if (!slug) {
    console.error('Usage: tsx scripts/blog/view-post-content.ts <slug>')
    process.exit(1)
  }

  const { data } = await supabaseAdmin
    .from(TABLES.BLOG_POSTS)
    .select('title, content')
    .eq('slug', slug)
    .single()

  if (!data) {
    console.error('Post not found')
    process.exit(1)
  }

  console.log(`Title: ${data.title}\n`)
  console.log('Content preview (first 3000 chars):')
  console.log(data.content.substring(0, 3000))
}

main().catch(console.error)
