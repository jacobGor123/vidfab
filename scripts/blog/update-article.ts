#!/usr/bin/env tsx

import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

import fs from 'fs'

async function main() {
  const { supabaseAdmin } = await import('@/lib/supabase')
  const { addHeadingIds } = await import('@/lib/blog/toc')

  const slug = 'ai-video-generator-free-online-tools-2025'

  // 读取生成的内容
  const previewPath = `tmp/blog-preview/${slug}.json`
  if (!fs.existsSync(previewPath)) {
    console.error('预览文件不存在')
    return
  }

  const article = JSON.parse(fs.readFileSync(previewPath, 'utf-8'))

  // 1. 为 H2 标题添加 ID
  console.log('✓ 为 H2 标题添加 ID...')
  let finalContent = addHeadingIds(article.htmlContent)

  // 2. 构建包含内文图的 HTML

  // 内文图URLs (从上面的日志中获取)
  const inlineImages = [
    {
      url: 'https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/user-images/images/blog-system/blog-ai-video-generator-free-online-tools-2025-1764756250119.jpg',
      insertAfter: '<h3>Bonus: Emerging Tools to Watch</h3>',
      alt: 'Comparison dashboard showing different AI video generator interfaces and their free credit offerings',
      caption: 'Side-by-side comparison of leading AI video generators and their free tier features'
    },
    {
      url: 'https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/user-images/images/blog-system/blog-ai-video-generator-free-online-tools-2025-1764756326338.jpg',
      insertAfter: '<h3>7. Take Advantage of Referral Programs</h3>',
      alt: 'Workflow diagram showing the complete AI video creation process from prompt to final output',
      caption: 'Step-by-step visualization of how AI transforms text prompts into professional videos'
    }
  ]

  for (const img of inlineImages) {
    const insertPosition = finalContent.indexOf(img.insertAfter)
    if (insertPosition !== -1) {
      const insertAfterEnd = insertPosition + img.insertAfter.length
      const imgHtml = img.caption
        ? `\n<figure class="my-8">
  <img src="${img.url}" alt="${img.alt}" class="w-full rounded-lg shadow-lg" />
  <figcaption class="text-center text-sm text-gray-400 mt-2">${img.caption}</figcaption>
</figure>\n`
        : `\n<img src="${img.url}" alt="${img.alt}" class="w-full rounded-lg shadow-lg my-8" />\n`

      finalContent = finalContent.slice(0, insertAfterEnd) + imgHtml + finalContent.slice(insertAfterEnd)
      console.log(`✓ 已插入图片到: ${img.insertAfter}`)
    }
  }

  // 添加 CTA 到文章底部
  const ctaHtml = `
<div class="cta-box">
  <h3>🎁 Try VidFab AI for Free</h3>
  <p>Create your first AI video in minutes – no credit card required!</p>
  <a href="/signup" class="cta-button">Start Creating Free →</a>
</div>
`
  finalContent = finalContent + ctaHtml
  console.log('✓ CTA 已添加到文章底部')

  // 更新文章
  const { error } = await supabaseAdmin
    .from('blog_posts')
    .update({
      content: finalContent,
      featured_image_url: 'https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/user-images/images/blog-system/blog-ai-video-generator-free-online-tools-2025-1764756179480.jpg'
    })
    .eq('slug', slug)

  if (error) {
    console.error('❌ 更新失败:', error)
  } else {
    console.log('\n🎉 文章更新成功!')
    console.log('  → 新封面图已设置')
    console.log('  → 2 张内文图已插入')
    console.log('\n刷新页面查看: http://localhost:3000/blog/' + slug)
  }
}

main().catch(console.error)
