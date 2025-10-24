/**
 * 测试积分边界条件
 * 场景: 用户有 10 积分, 需要 10 积分生成视频
 * 预期: 应该可以生成
 */

// 模拟 simple-credits-check.ts 的逻辑
function checkUserCredits(userCredits, requiredCredits) {
  const canAfford = userCredits >= requiredCredits
  return {
    success: true,
    canAfford,
    userCredits,
    requiredCredits,
    remainingCredits: Math.max(0, userCredits - requiredCredits)
  }
}

function deductUserCredits(currentCredits, creditsToDeduct) {
  // 检查积分是否足够
  if (currentCredits < creditsToDeduct) {
    return {
      success: false,
      error: 'Insufficient credits',
      newBalance: currentCredits
    }
  }

  const newBalance = currentCredits - creditsToDeduct

  return {
    success: true,
    newBalance
  }
}

// 模拟 hasEnoughCredits 函数
function hasEnoughCredits(userCredits, requiredCredits) {
  return userCredits >= requiredCredits
}

// 测试场景
console.log('========== 测试场景: 用户有 10 积分, 需要 10 积分 ==========\n')

const userCredits = 10
const requiredCredits = 10

console.log(`用户积分: ${userCredits}`)
console.log(`需要积分: ${requiredCredits}\n`)

// 1. 前端预检 (use-subscription-simple.ts)
console.log('1. 前端预检 (hasEnoughCredits)')
const frontendCheck = hasEnoughCredits(userCredits, requiredCredits)
console.log(`   结果: ${frontendCheck ? '✅ 通过' : '❌ 不通过'}`)
console.log(`   10 >= 10 = ${frontendCheck}\n`)

// 2. 后端检查 (checkUserCredits)
console.log('2. 后端检查 (checkUserCredits)')
const backendCheck = checkUserCredits(userCredits, requiredCredits)
console.log(`   success: ${backendCheck.success}`)
console.log(`   canAfford: ${backendCheck.canAfford ? '✅ 可以负担' : '❌ 无法负担'}`)
console.log(`   canAfford 逻辑: ${userCredits} >= ${requiredCredits} = ${backendCheck.canAfford}`)
console.log(`   剩余积分: ${backendCheck.remainingCredits}\n`)

if (!backendCheck.canAfford) {
  console.log('❌ 后端检查失败! 返回 402 错误\n')
  console.log('返回的错误信息:')
  console.log(JSON.stringify({
    error: "Insufficient credits",
    code: "INSUFFICIENT_CREDITS",
    message: `You need ${requiredCredits} credits but only have ${userCredits}. Please upgrade your plan.`,
    requiredCredits: requiredCredits,
    userCredits: userCredits
  }, null, 2))
} else {
  console.log('✅ 后端检查通过! 继续扣除积分\n')

  // 3. 扣除积分 (deductUserCredits)
  console.log('3. 扣除积分 (deductUserCredits)')
  const deductResult = deductUserCredits(userCredits, requiredCredits)
  console.log(`   success: ${deductResult.success ? '✅ 成功' : '❌ 失败'}`)

  if (deductResult.success) {
    console.log(`   新余额: ${deductResult.newBalance}`)
    console.log(`   扣除逻辑: ${userCredits} - ${requiredCredits} = ${deductResult.newBalance}`)
  } else {
    console.log(`   错误: ${deductResult.error}`)
    console.log(`   判断逻辑: ${userCredits} < ${requiredCredits} = ${userCredits < requiredCredits}`)
  }
}

console.log('\n========== 测试边界情况 ==========\n')

// 测试各种边界情况
const testCases = [
  { user: 9, required: 10, expect: false },
  { user: 10, required: 10, expect: true },
  { user: 11, required: 10, expect: true },
  { user: 0, required: 10, expect: false },
]

testCases.forEach(({ user, required, expect }) => {
  const check = hasEnoughCredits(user, required)
  const deduct = deductUserCredits(user, required)
  const status = check === expect ? '✅' : '❌'
  console.log(`${status} 用户 ${user} 积分, 需要 ${required} 积分:`)
  console.log(`   hasEnoughCredits: ${check} (预期: ${expect})`)
  console.log(`   deductUserCredits: ${deduct.success ? '成功' : '失败'}`)
  console.log(`   ${user} >= ${required} = ${check}`)
  console.log(`   ${user} < ${required} = ${user < required}`)
  console.log()
})

console.log('\n========== 结论 ==========\n')
console.log('根据代码逻辑分析:')
console.log('- userCredits >= requiredCredits 的判断是正确的')
console.log('- currentCredits < creditsToDeduct 的判断也是正确的')
console.log('- 10 积分应该可以生成 10 积分的视频')
console.log('\n如果实际出现 "Insufficient credits" 错误,可能的原因:')
console.log('1. 积分计算错误 (calculateRequiredCredits 返回的值 > 10)')
console.log('2. 数据库中的实际积分 < 10')
console.log('3. 前端缓存的积分数据不准确')
console.log('4. 其他未知的积分扣除逻辑')
