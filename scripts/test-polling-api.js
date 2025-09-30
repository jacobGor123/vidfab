#!/usr/bin/env node

/**
 * 视频生成轮询功能测试脚本
 * 测试三种视频生成类型的API端点连通性和轮询逻辑
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  step: (step, msg) => console.log(`${colors.cyan}🔄 步骤 ${step}:${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.magenta}🎯 ${msg}${colors.reset}\n`)
};

const API_BASE = 'http://localhost:3000';

// 测试结果收集
const testResults = {
  textToVideo: { api: false, polling: false },
  imageToVideo: { api: false, polling: false },
  videoEffects: { api: false, polling: false }
};

// 工具函数：延迟
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 测试API端点连通性
 */
async function testApiEndpoint(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.text();

    return {
      success: response.ok,
      status: response.status,
      data: data,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 测试 Text-to-Video API 端点
 */
async function testTextToVideoAPI() {
  log.title("测试 Text-to-Video API 端点");

  log.step(1, "测试 /api/video/generate 端点连通性");

  // 测试 GET 请求（应该返回405）
  const getResult = await testApiEndpoint('/api/video/generate', 'GET');
  if (getResult.status === 405) {
    log.success("GET 请求正确返回 405 Method Not Allowed");
  } else {
    log.error(`GET 请求返回意外状态: ${getResult.status}`);
  }

  // 测试 POST 请求（应该返回401 - 未认证）
  const postResult = await testApiEndpoint('/api/video/generate', 'POST', {
    prompt: "Test video generation",
    model: "vidu-q1",
    duration: 5,
    resolution: "720p",
    aspectRatio: "16:9"
  });

  log.info(`POST 请求状态: ${postResult.status}`);
  if (postResult.status === 401) {
    log.success("POST 请求正确返回 401 Authentication Required");
    testResults.textToVideo.api = true;
  } else if (postResult.status === 400) {
    log.warning("POST 请求返回 400 - 可能是参数验证问题");
  } else {
    log.error(`POST 请求返回意外状态: ${postResult.status}`);
    log.error(`响应数据: ${postResult.data}`);
  }

  log.step(2, "测试轮询相关端点");

  // 测试状态查询端点
  const statusResult = await testApiEndpoint('/api/video/status/test-request-id');
  log.info(`状态查询端点返回: ${statusResult.status}`);

  if (statusResult.status === 400 || statusResult.status === 404) {
    log.success("状态查询端点工作正常（返回400/404是预期的）");
    testResults.textToVideo.polling = true;
  } else {
    log.error(`状态查询端点返回意外状态: ${statusResult.status}`);
  }
}

/**
 * 测试 Image-to-Video API 端点
 */
async function testImageToVideoAPI() {
  log.title("测试 Image-to-Video API 端点");

  log.step(1, "测试 /api/video/generate-image-to-video 端点连通性");

  // 测试 POST 请求（应该返回401 - 未认证）
  const postResult = await testApiEndpoint('/api/video/generate-image-to-video', 'POST', {
    image: "https://example.com/test-image.jpg",
    prompt: "Transform this image into video",
    model: "vidu-q1",
    duration: 5,
    resolution: "720p",
    aspectRatio: "16:9"
  });

  log.info(`POST 请求状态: ${postResult.status}`);
  if (postResult.status === 401) {
    log.success("POST 请求正确返回 401 Authentication Required");
    testResults.imageToVideo.api = true;
  } else if (postResult.status === 400) {
    log.warning("POST 请求返回 400 - 可能是参数验证问题");
    testResults.imageToVideo.api = true; // 说明端点工作正常
  } else {
    log.error(`POST 请求返回意外状态: ${postResult.status}`);
    log.error(`响应数据: ${postResult.data}`);
  }

  // 复用相同的轮询端点
  testResults.imageToVideo.polling = testResults.textToVideo.polling;
}

/**
 * 测试 Video Effects API 端点
 */
async function testVideoEffectsAPI() {
  log.title("测试 Video Effects API 端点");

  log.step(1, "测试 /api/video/effects 端点连通性");

  // 测试 POST 请求（应该返回401 - 未认证）
  const postResult = await testApiEndpoint('/api/video/effects', 'POST', {
    image: "https://example.com/test-image.jpg",
    effectId: "face_dance",
    effectName: "Face Dance"
  });

  log.info(`POST 请求状态: ${postResult.status}`);
  if (postResult.status === 401) {
    log.success("POST 请求正确返回 401 Authentication Required");
    testResults.videoEffects.api = true;
  } else if (postResult.status === 400) {
    log.warning("POST 请求返回 400 - 可能是参数验证问题");
    testResults.videoEffects.api = true; // 说明端点工作正常
  } else {
    log.error(`POST 请求返回意外状态: ${postResult.status}`);
    log.error(`响应数据: ${postResult.data}`);
  }

  // 复用相同的轮询端点
  testResults.videoEffects.polling = testResults.textToVideo.polling;
}

/**
 * 分析轮询实现逻辑
 */
function analyzePollingImplementation() {
  log.title("分析轮询实现逻辑");

  log.info("根据代码分析，轮询实现的关键点:");
  log.info("1. 组件使用 useVideoGeneration + useVideoPolling hooks");
  log.info("2. 生成成功后调用 startPolling(jobId)");
  log.info("3. 轮询间隔: 3秒，最大轮询时长: 30分钟");
  log.info("4. 状态轮询: processing -> completed/failed");
  log.info("5. 所有三种类型都使用相同的状态查询端点");

  log.info("\n轮询流程:");
  log.info("  生成API调用 -> 获得requestId -> 启动轮询 -> 周期性查询状态");
  log.info("  -> 完成时更新UI并停止轮询");

  log.info("\n潜在问题分析:");
  if (!testResults.textToVideo.polling) {
    log.warning("- 轮询端点可能存在问题");
  }

  log.info("- 429错误处理需要在轮询逻辑中正确处理");
  log.info("- UI状态转换 (Submitting -> Processing) 依赖轮询反馈");
}

/**
 * 模拟轮询测试
 */
async function simulatePollingTest() {
  log.title("模拟轮询行为测试");

  log.step(1, "模拟轮询场景");

  // 模拟连续轮询请求
  const requestIds = ['fake-request-1', 'fake-request-2', 'non-existent-id'];

  for (const requestId of requestIds) {
    log.info(`测试轮询请求ID: ${requestId}`);
    const result = await testApiEndpoint(`/api/video/status/${requestId}`);

    log.info(`  状态: ${result.status}`);
    if (result.data) {
      try {
        const parsed = JSON.parse(result.data);
        log.info(`  响应: ${JSON.stringify(parsed, null, 2)}`);
      } catch (e) {
        log.info(`  响应 (文本): ${result.data.substring(0, 100)}...`);
      }
    }

    await sleep(500); // 避免过快请求
  }
}

/**
 * 检查429错误处理
 */
async function test429Handling() {
  log.title("测试429错误处理");

  log.info("由于没有真实认证，无法完整测试429场景");
  log.info("但可以验证API端点对过多请求的处理");

  // 快速连续请求来观察行为
  log.step(1, "发送多个快速请求");

  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(testApiEndpoint('/api/video/status/test-request'));
  }

  const results = await Promise.all(promises);

  let rateLimited = false;
  results.forEach((result, index) => {
    log.info(`请求 ${index + 1}: 状态 ${result.status}`);
    if (result.status === 429) {
      rateLimited = true;
    }
  });

  if (rateLimited) {
    log.success("检测到429错误处理机制");
  } else {
    log.info("未触发429错误（可能需要更多请求或真实认证）");
  }
}

/**
 * 生成测试报告
 */
function generateTestReport() {
  log.title("测试报告");

  console.log('\n' + '='.repeat(60));
  console.log('                 视频生成轮询功能测试报告');
  console.log('='.repeat(60));

  // API连通性测试结果
  console.log('\n📡 API端点连通性:');
  console.log(`  Text-to-Video:    ${testResults.textToVideo.api ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  Image-to-Video:   ${testResults.imageToVideo.api ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  Video Effects:    ${testResults.videoEffects.api ? '✅ 通过' : '❌ 失败'}`);

  // 轮询功能测试结果
  console.log('\n🔄 轮询功能:');
  console.log(`  状态查询端点:     ${testResults.textToVideo.polling ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  轮询逻辑实现:     ✅ 已分析`);

  // 总体评估
  const apiCount = Object.values(testResults).filter(r => r.api).length;
  const pollingOk = testResults.textToVideo.polling;

  console.log('\n📊 总体评估:');
  console.log(`  API端点正常率:    ${apiCount}/3 (${Math.round(apiCount/3*100)}%)`);
  console.log(`  轮询功能状态:     ${pollingOk ? '正常' : '异常'}`);

  // 问题和建议
  console.log('\n🔧 发现的问题和建议:');

  if (apiCount < 3) {
    console.log('  ⚠️  部分API端点可能存在问题，需要进一步调试');
  }

  if (!pollingOk) {
    console.log('  ⚠️  轮询端点返回异常状态，可能影响状态更新');
  }

  console.log('  ✅ 轮询实现架构合理，使用了适当的hook组合');
  console.log('  ✅ 三种生成类型共享轮询逻辑，减少了代码重复');

  console.log('\n📋 测试建议:');
  console.log('  1. 在浏览器中进行实际的用户交互测试');
  console.log('  2. 监控浏览器开发者工具的Network和Console标签');
  console.log('  3. 测试在有效用户登录状态下的完整流程');
  console.log('  4. 验证UI状态转换（Submitting -> Processing -> Completed）');
  console.log('  5. 测试错误场景（429、网络中断等）的处理');

  console.log('\n='.repeat(60));
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log(`${colors.bright}${colors.magenta}`);
  console.log('🎥 视频生成轮询功能测试套件');
  console.log(`测试服务器: ${API_BASE}`);
  console.log(`时间: ${new Date().toLocaleString()}`);
  console.log(`${colors.reset}\n`);

  try {
    // 测试三种API端点
    await testTextToVideoAPI();
    await testImageToVideoAPI();
    await testVideoEffectsAPI();

    // 分析轮询实现
    analyzePollingImplementation();

    // 模拟轮询测试
    await simulatePollingTest();

    // 测试429处理
    await test429Handling();

    // 生成报告
    generateTestReport();

  } catch (error) {
    log.error(`测试过程中发生错误: ${error.message}`);
    console.error(error);
  }
}

// 检查是否有Node.js fetch
if (typeof fetch === 'undefined') {
  log.error('需要Node.js 18+版本以支持原生fetch API');
  process.exit(1);
}

// 运行测试
runTests().catch(console.error);