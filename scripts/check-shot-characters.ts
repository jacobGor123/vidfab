/**
 * 检查 shot.characters 数据
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkShotCharacters() {
  // 从截图中看到的项目 ID（从 URL 中提取）
  // 如果能从截图URL中看到具体的项目ID，请替换这里
  const projectId = process.argv[2]

  if (!projectId) {
    console.error('❌ 请提供项目 ID')
    console.error('用法: npx tsx scripts/check-shot-characters.ts <project-id>')
    process.exit(1)
  }

  console.log(`🔍 检查项目 ${projectId} 的 shot.characters 数据\n`)

  const { data: project, error } = await supabase
    .from('video_agent_projects')
    .select('script_analysis')
    .eq('id', projectId)
    .single()

  if (error || !project) {
    console.error('❌ 获取项目失败:', error)
    process.exit(1)
  }

  const analysis = project.script_analysis as any

  if (!analysis || !analysis.shots) {
    console.error('❌ 项目没有 script_analysis 数据')
    process.exit(1)
  }

  console.log('📊 全局角色列表:')
  console.log('characters:', analysis.characters)
  console.log()

  console.log('📋 各分镜的 characters 数据:\n')

  analysis.shots.forEach((shot: any) => {
    console.log(`Shot ${shot.shot_number}:`)
    console.log(`  description: ${shot.description?.substring(0, 100)}...`)
    console.log(`  characters: ${JSON.stringify(shot.characters)}`)
    console.log(`  ❌ 问题: ${!shot.characters || shot.characters.length === 0 ? 'characters 为空！' : 'OK'}`)
    console.log()
  })
}

checkShotCharacters().catch(console.error)
