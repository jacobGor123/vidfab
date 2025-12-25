#!/usr/bin/env node
/**
 * 自动更新所有剩余的 API 路由使用 withAuth 中间件
 *
 * 此脚本会：
 * 1. 查找所有包含 "await auth()" 的文件
 * 2. 自动替换函数签名和认证代码
 * 3. 生成详细的更新报告
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

// 递归查找所有包含 "await auth()" 的 TypeScript 文件
function findFilesWithAuth(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      findFilesWithAuth(fullPath, files)
    } else if (entry.isFile() && entry.name === 'route.ts') {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8')
        if (content.includes('await auth()') && fullPath.includes('video-agent')) {
          files.push(fullPath)
        }
      } catch (error) {
        // 忽略读取错误
      }
    }
  }

  return files
}

// 更新单个文件
function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8')
    const originalContent = content

    // 检查是否有 params
    const hasParams = filePath.includes('[id]') || filePath.includes('[shotNumber]')

    // 替换所有 HTTP 方法的函数签名
    const methods = ['POST', 'GET', 'PUT', 'DELETE', 'PATCH']

    for (const method of methods) {
      if (hasParams) {
        // 有 params 的路由
        const oldPattern = new RegExp(
          `export\\s+async\\s+function\\s+${method}\\s*\\(\\s*request:\\s*NextRequest\\s*,\\s*\\{\\s*params\\s*\\}:\\s*\\{\\s*params:\\s*[^}]+\\}\\s*\\)`,
          'g'
        )
        const newSignature = `export const ${method} = withAuth(async (request, { params, userId })`
        content = content.replace(oldPattern, newSignature)
      } else {
        // 没有 params 的路由
        const oldPattern = new RegExp(
          `export\\s+async\\s+function\\s+${method}\\s*\\(\\s*request:\\s*NextRequest\\s*\\)`,
          'g'
        )
        const newSignature = `export const ${method} = withAuth(async (request, { userId })`
        content = content.replace(oldPattern, newSignature)
      }
    }

    // 移除认证检查代码块（多种变体）
    const authPatterns = [
      // 模式 1: 标准认证检查
      /\/\/\s*验证用户身份\s*\n\s*const\s+session\s*=\s*await\s+auth\(\)\s*\n\s*\n\s*if\s*\(\s*!session\?\.user\?\.uuid\s*\)\s*\{[^}]*\}\s*\n\s*\n/g,

      // 模式 2: 两步检查
      /const\s+session\s*=\s*await\s+auth\(\)\s*\n\s*\n\s*if\s*\(\s*!session\?\.user\s*\)\s*\{[^}]*\}\s*\n\s*\n\s*if\s*\(\s*!session\.user\.uuid\s*\)\s*\{[^}]*\}\s*\n\s*\n/g,

      // 模式 3: 简单检查
      /const\s+session\s*=\s*await\s+auth\(\)\s*\n\s*\n\s*if\s*\(\s*!session\?\.user\?\.uuid\s*\)\s*\{[\s\S]*?}\s*\n\s*\n/g
    ]

    for (const pattern of authPatterns) {
      content = content.replace(pattern, '')
    }

    // 替换所有 session.user.uuid 为 userId
    content = content.replace(/session\.user\.uuid/g, 'userId')

    // 如果文件有变化，保存它
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8')
      return { success: true, changes: true }
    }

    return { success: true, changes: false }

  } catch (error) {
    return { success: false, error: error.message }
  }
}

// 主程序
console.log('🔍 扫描 API 路由文件...\n')

const apiDir = path.join(projectRoot, 'app', 'api')
const filesToUpdate = findFilesWithAuth(apiDir)

console.log(`找到 ${filesToUpdate.length} 个需要更新的文件\n`)

let successCount = 0
let noChangeCount = 0
let failCount = 0

for (const filePath of filesToUpdate) {
  const relPath = path.relative(projectRoot, filePath)
  const result = updateFile(filePath)

  if (result.success) {
    if (result.changes) {
      console.log(`✓ 已更新: ${relPath}`)
      successCount++
    } else {
      console.log(`○ 无需更新: ${relPath}`)
      noChangeCount++
    }
  } else {
    console.log(`✗ 更新失败: ${relPath}`)
    console.log(`  错误: ${result.error}`)
    failCount++
  }
}

console.log('\n====== 更新汇总 ======')
console.log(`总文件数: ${filesToUpdate.length}`)
console.log(`成功更新: ${successCount}`)
console.log(`无需更新: ${noChangeCount}`)
console.log(`更新失败: ${failCount}`)

if (successCount > 0) {
  console.log('\n✅ 自动更新完成！')
  console.log('建议：运行 npm run type-check 验证类型正确性')
}
