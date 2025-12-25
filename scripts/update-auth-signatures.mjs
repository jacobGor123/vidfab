#!/usr/bin/env node
/**
 * 自动更新 API 路由函数签名使用 withAuth
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

console.log('🔧 开始更新函数签名...\n')

for (const relPath of filesToUpdate) {
  const filePath = path.join(projectRoot, relPath)

  try {
    let content = fs.readFileSync(filePath, 'utf-8')

    // 判断是否有 params
    const hasParams = relPath.includes('[id]') || relPath.includes('[shotNumber]')

    // 1. 替换函数签名
    if (hasParams) {
      // 有 params 的路由
      content = content.replace(
        /export\s+async\s+function\s+(POST|GET|PUT|DELETE|PATCH)\s*\(\s*request:\s*NextRequest\s*,\s*\{\s*params\s*\}:\s*\{\s*params:\s*[^}]+\}\s*\)/g,
        'export const $1 = withAuth(async (request, { params, userId })'
      )
    } else {
      // 没有 params 的路由
      content = content.replace(
        /export\s+async\s+function\s+(POST|GET|PUT|DELETE|PATCH)\s*\(\s*request:\s*NextRequest\s*\)/g,
        'export const $1 = withAuth(async (request, { userId })'
      )
    }

    // 2. 移除认证检查代码块
    // 匹配从 "const session = await auth()" 到 session 检查结束的整个代码块
    content = content.replace(
      /\/\/\s*验证用户身份\s*\n\s*const\s+session\s*=\s*await\s+auth\(\)\s*\n\s*\n\s*if\s*\(\s*!session\?\.user\?\.uuid\s*\)\s*\{[\s\S]*?\n\s*\}\s*\n/g,
      ''
    )

    // 3. 替换 session.user.uuid 为 userId
    content = content.replace(/session\.user\.uuid/g, 'userId')

    // 4. 添加闭合括号（withAuth 的）
    // 在文件末尾的最后一个 } 前面添加一个额外的 )
    const lastBraceIndex = content.lastIndexOf('}')
    if (lastBraceIndex !== -1) {
      content = content.slice(0, lastBraceIndex + 1) + ')' + content.slice(lastBraceIndex + 1)
    }

    // 保存文件
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`✓ 已更新: ${relPath}`)

  } catch (error) {
    console.error(`❌ 更新失败: ${relPath}`)
    console.error(`   错误: ${error.message}`)
  }
}

console.log('\n✅ 所有文件已更新！')
console.log('⚠️  请运行 TypeScript 检查确保没有语法错误')
