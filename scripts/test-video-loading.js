#!/usr/bin/env node

/**
 * 测试视频加载问题的调试工具
 */

console.log('🎬 开始测试视频加载问题...\n');

const fs = require('fs');
const https = require('https');
const path = require('path');

// 读取视频模板数据
const templatePath = path.join(process.cwd(), 'data/video-templates.ts');

if (!fs.existsSync(templatePath)) {
  console.log('❌ 找不到 data/video-templates.ts 文件');
  process.exit(1);
}

// 从文件中提取测试用的视频URL
const rawEntries = [
  {
    name: "测试视频1",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-2910ad47-9d15-4ab4-8a59-aea9cf2500d8.mp4",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-2910ad47-9d15-4ab4-8a59-aea9cf2500d8.png"
  },
  {
    name: "测试视频2",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-cc5fedd1-507a-4415-bef7-7bfe1d3e8c49.mp4",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-cc5fedd1-507a-4415-bef7-7bfe1d3e8c49.png"
  },
  {
    name: "测试视频3",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-18f88fc8-b716-4766-9d99-19cadea0a78c.mp4",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-18f88fc8-b716-4766-9d99-19cadea0a78c.png"
  }
];

// 测试URL可访问性
async function testUrl(url, type) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const req = https.request(url, { method: 'HEAD' }, (res) => {
      const responseTime = Date.now() - startTime;
      resolve({
        url,
        type,
        status: res.statusCode,
        contentType: res.headers['content-type'],
        contentLength: res.headers['content-length'],
        responseTime,
        success: res.statusCode >= 200 && res.statusCode < 300
      });
    });

    req.on('error', (err) => {
      const responseTime = Date.now() - startTime;
      resolve({
        url,
        type,
        status: 'ERROR',
        error: err.message,
        responseTime,
        success: false
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      const responseTime = Date.now() - startTime;
      resolve({
        url,
        type,
        status: 'TIMEOUT',
        responseTime,
        success: false
      });
    });

    req.end();
  });
}

// 批量测试
async function runTests() {
  console.log('🔍 开始测试URL可访问性...\n');

  for (const entry of rawEntries) {
    console.log(`📁 测试 ${entry.name}:`);
    console.log('   ' + '='.repeat(50));

    // 测试图片URL
    const imageResult = await testUrl(entry.imageUrl, 'image');
    console.log(`   🖼️  图片: ${imageResult.success ? '✅' : '❌'}`);
    console.log(`       URL: ${entry.imageUrl}`);
    console.log(`       状态: ${imageResult.status}`);
    console.log(`       类型: ${imageResult.contentType || 'N/A'}`);
    console.log(`       大小: ${imageResult.contentLength ? (parseInt(imageResult.contentLength) / 1024).toFixed(1) + 'KB' : 'N/A'}`);
    console.log(`       耗时: ${imageResult.responseTime}ms`);
    if (imageResult.error) {
      console.log(`       错误: ${imageResult.error}`);
    }

    // 测试视频URL
    const videoResult = await testUrl(entry.videoUrl, 'video');
    console.log(`   🎬 视频: ${videoResult.success ? '✅' : '❌'}`);
    console.log(`       URL: ${entry.videoUrl}`);
    console.log(`       状态: ${videoResult.status}`);
    console.log(`       类型: ${videoResult.contentType || 'N/A'}`);
    console.log(`       大小: ${videoResult.contentLength ? (parseInt(videoResult.contentLength) / (1024*1024)).toFixed(1) + 'MB' : 'N/A'}`);
    console.log(`       耗时: ${videoResult.responseTime}ms`);
    if (videoResult.error) {
      console.log(`       错误: ${videoResult.error}`);
    }

    console.log('');
  }
}

