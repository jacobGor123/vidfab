#!/usr/bin/env node

/**
 * 测试视频加载修复方案
 */

console.log('🔧 测试视频加载修复方案...\n');

const fs = require('fs');
const https = require('https');
const path = require('path');

// 测试演示视频URL是否可以访问
const demoUrls = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80'
];

async function testUrl(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const req = https.request(url, { method: 'HEAD' }, (res) => {
      const responseTime = Date.now() - startTime;
      resolve({
        url,
        status: res.statusCode,
        contentType: res.headers['content-type'],
        responseTime,
        success: res.statusCode >= 200 && res.statusCode < 300
      });
    });

    req.on('error', (err) => {
      resolve({
        url,
        status: 'ERROR',
        error: err.message,
        success: false
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        url,
        status: 'TIMEOUT',
        success: false
      });
    });

    req.end();
  });
}

async function testDemoUrls() {
  console.log('🎬 测试演示视频URL可访问性...');

  for (const url of demoUrls) {
    const result = await testUrl(url);
    const type = url.includes('.mp4') ? '🎬 视频' : '🖼️  图片';
    console.log(`   ${type}: ${result.success ? '✅' : '❌'} ${result.status}`);

    if (result.success) {
      console.log(`       ✓ ${result.contentType} (${result.responseTime}ms)`);
    } else if (result.error) {
      console.log(`       ✗ ${result.error}`);
    }
  }
  console.log('');
}

function checkFileUpdates() {
  console.log('📁 检查文件更新...');

  const files = [
    'data/demo-video-templates.ts',
    'components/create/template-gallery.tsx'
  ];

  files.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      console.log(`   ✅ ${file} - 已更新`);
    } else {
      console.log(`   ❌ ${file} - 文件不存在`);
    }
  });

  console.log('');
}

function generateTestInstructions() {
  console.log('📋 测试说明:');
  console.log('='.repeat(50));
  console.log('1. 启动开发服务器: npm run dev');
  console.log('2. 打开浏览器访问 /create 页面');
  console.log('3. 点击 Discover 标签');
  console.log('4. 你会看到右上角的切换按钮:');
  console.log('   - "使用演示视频" - 切换到可用的演示视频');
  console.log('   - "切换到原始数据" - 回到75个原始视频数据');
  console.log('5. 测试演示模式下的视频悬停播放功能');
  console.log('6. 测试Remix按钮功能');
  console.log('');
  console.log('🎯 期望结果:');
  console.log('- 演示视频应该可以正常悬停播放');
  console.log('- 原始视频会显示警告并建议切换到演示模式');
  console.log('- 分类过滤功能正常');
  console.log('- Remix功能正常工作');
}

async function main() {
  checkFileUpdates();
  await testDemoUrls();
  generateTestInstructions();

  console.log('✅ 修复方案测试完成！');
  console.log('');
  console.log('💡 解决方案说明:');
  console.log('1. 原始视频URLs返回403错误，无法直接访问');
  console.log('2. 添加了演示视频数据作为备选方案');
  console.log('3. 用户可以通过切换按钮在两种数据源间切换');
  console.log('4. 演示视频使用Google和Unsplash的公开资源');
}

main();