/**
 * 前端调试检查脚本
 * 在浏览器控制台运行：fetch('/debug-check.js').then(r=>r.text()).then(eval)
 */

(async function debugCheck() {
  console.log('🔍 开始诊断 401 认证问题...\n')

  // 1. 检查 Session
  console.log('1️⃣ 检查 Session API...')
  try {
    const sessionResp = await fetch('/api/auth/session', { credentials: 'include' })
    const sessionData = await sessionResp.json()

    if (sessionData.user) {
      console.log('✅ Session 有效:', {
        email: sessionData.user.email,
        uuid: sessionData.user.uuid
      })
    } else {
      console.log('❌ Session 无效 - 请重新登录')
      return
    }
  } catch (error) {
    console.error('❌ Session API 调用失败:', error)
    return
  }

  // 2. 检查版本信息
  console.log('\n2️⃣ 检查代码版本...')
  try {
    const versionResp = await fetch('/api/debug/version')
    const versionData = await versionResp.json()

    console.log('代码版本信息:', {
      commit: versionData.version?.gitCommit,
      branch: versionData.version?.gitBranch,
      hasCredentialsFix: versionData.fixes?.credentialsIncludeFix
    })

    if (!versionData.fixes?.credentialsIncludeFix) {
      console.log('⚠️ 警告：线上代码未包含 credentials fix！')
      console.log('   需要重新部署最新代码')
    } else {
      console.log('✅ 代码版本正确，包含 credentials fix')
    }
  } catch (error) {
    console.log('⚠️ 无法获取版本信息 (可能是旧版本):', error.message)
  }

  // 3. 检查 Cookie
  console.log('\n3️⃣ 检查 Cookie...')
  const cookies = document.cookie.split(';').map(c => c.trim())
  const sessionCookie = cookies.find(c => c.startsWith('next-auth.session-token='))

  if (sessionCookie) {
    console.log('✅ Session Cookie 存在')
    console.log('   Cookie:', sessionCookie.substring(0, 50) + '...')
  } else {
    console.log('❌ Session Cookie 不存在')
  }

  // 4. 测试 Image-to-Video API
  console.log('\n4️⃣ 测试 Image-to-Video API (使用测试数据)...')
  try {
    const testResp = await fetch('/api/video/generate-image-to-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        image: 'https://picsum.photos/1920/1080.jpg',
        prompt: 'Test prompt for debugging',
        model: 'vidfab-q1',
        resolution: '720p',
        duration: 5,
        aspectRatio: '16:9'
      })
    })

    console.log('API 响应状态:', testResp.status, testResp.statusText)

    const testData = await testResp.json()

    if (testResp.ok) {
      console.log('✅ API 调用成功!')
      console.log('   响应:', testData)
    } else {
      console.log('❌ API 调用失败:', testData)

      if (testResp.status === 401) {
        console.log('\n🔍 401 错误分析:')
        console.log('   可能原因 1: 前端代码缺少 credentials: include')
        console.log('   可能原因 2: Session cookie 未发送')
        console.log('   可能原因 3: 后端认证配置问题')
      } else if (testResp.status === 400) {
        console.log('\n🔍 400 错误分析:')
        console.log('   参数验证失败，但认证通过了！')
        console.log('   这说明 credentials fix 已生效')
      }
    }
  } catch (error) {
    console.error('❌ API 调用异常:', error)
  }

  // 5. 检查 Network 请求
  console.log('\n5️⃣ Network 请求建议:')
  console.log('   1. 打开 Network 标签')
  console.log('   2. 找到失败的 generate-image-to-video 请求')
  console.log('   3. 检查 Request Headers 是否包含 Cookie')
  console.log('   4. 检查 Response 的详细错误信息')

  console.log('\n✅ 诊断完成!\n')
})()
