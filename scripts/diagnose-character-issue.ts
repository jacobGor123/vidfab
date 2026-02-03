#!/usr/bin/env tsx
/**
 * 诊断角色替换问题
 *
 * 用法:
 *   pnpm tsx scripts/diagnose-character-issue.ts <project_id>
 *
 * 功能:
 *   1. 检查 script_analysis.shots[].characters 是否包含别名
 *   2. 检查 project_characters 表中是否有重复角色
 *   3. 对比 script_analysis 和 project_characters 的数据一致性
 */

import { supabaseAdmin } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import type { ScriptAnalysisResult, Shot } from '@/lib/types/video-agent'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']
type ProjectCharacter = Database['public']['Tables']['project_characters']['Row']

// 从角色名称中提取简短名称
function shortName(name: string): string {
  return String(name || '').split('(')[0].trim()
}

// 生成别名列表
function toGenericAliases(name: string): string[] {
  const n = shortName(name).trim().toLowerCase()
  if (!n) return []
  const aliases = new Set<string>()

  const species = ['cat', 'dog', 'tiger', 'lion', 'bear', 'cow', 'horse', 'duck', 'chicken', 'sheep', 'pig']
  for (const s of species) {
    if (n.includes(s)) {
      aliases.add(`the ${s}`)
      aliases.add(s)
    }
  }

  if (n === 'orange cat' || (n.includes('cat') && n.includes('orange'))) {
    aliases.add('the orange cat')
    aliases.add('orange cat')
  }

  const colors = ['orange', 'black', 'white', 'brown', 'gray', 'grey', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'gold', 'silver']
  for (const s of species) {
    for (const c of colors) {
      if (n.includes(s) && n.includes(c)) {
        aliases.add(`${c} ${s}`)
        aliases.add(`the ${c} ${s}`)
      }
    }
  }

  return Array.from(aliases)
}

async function diagnose(projectId: string) {
  console.log('\n🔍 开始诊断项目:', projectId)
  console.log('=' .repeat(80))

  // 1. 加载项目数据
  const { data: project, error: projectError } = await supabaseAdmin
    .from('video_agent_projects')
    .select('*')
    .eq('id', projectId)
    .single<VideoAgentProject>()

  if (projectError || !project) {
    console.error('❌ 项目不存在:', projectError?.message)
    return
  }

  console.log('\n✅ 项目加载成功')
  console.log('   - ID:', project.id)
  console.log('   - 标题:', project.title)
  console.log('   - 创建时间:', project.created_at)

  // 2. 检查 script_analysis
  if (!project.script_analysis) {
    console.error('\n❌ script_analysis 为空')
    return
  }

  const analysis = project.script_analysis as unknown as ScriptAnalysisResult
  console.log('\n📄 Script Analysis:')
  console.log('   - 总时长:', analysis.duration, '秒')
  console.log('   - 分镜数量:', analysis.shot_count)
  console.log('   - 角色列表:', analysis.characters)

  // 3. 加载 project_characters
  const { data: characters, error: charsError } = await supabaseAdmin
    .from('project_characters')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .returns<ProjectCharacter[]>()

  if (charsError) {
    console.error('\n❌ 加载 project_characters 失败:', charsError.message)
    return
  }

  console.log('\n👥 Project Characters:')
  if (!characters || characters.length === 0) {
    console.log('   - 无角色配置')
  } else {
    characters.forEach((char, index) => {
      console.log(`   ${index + 1}. ${char.character_name}`)
      console.log(`      - 创建时间: ${char.created_at}`)
      console.log(`      - 更新时间: ${char.updated_at}`)
    })
  }

  // 4. 检查 shots 中的 characters 字段
  console.log('\n🎬 Shots Analysis:')
  console.log('=' .repeat(80))

  const shots = analysis.shots || []
  let issueCount = 0

  for (const shot of shots) {
    const shotChars = shot.characters || []

    if (shotChars.length === 0) {
      console.log(`\n⚠️  Shot ${shot.shot_number}: characters 为空`)
      console.log(`   - Description: ${shot.description.slice(0, 100)}...`)
      continue
    }

    // 检查是否包含别名
    const hasAliases = shotChars.some(charName => {
      const shortCharName = shortName(charName).toLowerCase()

      // 检查是否为完整名称（存在于 analysis.characters 或 project_characters 中）
      const inAnalysis = analysis.characters.some(c => shortName(c).toLowerCase() === shortCharName)
      const inProject = characters?.some(c => shortName(c.character_name).toLowerCase() === shortCharName)

      return !inAnalysis && !inProject
    })

    if (hasAliases) {
      issueCount++
      console.log(`\n🔥 Shot ${shot.shot_number}: 检测到可能的别名`)
      console.log(`   - shot.characters:`, shotChars)
      console.log(`   - analysis.characters:`, analysis.characters)
      console.log(`   - project_characters:`, characters?.map(c => c.character_name))
      console.log(`   - Description: ${shot.description.slice(0, 100)}...`)
      console.log(`   - Character Action: ${shot.character_action?.slice(0, 100)}...`)

      // 检查每个字符是否为别名
      shotChars.forEach(charName => {
        const shortCharName = shortName(charName).toLowerCase()
        const inAnalysis = analysis.characters.some(c => shortName(c).toLowerCase() === shortCharName)
        const inProject = characters?.some(c => shortName(c.character_name).toLowerCase() === shortCharName)

        if (!inAnalysis && !inProject) {
          console.log(`      ⚠️  "${charName}" 可能是别名`)

          // 尝试找出对应的完整名称
          const possibleMatches: string[] = []
          for (const fullName of [...analysis.characters, ...(characters?.map(c => c.character_name) || [])]) {
            const aliases = toGenericAliases(fullName)
            if (aliases.includes(shortCharName)) {
              possibleMatches.push(fullName)
            }
          }

          if (possibleMatches.length > 0) {
            console.log(`         可能对应: ${possibleMatches.join(', ')}`)
          }
        }
      })
    }
  }

  // 5. 总结
  console.log('\n' + '='.repeat(80))
  console.log('📊 诊断总结:')
  console.log('=' .repeat(80))

  if (issueCount === 0) {
    console.log('✅ 未检测到别名问题')
  } else {
    console.log(`🔥 检测到 ${issueCount} 个分镜存在别名问题`)
    console.log('\n建议修复方案:')
    console.log('1. 增强 character-replace API 的别名识别能力')
    console.log('2. 或者优先从 description/character_action 中提取角色信息')
    console.log('\n详细分析报告: discuss/角色替换后仍引用旧角色问题排查报告.md')
  }

  // 6. 检查重复角色
  const charNames = characters?.map(c => shortName(c.character_name).toLowerCase()) || []
  const duplicates = charNames.filter((name, index) => charNames.indexOf(name) !== index)

  if (duplicates.length > 0) {
    console.log('\n⚠️  检测到重复角色:')
    duplicates.forEach(dup => {
      const matches = characters?.filter(c => shortName(c.character_name).toLowerCase() === dup)
      console.log(`   - "${dup}":`)
      matches?.forEach(m => {
        console.log(`      - ${m.character_name} (${m.created_at})`)
      })
    })
  }

  console.log('\n✅ 诊断完成\n')
}

// 主函数
async function main() {
  const projectId = process.argv[2]

  if (!projectId) {
    console.error('Usage: pnpm tsx scripts/diagnose-character-issue.ts <project_id>')
    process.exit(1)
  }

  try {
    await diagnose(projectId)
  } catch (error) {
    console.error('\n❌ 诊断失败:', error)
    process.exit(1)
  }
}

main()
