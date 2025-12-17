#!/usr/bin/env tsx

import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

import { getBlogPosts } from '@/models/blog'

async function main() {
  console.log('\n🔍 测试查询已发布文章...\n')

  const posts = await getBlogPosts({
    status: 'published',
    limit: 1000,
  })

  console.log('查询结果:', posts)
  console.log('结果类型:', typeof posts)
  console.log('是否为数组:', Array.isArray(posts))
  console.log('数量:', posts?.length ?? 'undefined')

  if (posts) {
    console.log('\n文章列表:')
    posts.forEach((post, i) => {
      console.log(`${i + 1}. [${post.status}] ${post.title}`)
    })
  }
}

main().catch(console.error)
