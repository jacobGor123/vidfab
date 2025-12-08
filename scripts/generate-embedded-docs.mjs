#!/usr/bin/env node

/**
 * 生成嵌入的文档模块
 * 在构建时将 docs/ 目录下的文档内容嵌入到 TypeScript 模块中
 * 这样在 Vercel Serverless Functions 环境中就可以访问文档内容
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

console.log('📦 生成嵌入的文档模块...')

// 需要嵌入的文档文件
const docsToEmbed = [
  {
    name: 'blogContentStrategy',
    path: 'docs/blog-create/blog-content-strategy-2025-12-03.md',
    description: '博客内容策略文档',
  },
  {
    name: 'articleCreationGuide',
    path: 'docs/blog-create/03-article-creation.md',
    description: '文章创作指南',
  },
  {
    name: 'productConstraints',
    path: 'docs/blog-create/product-constraints.md',
    description: '产品功能约束文档',
  },
]

// 读取文档内容
const embeddedDocs = {}
for (const doc of docsToEmbed) {
  const fullPath = path.join(projectRoot, doc.path)

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ 文档不存在: ${doc.path}`)
    process.exit(1)
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  embeddedDocs[doc.name] = {
    content,
    path: doc.path,
    description: doc.description,
  }

  console.log(`  ✓ ${doc.description} (${content.length} 字符)`)
}

// 生成 TypeScript 模块
const outputPath = path.join(projectRoot, 'lib', 'blog', 'embedded-docs.ts')

const tsContent = `/**
 * 嵌入的文档内容
 *
 * ⚠️ 此文件由 scripts/generate-embedded-docs.mjs 自动生成
 * 请勿手动编辑！如需修改文档内容，请编辑 docs/ 目录下的源文件
 *
 * 生成时间: ${new Date().toISOString()}
 */

export interface EmbeddedDoc {
  content: string
  path: string
  description: string
}

export interface EmbeddedDocs {
  blogContentStrategy: EmbeddedDoc
  articleCreationGuide: EmbeddedDoc
  productConstraints: EmbeddedDoc
}

${docsToEmbed.map(doc => `
/**
 * ${doc.description}
 * 源文件: ${doc.path}
 */
export const ${doc.name}: EmbeddedDoc = {
  content: ${JSON.stringify(embeddedDocs[doc.name].content)},
  path: ${JSON.stringify(doc.path)},
  description: ${JSON.stringify(doc.description)},
}
`).join('\n')}

/**
 * 所有嵌入的文档
 */
export const embeddedDocs: EmbeddedDocs = {
  blogContentStrategy,
  articleCreationGuide,
  productConstraints,
}

/**
 * 获取文档内容（兼容旧的文件读取方式）
 */
export function getDocContent(docName: keyof EmbeddedDocs): string {
  return embeddedDocs[docName].content
}
`

fs.writeFileSync(outputPath, tsContent, 'utf-8')

console.log('')
console.log(`✅ 嵌入的文档模块已生成: ${outputPath}`)
console.log(`  → 包含 ${docsToEmbed.length} 个文档`)
console.log(`  → 总大小: ${tsContent.length} 字符`)
