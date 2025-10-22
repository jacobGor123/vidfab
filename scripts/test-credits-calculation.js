// 测试积分计算逻辑

const CREDITS_CONSUMPTION = {
  'seedance-v1-pro-t2v': {
    '480p-5s': 10,
    '480p-10s': 20,
    '720p-5s': 20,
    '720p-10s': 40,
    '1080p-5s': 40,
    '1080p-10s': 80
  },
  'veo3-fast': {
    '720p-5s': 70,
    '720p-8s': 100,
    '720p-10s': 130,
    '1080p-5s': 90,
    '1080p-8s': 130,
    '1080p-10s': 170
  },
  'video-effects': {
    '5s': 30
  }
}

function calculateRequiredCredits(model, resolution, duration) {
  const durationNum = parseInt(duration) || 5
  const durationStr = `${durationNum}s`

  let mappedModel
  if (model === "vidfab-q1" || model === "seedance-v1-pro-t2v") {
    mappedModel = "seedance-v1-pro-t2v"
  } else if (model === "vidfab-pro" || model === "veo3-fast") {
    mappedModel = "veo3-fast"
  } else if (model === "video-effects") {
    mappedModel = "video-effects"
  } else {
    mappedModel = "seedance-v1-pro-t2v"
  }

  const modelConfig = CREDITS_CONSUMPTION[mappedModel]

  if (mappedModel === "video-effects") {
    return modelConfig['5s'] || 30
  }

  const lookupKey = `${resolution}-${durationStr}`
  const credits = modelConfig[lookupKey]

  if (credits) {
    return credits
  }

  // 默认值处理
  if (mappedModel === "seedance-v1-pro-t2v") {
    if (resolution === "480p") return durationNum === 5 ? 10 : 20
    if (resolution === "720p") return durationNum === 5 ? 20 : 40
    if (resolution === "1080p") return durationNum === 5 ? 40 : 80
    return 10
  }

  if (mappedModel === "veo3-fast") {
    if (resolution === "720p") return durationNum <= 5 ? 70 : (durationNum <= 8 ? 100 : 130)
    if (resolution === "1080p") return durationNum <= 5 ? 90 : (durationNum <= 8 ? 130 : 170)
    return 70
  }

  return 10
}

console.log('========== 测试所有可能的 10 积分配置 ==========\n')

// 找出哪些配置需要 10 积分
const testCases = [
  { model: 'vidfab-q1', resolution: '480p', duration: '5s', expected: 10 },
  { model: 'vidfab-q1', resolution: '480p', duration: '5', expected: 10 },
  { model: 'seedance-v1-pro-t2v', resolution: '480p', duration: '5s', expected: 10 },
  { model: 'seedance-v1-pro-t2v', resolution: '480p', duration: '5', expected: 10 },
]

testCases.forEach(({ model, resolution, duration, expected }) => {
  const result = calculateRequiredCredits(model, resolution, duration)
  const status = result === expected ? '✅' : '❌'
  console.log(`${status} Model: ${model}, ${resolution}, ${duration}`)
  console.log(`   计算结果: ${result} 积分 (预期: ${expected})`)
  console.log()
})

console.log('\n========== 测试异常情况 ==========\n')

// 测试可能的异常输入
const edgeCases = [
  { model: 'vidfab-q1', resolution: '480p', duration: 5 },
  { model: 'vidfab-q1', resolution: '480p', duration: '5.0' },
  { model: 'vidfab-q1', resolution: '480p', duration: ' 5 ' },
]

edgeCases.forEach(({ model, resolution, duration }) => {
  const result = calculateRequiredCredits(model, resolution, String(duration))
  console.log(`Model: ${model}, ${resolution}, duration: "${duration}"`)
  console.log(`   parseInt("${duration}") = ${parseInt(String(duration))}`)
  console.log(`   计算结果: ${result} 积分`)
  console.log()
})

console.log('\n========== 关键问题排查 ==========\n')

// 模拟后端API接收的参数格式
console.log('后端 API 接收的参数格式测试:\n')

// Text-to-video API (generate/route.ts:99)
const apiParams1 = {
  model: 'vidfab-q1',
  resolution: '720p',
  duration: 5  // ⚠️ 注意:这里可能是数字
}

const durationStr1 = typeof apiParams1.duration === 'number' ? `${apiParams1.duration}s` : apiParams1.duration
console.log('场景 1: Text-to-video API')
console.log(`  原始参数: model="${apiParams1.model}", resolution="${apiParams1.resolution}", duration=${apiParams1.duration}`)
console.log(`  转换后: duration="${durationStr1}"`)
console.log(`  计算结果: ${calculateRequiredCredits(apiParams1.model, apiParams1.resolution, durationStr1)} 积分\n`)

// 测试映射逻辑
console.log('场景 2: 模型名称映射测试')
const modelMappings = [
  { frontend: 'vidfab-q1', backend: 'seedance-v1-pro-t2v' },
  { frontend: 'vidfab-q1', backend: 'vidfab-q1' }, // ⚠️ 可能直接使用前端名称
  { frontend: 'vidfab-pro', backend: 'veo3-fast' },
  { frontend: 'vidfab-pro', backend: 'vidfab-pro' }, // ⚠️ 可能直接使用前端名称
]

modelMappings.forEach(({ frontend, backend }) => {
  const result = calculateRequiredCredits(backend, '480p', '5s')
  console.log(`  前端: "${frontend}" -> 后端: "${backend}" -> ${result} 积分`)
})
