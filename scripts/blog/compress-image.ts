#!/usr/bin/env tsx

/**
 * 博客图片压缩脚本
 * 使用 Sharp 压缩和优化图片
 *
 * 使用方法:
 *   tsx scripts/blog/compress-image.ts tmp/blog-images/original.png
 */

import { optimizeBlogImage } from '@/lib/blog/image-optimizer'
import fs from 'fs/promises'

interface Args {
  inputPath?: string
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  const result: Args = {}

  if (args[0] === '--help' || args[0] === '-h') {
    showHelp()
    process.exit(0)
  }

  if (args[0] && !args[0].startsWith('--')) {
    result.inputPath = args[0]
  }

  return result
}

function showHelp() {
  console.log(`
博客图片压缩脚本

使用方法:
  tsx scripts/blog/compress-image.ts <input-path>

参数:
  <input-path>       原始图片路径
  --help, -h         显示此帮助信息

示例:
  tsx scripts/blog/compress-image.ts tmp/blog-images/blog-1234567890.png
  tsx scripts/blog/compress-image.ts /path/to/image.jpg

输出:
  - 原图 (1200x630, JPEG 85%)
  - 缩略图 (600x315, JPEG 80%)
  - WebP 格式 (1200x630, 80%)

所有压缩后的图片保存在: tmp/blog-images/compressed/
`)
}

async function main() {
  const args = parseArgs()

  if (!args.inputPath) {
    console.error('❌ Error: Please provide an input image path')
    console.log('\nUse --help for usage information')
    process.exit(1)
  }

  // 检查文件是否存在
  try {
    await fs.access(args.inputPath)
  } catch (error) {
    console.error(`❌ Error: File not found: ${args.inputPath}`)
    process.exit(1)
  }

  console.log('\n🔧 Compressing blog image...\n')
  console.log('📂 Input:', args.inputPath)

  try {
    const result = await optimizeBlogImage(args.inputPath)

    console.log('\n✅ Image compression complete!\n')
    console.log('📍 Output files:')
    console.log('  🖼️  Original:', result.original)
    console.log('  🖼️  Thumbnail:', result.thumbnail)
    console.log('  🖼️  WebP:', result.webp)
    console.log('\n')

  } catch (error) {
    console.error('\n❌ Image compression failed:', error)
    process.exit(1)
  }
}

main()
