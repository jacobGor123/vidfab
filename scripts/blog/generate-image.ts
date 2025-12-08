#!/usr/bin/env tsx

/**
 * 博客图片生成脚本
 * 使用 BytePlus API 生成博客文章头图
 *
 * 使用方法:
 *   tsx scripts/blog/generate-image.ts "AI Video Generation Tutorial"
 *   tsx scripts/blog/generate-image.ts --title "How to Use VidFab AI" --category tutorial
 */

import { generateBlogImage, generateImagePrompt } from '@/lib/blog/image-generator'

interface Args {
  prompt?: string
  title?: string
  category?: string
  watermark?: boolean
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  const result: Args = {}

  // 如果第一个参数不是 flag，则视为 prompt
  if (args[0] && !args[0].startsWith('--')) {
    result.prompt = args[0]
    return result
  }

  // 解析 flags
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--title' && args[i + 1]) {
      result.title = args[i + 1]
      i++
    } else if (arg === '--category' && args[i + 1]) {
      result.category = args[i + 1]
      i++
    } else if (arg === '--watermark') {
      result.watermark = true
    } else if (arg === '--help' || arg === '-h') {
      showHelp()
      process.exit(0)
    }
  }

  return result
}

function showHelp() {
  console.log(`
博客图片生成脚本

使用方法:
  tsx scripts/blog/generate-image.ts "Your custom prompt here"
  tsx scripts/blog/generate-image.ts --title "Article Title" [--category tutorial] [--watermark]

参数:
  直接传入提示词      使用自定义提示词生成图片
  --title            文章标题 (会自动生成提示词)
  --category         文章分类 (tutorial/announcement/guide/tips/news/feature)
  --watermark        添加水印
  --help, -h         显示此帮助信息

示例:
  # 使用自定义提示词
  tsx scripts/blog/generate-image.ts "A futuristic AI studio with purple neon lights"

  # 使用文章标题自动生成提示词
  tsx scripts/blog/generate-image.ts --title "Getting Started with VidFab AI"

  # 指定分类
  tsx scripts/blog/generate-image.ts --title "10 Tips for Better AI Videos" --category tips

  # 添加水印
  tsx scripts/blog/generate-image.ts --title "VidFab Pro Features" --watermark
`)
}

async function main() {
  const args = parseArgs()

  // 生成提示词
  let prompt: string

  if (args.prompt) {
    prompt = args.prompt
  } else if (args.title) {
    prompt = generateImagePrompt(args.title, args.category)
    console.log('\n📝 Auto-generated prompt:', prompt)
  } else {
    console.error('❌ Error: Please provide a prompt or title')
    console.log('\nUse --help for usage information')
    process.exit(1)
  }

  console.log('\n🎨 Generating blog image...\n')

  try {
    const result = await generateBlogImage({
      prompt,
      category: args.category,
      watermark: args.watermark,
    })

    console.log('\n✅ Image generation complete!\n')
    console.log('📍 Image URL:', result.url)
    console.log('💾 Local path:', result.localPath)
    console.log('📁 Filename:', result.filename)
    console.log('\n')

  } catch (error) {
    console.error('\n❌ Image generation failed:', error)
    process.exit(1)
  }
}

main()
