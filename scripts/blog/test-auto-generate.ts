#!/usr/bin/env tsx

/**
 * AI 自动生成测试脚本
 * 测试完整的 AI 选题 → 内容生成 → 发布流程
 *
 * 使用方法:
 *   tsx scripts/blog/test-auto-generate.ts
 */

// 🔥 关键：在导入任何模块之前加载环境变量
import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

// 现在才导入其他模块
import fs from 'fs'

// 从命令行参数获取自动确认 (--auto)
const autoMode = process.argv.includes('--auto')

async function main() {
  // 使用动态导入确保环境变量已加载
  const { selectNextTopic, validateTopic } = await import(
    '@/lib/blog/ai-topic-selector'
  )
  const { generateArticleContent, validateArticleContent } = await import(
    '@/lib/blog/ai-content-generator'
  )
  const { publishAIArticle } = await import('@/lib/blog/ai-publisher')

  console.log('\n' + '='.repeat(60))
  console.log('🤖 AI 自动生成测试')
  console.log('='.repeat(60) + '\n')

  try {
    // ==================== Step 1: AI 选题 ====================
    console.log('📋 Step 1: AI 智能选题...\n')

    const topic = await selectNextTopic()

    console.log('\n✅ 选题完成:\n')
    console.log('  标题:', topic.title)
    console.log('  Slug:', topic.slug)
    console.log('  优先级:', topic.priority)
    console.log('  目标关键词:', topic.targetKeywords.join(', '))
    console.log('  标题公式:', topic.titleFormula)
    console.log('  搜索量:', topic.estimatedSearchVolume)
    console.log('  分类:', topic.category || 'guide')
    console.log('  选择理由:', topic.reason)

    // 验证选题
    console.log('\n  → 验证选题是否重复...')
    const validation = await validateTopic(topic)
    if (!validation.valid) {
      console.error(`\n❌ 选题验证失败: ${validation.reason}`)
      console.log('请重新运行脚本选择其他主题。\n')
      rl.close()
      return
    }
    console.log('  ✓ 选题验证通过\n')

    if (!autoMode) {
      console.log('💡 提示: 使用 --auto 参数可以自动执行完整流程')
      console.log('   命令: tsx scripts/blog/test-auto-generate.ts --auto\n')
      return
    }

    console.log('🚀 自动模式: 继续生成内容...\n')

    // ==================== Step 1.5: 创建草稿占位 (防止重复选题) ====================
    console.log('📝 Step 1.5: 创建草稿占位记录...\n')

    const { createBlogPost } = await import('@/models/blog')
    const placeholderPost = await createBlogPost({
      title: topic.title,
      slug: topic.slug,
      content: '(内容生成中...)',
      excerpt: topic.reason,
      status: 'draft',
      category: topic.category || 'guide',
      tags: topic.targetKeywords,
    })

    if (!placeholderPost) {
      console.error('❌ 创建草稿占位失败\n')
      return
    }

    console.log(`✅ 草稿占位已创建: ${placeholderPost.id}\n`)

    // ==================== Step 2: AI 生成内容 ====================
    console.log('\n✍️  Step 2: AI 生成内容中（需要 30-60 秒）...\n')

    const article = await generateArticleContent(topic)

    console.log('\n✅ 内容生成完成\n')
    console.log('--- 内容预览 ---')
    console.log('标题:', article.title)
    console.log('Slug:', article.slug)
    console.log('分类:', article.category)
    console.log('Meta Title:', article.metaTitle)
    console.log('Meta Description:', article.metaDescription)
    console.log('摘要:', article.excerpt)
    console.log('标签:', article.tags.join(', '))
    console.log('图片数量:', article.images.length)
    console.log(
      '内容长度:',
      article.htmlContent.length,
      '字符',
      '(',
      Math.round(article.htmlContent.length / 2),
      '字左右)'
    )
    console.log('FAQ 数量:', article.faqSchema?.mainEntity?.length || 0)

    // 验证内容
    console.log('\n  → 验证内容质量...')
    const contentValidation = validateArticleContent(article)
    if (!contentValidation.valid) {
      console.error('\n⚠️  内容验证失败:')
      contentValidation.errors.forEach(err => console.error(`  - ${err}`))
      console.log('\n内容已生成但质量不符合规范，请检查后手动调整。\n')
    } else {
      console.log('  ✓ 内容验证通过\n')
    }

    // 保存预览文件
    const previewDir = path.join(process.cwd(), 'tmp', 'blog-preview')
    if (!fs.existsSync(previewDir)) {
      fs.mkdirSync(previewDir, { recursive: true })
    }

    const previewPath = path.join(previewDir, `${article.slug}.json`)
    fs.writeFileSync(previewPath, JSON.stringify(article, null, 2))
    console.log(`💾 预览文件已保存: ${previewPath}\n`)

    console.log('🚀 自动模式: 立即发布文章...\n')

    // ==================== Step 3: 发布文章 ====================
    console.log('\n📤 Step 3: 发布文章...\n')

    // 获取管理员邮箱（从环境变量中取第一个）
    const adminEmail = process.env.ADMIN_EMAILS?.split(',')[0].trim() || 'jsdasww593@gmail.com'

    const result = await publishAIArticle(article, {
      status: 'published',
      authorEmail: adminEmail,
      existingPostId: placeholderPost.id,  // 使用已创建的草稿
    })

    if (result.success) {
      console.log('\n🎉 发布成功!\n')
      console.log('  文章 ID:', result.postId)
      console.log('  文章 URL:', `https://vidfab.ai/blog/${article.slug}`)
      console.log('')
    } else {
      console.error('\n❌ 发布失败:', result.error)
      console.log('文章内容已保存在预览文件中，可稍后手动发布。\n')
    }
  } catch (error) {
    console.error('\n❌ 发生错误:', error)
  }
}

// 运行主函数
main().catch(console.error)
