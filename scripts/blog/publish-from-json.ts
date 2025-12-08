#!/usr/bin/env tsx

/**
 * 从 JSON 预览文件发布文章
 *
 * 使用方法:
 *   tsx scripts/blog/publish-from-json.ts <path-to-json>
 *
 * 示例:
 *   tsx scripts/blog/publish-from-json.ts tmp/blog-preview/article.json
 */

// 🔥 关键：在导入任何模块之前加载环境变量
import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

// 现在才导入其他模块
import fs from 'fs'

async function main() {
  // 使用动态导入确保环境变量已加载
  const { publishAIArticle } = await import('@/lib/blog/ai-publisher')
  const { ArticleContent } = await import('@/lib/blog/ai-content-generator')

  // 获取 JSON 文件路径
  const jsonPath = process.argv[2]

  if (!jsonPath) {
    console.error('❌ 错误: 请提供 JSON 文件路径')
    console.log('\n使用方法:')
    console.log('  tsx scripts/blog/publish-from-json.ts <path-to-json>')
    console.log('\n示例:')
    console.log('  tsx scripts/blog/publish-from-json.ts tmp/blog-preview/article.json')
    process.exit(1)
  }

  // 读取 JSON 文件
  const fullPath = path.resolve(jsonPath)

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ 错误: 文件不存在: ${fullPath}`)
    process.exit(1)
  }

  console.log('\n📖 读取预览文件...')
  const fileContent = fs.readFileSync(fullPath, 'utf-8')
  const article = JSON.parse(fileContent)

  console.log(`✅ 已加载文章: ${article.title}\n`)
  console.log('--- 文章信息 ---')
  console.log('标题:', article.title)
  console.log('Slug:', article.slug)
  console.log('分类:', article.category)
  console.log('内容长度:', article.htmlContent.length, '字符')
  console.log('图片数量:', article.images?.length || 0)
  console.log('标签:', article.tags?.join(', ') || 'None')

  // 获取管理员邮箱
  const adminEmail = process.env.ADMIN_EMAILS?.split(',')[0]?.trim() || 'jsdasww593@gmail.com'
  console.log('\n作者邮箱:', adminEmail)

  console.log('\n📤 开始发布文章...\n')

  try {
    const result = await publishAIArticle(article, {
      status: 'published',
      authorEmail: adminEmail,
    })

    if (result.success) {
      console.log('\n🎉 发布成功!\n')
      console.log('  文章 ID:', result.postId)
      console.log('  文章 URL:', `https://vidfab.ai/blog/${article.slug}`)
      console.log('')
    } else {
      console.error('\n❌ 发布失败:', result.error)
      process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ 发生错误:', error)
    process.exit(1)
  }
}

// 运行主函数
main().catch(console.error)