// 检查template-gallery.tsx中的视频处理逻辑
function checkTemplateGallery() {
  console.log('🔍 检查 template-gallery.tsx 中的视频处理逻辑...\n');

  const galleryPath = path.join(process.cwd(), 'components/create/template-gallery.tsx');
  if (!fs.existsSync(galleryPath)) {
    console.log('❌ 找不到 template-gallery.tsx 文件');
    return;
  }

  const content = fs.readFileSync(galleryPath, 'utf8');

  // 检查关键代码片段
  const checks = [
    {
      pattern: /video\.urls\.video\.high/,
      desc: '使用 video.urls.video.high 作为视频源',
      critical: true
    },
    {
      pattern: /onCanPlay.*handleVideoCanPlay/,
      desc: '设置了 onCanPlay 事件处理器',
      critical: true
    },
    {
      pattern: /onError.*handleVideoError/,
      desc: '设置了 onError 事件处理器',
      critical: true
    },
    {
      pattern: /autoPlay/,
      desc: '设置了 autoPlay 属性',
      critical: true
    },
    {
      pattern: /muted/,
      desc: '设置了 muted 属性',
      critical: true
    },
    {
      pattern: /preload.*none/,
      desc: '使用了 preload="none"',
      critical: false
    }
  ];

  checks.forEach(check => {
    const found = check.pattern.test(content);
    const status = found ? '✅' : (check.critical ? '❌' : '⚠️');
    console.log(`   ${status} ${check.desc}`);
  });

  console.log('');
}

// 生成HTML测试页面
function generateTestPage() {
  console.log('📄 生成HTML测试页面...\n');

  const testUrls = rawEntries.slice(0, 2); // 只测试前两个

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>视频加载测试</title>
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
        video {
            max-width: 100%;
            height: 300px;
            background: #000;
            border-radius: 4px;
        }
        .controls {
            margin: 10px 0;
        }
        button {
            margin-right: 10px;
            padding: 8px 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .status {
            margin: 10px 0;
            padding: 10px;
            border-radius: 4px;
        }
        .success { background: #4caf50; }
        .error { background: #f44336; }
        .loading { background: #ff9800; }
    </style>
</head>
<body>
    <h1>🎬 视频加载测试页面</h1>
    <p>这个页面用于测试视频URL是否可以正常加载和播放</p>

    ${testUrls.map((entry, index) => `
    <div class="test-container">
        <h3>${entry.name}</h3>
        <p><strong>视频URL:</strong> <code>${entry.videoUrl}</code></p>

        <video id="video${index}" controls muted preload="none">
            <source src="${entry.videoUrl}" type="video/mp4">
            您的浏览器不支持视频标签。
        </video>

        <div class="controls">
            <button onclick="testVideo(${index})">测试加载</button>
            <button onclick="playVideo(${index})">播放</button>
            <button onclick="pauseVideo(${index})">暂停</button>
        </div>

        <div id="status${index}" class="status loading">等待测试...</div>
    </div>
    `).join('')}

    <script>
        function testVideo(index) {
            const video = document.getElementById('video' + index);
            const status = document.getElementById('status' + index);

            status.className = 'status loading';
            status.textContent = '正在加载视频...';

            video.addEventListener('canplay', function() {
                status.className = 'status success';
                status.textContent = '✅ 视频加载成功，可以播放';
            }, { once: true });

            video.addEventListener('error', function(e) {
                status.className = 'status error';
                status.textContent = '❌ 视频加载失败: ' + (e.message || '未知错误');
            }, { once: true });

            video.load();
        }

        function playVideo(index) {
            const video = document.getElementById('video' + index);
            video.play().catch(e => {
                const status = document.getElementById('status' + index);
                status.className = 'status error';
                status.textContent = '❌ 播放失败: ' + e.message;
            });
        }

        function pauseVideo(index) {
            const video = document.getElementById('video' + index);
            video.pause();
        }

        // 自动测试所有视频
        window.onload = function() {
            ${testUrls.map((_, index) => `
                setTimeout(() => testVideo(${index}), ${index * 1000});
            `).join('')}
        }
    </script>
</body>
</html>`;

  fs.writeFileSync(path.join(process.cwd(), 'test-videos.html'), html);
  console.log('✅ HTML测试页面已生成: test-videos.html');
  console.log('📖 在浏览器中打开这个文件来测试视频加载\n');
}

// 运行所有测试
async function main() {
  try {
    checkTemplateGallery();
    await runTests();
    generateTestPage();

    console.log('🎯 测试完成！');
    console.log('');
    console.log('📋 下一步建议：');
    console.log('1. 打开生成的 test-videos.html 在浏览器中测试视频');
    console.log('2. 检查浏览器开发者工具的Network标签页');
    console.log('3. 查看Console是否有CORS或其他错误信息');
    console.log('4. 如果视频无法加载，可能是CORS政策或URL失效问题');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    process.exit(1);
  }
}

main();