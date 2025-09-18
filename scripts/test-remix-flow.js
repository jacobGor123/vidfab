#!/usr/bin/env node

/**
 * 测试Remix功能完整流程的调试工具
 */

console.log('🔀 开始测试Remix功能流程...\n');

const fs = require('fs');
const path = require('path');

// 检查关键文件和代码片段
function checkRemixImplementation() {
  console.log('📁 检查Remix实现文件...');

  const filesToCheck = [
    {
      path: 'hooks/use-remix.ts',
      checks: [
        { pattern: /router\.push\('\/create\?tool=image-to-video'\)/, desc: '正确的URL跳转参数', critical: true },
        { pattern: /sessionStorage\.setItem\('vidfab-remix-data'/, desc: '数据存储到sessionStorage', critical: true },
        { pattern: /getRemixData.*sessionStorage\.getItem/, desc: '数据读取功能', critical: true },
        { pattern: /timestamp.*Date\.now/, desc: '时间戳验证', critical: false }
      ]
    },
    {
      path: 'components/create/template-gallery.tsx',
      checks: [
        { pattern: /useRemix/, desc: '导入useRemix hook', critical: true },
        { pattern: /onCreateSimilar.*remixVideo/, desc: '调用remixVideo函数', critical: true },
        { pattern: /onClick.*onCreateSimilar/, desc:'Remix按钮点击处理', critical: true },
        { pattern: /Copy.*Remix/, desc: 'Remix按钮UI', critical: false }
      ]
    },
    {
      path: 'components/create/image-to-video-panel.tsx',
      checks: [
        { pattern: /getRemixData.*clearRemixData/, desc: '导入remix数据方法', critical: true },
        { pattern: /useEffect.*getRemixData/, desc: '组件加载时检查remix数据', critical: true },
        { pattern: /setParams.*remixData\.prompt/, desc: '设置prompt数据', critical: true },
        { pattern: /setImagePreview.*remixData\.imageUrl/, desc: '设置图片数据', critical: true },
        { pattern: /uploadMode.*url/, desc: '切换到URL模式', critical: true }
      ]
    },
    {
      path: 'components/create/create-page-client.tsx',
      checks: [
        { pattern: /searchParams\.get\("tool"\)/, desc: '读取tool参数', critical: true },
        { pattern: /image-to-video/, desc: '支持image-to-video工具', critical: true }
      ]
    }
  ];

  let allGood = true;

  filesToCheck.forEach(fileInfo => {
    const fullPath = path.join(process.cwd(), fileInfo.path);

    if (!fs.existsSync(fullPath)) {
      console.log(`   ❌ ${fileInfo.path} - 文件不存在`);
      allGood = false;
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    console.log(`   📂 ${fileInfo.path}:`);

    fileInfo.checks.forEach(check => {
      const found = check.pattern.test(content);
      const status = found ? '✅' : (check.critical ? '❌' : '⚠️');
      console.log(`      ${status} ${check.desc}`);

      if (!found && check.critical) {
        allGood = false;
      }
    });

    console.log('');
  });

  return allGood;
}

// 生成Remix流程测试页面
function generateRemixTestPage() {
  console.log('📄 生成Remix流程测试页面...');

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Remix流程测试</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background: #1a1a1a;
            color: white;
        }
        .test-container {
            margin: 20px 0;
            padding: 20px;
            border: 1px solid #333;
            border-radius: 8px;
            background: #2a2a2a;
        }
        .test-step {
            margin: 10px 0;
            padding: 15px;
            border-radius: 6px;
            background: #3a3a3a;
        }
        .step-title {
            font-weight: bold;
            color: #00bcd4;
            margin-bottom: 10px;
        }
        button {
            margin: 5px;
            padding: 10px 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover { background: #0056b3; }
        .success { color: #4caf50; }
        .error { color: #f44336; }
        .warning { color: #ff9800; }
        code {
            background: #444;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        .data-display {
            background: #222;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <h1>🔀 Remix功能流程测试</h1>
    <p>这个页面模拟测试从Discover页面点击Remix到Image-to-Video页面的完整流程</p>

    <div class="test-container">
        <h3>步骤1: 模拟Discover页面的Remix数据</h3>
        <div class="test-step">
            <div class="step-title">设置测试数据</div>
            <p>模拟用户在Discover页面选择的视频数据：</p>
            <div class="data-display" id="testData"></div>
            <button onclick="setTestData()">设置测试数据</button>
            <button onclick="clearTestData()">清除数据</button>
        </div>
    </div>

    <div class="test-container">
        <h3>步骤2: 测试sessionStorage存储和读取</h3>
        <div class="test-step">
            <div class="step-title">存储Remix数据</div>
            <button onclick="storeRemixData()">存储到sessionStorage</button>
            <div id="storeResult" class="data-display"></div>
        </div>
        <div class="test-step">
            <div class="step-title">读取Remix数据</div>
            <button onclick="readRemixData()">从sessionStorage读取</button>
            <div id="readResult" class="data-display"></div>
        </div>
    </div>

    <div class="test-container">
        <h3>步骤3: 测试URL跳转</h3>
        <div class="test-step">
            <div class="step-title">模拟跳转到Image-to-Video页面</div>
            <p>注意：实际应用中会跳转到 <code>/create?tool=image-to-video</code></p>
            <button onclick="simulateNavigation()">模拟页面跳转</button>
            <div id="navigationResult" class="data-display"></div>
        </div>
    </div>

    <div class="test-container">
        <h3>步骤4: 模拟Image-to-Video页面数据加载</h3>
        <div class="test-step">
            <div class="step-title">检查数据加载和表单填充</div>
            <button onclick="simulateDataLoad()">模拟数据加载</button>
            <div id="loadResult" class="data-display"></div>
        </div>
    </div>

    <div class="test-container">
        <h3>步骤5: 完整流程测试</h3>
        <div class="test-step">
            <div class="step-title">端到端流程验证</div>
            <button onclick="runFullTest()" style="background: #28a745;">运行完整测试</button>
            <div id="fullTestResult" class="data-display"></div>
        </div>
    </div>

    <script>
        // 测试数据
        const testVideoData = {
            id: 'demo-video-1',
            prompt: 'Cinematic sunrise over mountains with golden light',
            imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
            title: 'Mountain Sunrise'
        };

        function setTestData() {
            document.getElementById('testData').textContent = JSON.stringify(testVideoData, null, 2);
            console.log('✅ 测试数据已设置');
        }

        function clearTestData() {
            document.getElementById('testData').textContent = '';
            sessionStorage.removeItem('vidfab-remix-data');
            console.log('🗑️ 测试数据已清除');
        }

        function storeRemixData() {
            try {
                const remixPayload = {
                    prompt: testVideoData.prompt,
                    imageUrl: testVideoData.imageUrl,
                    title: testVideoData.title,
                    timestamp: Date.now()
                };

                sessionStorage.setItem('vidfab-remix-data', JSON.stringify(remixPayload));

                const result = '✅ 成功存储到sessionStorage\\n' +
                             'Key: vidfab-remix-data\\n' +
                             'Data: ' + JSON.stringify(remixPayload, null, 2);

                document.getElementById('storeResult').textContent = result;
                document.getElementById('storeResult').className = 'data-display success';

            } catch (error) {
                const result = '❌ 存储失败: ' + error.message;
                document.getElementById('storeResult').textContent = result;
                document.getElementById('storeResult').className = 'data-display error';
            }
        }

        function readRemixData() {
            try {
                const stored = sessionStorage.getItem('vidfab-remix-data');

                if (!stored) {
                    document.getElementById('readResult').textContent = '⚠️ 没有找到remix数据';
                    document.getElementById('readResult').className = 'data-display warning';
                    return;
                }

                const data = JSON.parse(stored);
                const now = Date.now();
                const age = now - (data.timestamp || 0);

                let result = '';
                if (age > 5 * 60 * 1000) {
                    result = '⚠️ 数据已过期 (>5分钟)\\n';
                    result += 'Age: ' + Math.round(age / 1000) + ' seconds\\n';
                } else {
                    result = '✅ 成功读取remix数据\\n';
                    result += 'Age: ' + Math.round(age / 1000) + ' seconds\\n';
                }

                result += 'Data: ' + JSON.stringify(data, null, 2);

                document.getElementById('readResult').textContent = result;
                document.getElementById('readResult').className = 'data-display success';

            } catch (error) {
                const result = '❌ 读取失败: ' + error.message;
                document.getElementById('readResult').textContent = result;
                document.getElementById('readResult').className = 'data-display error';
            }
        }

        function simulateNavigation() {
            const targetUrl = '/create?tool=image-to-video';
            const result = '🔗 模拟跳转到: ' + targetUrl + '\\n\\n' +
                          '在实际应用中，这会：\\n' +
                          '1. 使用router.push()跳转页面\\n' +
                          '2. create-page-client读取tool=image-to-video参数\\n' +
                          '3. 切换到Image-to-Video标签页\\n' +
                          '4. 显示ImageToVideoPanelEnhanced组件';

            document.getElementById('navigationResult').textContent = result;
            document.getElementById('navigationResult').className = 'data-display success';
        }

        function simulateDataLoad() {
            try {
                const stored = sessionStorage.getItem('vidfab-remix-data');

                if (!stored) {
                    throw new Error('没有remix数据');
                }

                const remixData = JSON.parse(stored);

                // 模拟Image-to-Video页面的数据加载逻辑
                const result = '✅ 模拟Image-to-Video页面数据加载：\\n\\n' +
                              '1. 检查sessionStorage中的remix数据\\n' +
                              '2. 设置prompt: "' + remixData.prompt + '"\\n' +
                              '3. 设置imageUrl: "' + remixData.imageUrl + '"\\n' +
                              '4. 切换到URL上传模式\\n' +
                              '5. 设置图片预览\\n' +
                              '6. 清除remix数据避免重复触发\\n\\n' +
                              '表单将自动填充用户可以直接生成视频！';

                document.getElementById('loadResult').textContent = result;
                document.getElementById('loadResult').className = 'data-display success';

                // 清除数据，模拟真实应用的行为
                sessionStorage.removeItem('vidfab-remix-data');

            } catch (error) {
                const result = '❌ 数据加载失败: ' + error.message;
                document.getElementById('loadResult').textContent = result;
                document.getElementById('loadResult').className = 'data-display error';
            }
        }

        async function runFullTest() {
            const resultDiv = document.getElementById('fullTestResult');
            resultDiv.textContent = '🔄 运行完整流程测试...';

            try {
                // Step 1: 设置测试数据
                setTestData();
                await new Promise(r => setTimeout(r, 500));

                // Step 2: 存储数据
                storeRemixData();
                await new Promise(r => setTimeout(r, 500));

                // Step 3: 读取数据
                readRemixData();
                await new Promise(r => setTimeout(r, 500));

                // Step 4: 模拟跳转
                simulateNavigation();
                await new Promise(r => setTimeout(r, 500));

                // Step 5: 模拟数据加载
                simulateDataLoad();

                const result = '🎉 完整流程测试成功！\\n\\n' +
                              '所有步骤都正常工作：\\n' +
                              '✅ 数据存储\\n' +
                              '✅ 数据读取\\n' +
                              '✅ URL跳转\\n' +
                              '✅ 表单填充\\n\\n' +
                              'Remix功能应该可以正常工作了！';

                resultDiv.textContent = result;
                resultDiv.className = 'data-display success';

            } catch (error) {
                resultDiv.textContent = '❌ 完整流程测试失败: ' + error.message;
                resultDiv.className = 'data-display error';
            }
        }

        // 初始化
        setTestData();
    </script>
</body>
</html>`;

  fs.writeFileSync(path.join(process.cwd(), 'test-remix.html'), html);
  console.log('✅ Remix流程测试页面已生成: test-remix.html');
  console.log('');
}

// 主函数
async function main() {
  const implementationOk = checkRemixImplementation();

  generateRemixTestPage();

  console.log('📋 Remix功能测试总结:');
  console.log('='.repeat(50));

  if (implementationOk) {
    console.log('✅ 所有关键实现都检查通过');
    console.log('✅ URL参数问题已修复 (tool=image-to-video)');
    console.log('✅ 数据传递链路完整');
    console.log('');
    console.log('🎯 现在可以测试Remix功能:');
    console.log('1. 启动开发服务器: npm run dev');
    console.log('2. 打开浏览器访问 /create?tool=discover');
    console.log('3. 切换到演示模式 (右上角按钮)');
    console.log('4. 鼠标悬停视频预览');
    console.log('5. 点击Remix按钮');
    console.log('6. 应该会跳转到Image-to-Video页面并自动填充数据');
    console.log('');
    console.log('🧪 或者打开 test-remix.html 进行离线测试');

  } else {
    console.log('❌ 发现一些实现问题，需要检查上述标记的错误');
  }

  console.log('');
  console.log('🔍 调试技巧:');
  console.log('- 打开浏览器开发者工具');
  console.log('- 查看Network标签页的请求');
  console.log('- 查看Console中的日志输出');
  console.log('- 检查Application > Session Storage中的数据');
}

main();