#!/usr/bin/env node
/**
 * 自动更新 API 路由文件使用新的认证中间件
 * 使用方法: node scripts/update-auth-middleware.mjs
 */

import fs from 'fs'
import path from 'path'

const filesToUpdate = [
  'app/api/video-agent/projects/[id]/videos/generate/route.ts',
  'app/api/video-agent/projects/[id]/route.ts',
  'app/api/video-agent/projects/[id]/characters/route.ts',
  'app/api/video-agent/projects/[id]/storyboards/generate/route.ts',
  'app/api/video-agent/projects/[id]/storyboards/[shotNumber]/regenerate/route.ts',
  'app/api/video-agent/projects/[id]/videos/status/route.ts',
  'app/api/video-agent/projects/[id]/videos/[shotNumber]/retry/route.ts',
  'app/api/video-agent/projects/[id]/batch-generate-characters/route.ts',
  'app/api/video-agent/projects/[id]/character-prompts/route.ts',
  'app/api/video-agent/projects/[id]/compose/status/route.ts',
  'app/api/video-agent/projects/[id]/storyboards/status/route.ts',
  'app/api/video-agent/projects/[id]/step/route.ts',
  'app/api/video-agent/projects/[id]/image-style/route.ts',
  'app/api/video-agent/projects/[id]/transition/route.ts',
  'app/api/video-agent/generate-character-image/route.ts'
]

const projectRoot = '/Users/jacob/Desktop/vidfab'

console.log('🔧 开始更新 API 路由文件...\n')

let successCount = 0
let failCount = 0
const report = []

for (const relPath of filesToUpdate) {
  const filePath = path.join(projectRoot, relPath)

  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  跳过（文件不存在）: ${relPath}`)
      failCount++
      continue
    }

    let content = fs.readFileSync(filePath, 'utf-8')
    const originalContent = content

    // 检查是否已经更新过
    if (content.includes('withAuth')) {
      console.log(`✓ 已更新: ${relPath}`)
      successCount++
      continue
    }

    // 1. 替换导入语句
    content = content.replace(
      /import\s+\{\s*auth\s*\}\s+from\s+['"]@\/auth['"]/,
      "import { withAuth } from '@/lib/middleware/auth'"
    )

    // 2. 检测并标记需要手动处理的部分
    const hasAuthCall = content.includes('await auth()')
    const hasSessionUsage = content.includes('session.user.uuid')

    if (hasAuthCall || hasSessionUsage) {
      report.push({
        file: relPath,
        needsManualUpdate: true,
        hasAuthCall,
        hasSessionUsage
      })

      console.log(`⚠️  需要手动更新函数签名: ${relPath}`)
      console.log(`   - 认证调用: ${hasAuthCall ? '是' : '否'}`)
      console.log(`   - Session 使用: ${hasSessionUsage ? '是' : '否'}`)
    }

    // 保存导入语句的更新
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8')
      console.log(`✓ 导入已更新: ${relPath}\n`)
      successCount++
    }

  } catch (error) {
    console.error(`❌ 处理失败: ${relPath}`)
    console.error(`   错误: ${error.message}\n`)
    failCount++
  }
}

console.log('\n====== 更新汇总 ======')
console.log(`总文件数: ${filesToUpdate.length}`)
console.log(`成功: ${successCount}`)
console.log(`失败: ${failCount}`)

if (report.length > 0) {
  console.log('\n====== 需要手动更新的文件 ======')
  report.forEach(item => {
    console.log(`- ${item.file}`)
  })
  console.log('\n请手动更新这些文件的函数签名：')
  console.log('1. 将 export async function POST/GET/... 改为 export const POST/GET/... = withAuth(...)')
  console.log('2. 移除认证检查代码块')
  console.log('3. 将 session.user.uuid 替换为 userId')
}

console.log('\n✅ 脚本执行完成！')
