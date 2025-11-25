#!/bin/bash

# Cleanup Expired Orders Script
# 自动清理过期的 pending 订单

set -e

# 获取超时小时数参数,默认 24 小时
HOURS=${1:-24}

echo "=========================================="
echo "清理过期订单脚本"
echo "=========================================="
echo "超时阈值: $HOURS 小时"
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 使用 Node.js 调用清理 API
node -e "
const https = require('https');
const http = require('http');

const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const isHttps = apiUrl.startsWith('https');
const client = isHttps ? https : http;

const postData = JSON.stringify({ hours: $HOURS });

const urlObj = new URL(apiUrl + '/api/subscription/cleanup-orders');

const options = {
  hostname: urlObj.hostname,
  port: urlObj.port || (isHttps ? 443 : 80),
  path: urlObj.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('正在连接 API...');
console.log('URL:', apiUrl + '/api/subscription/cleanup-orders');
console.log('');

const req = client.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);

      if (result.success) {
        console.log('✅ 清理成功!');
        console.log('   清理数量:', result.cleanedCount, '个订单');
        console.log('   超时阈值:', result.hoursThreshold, '小时');
        console.log('   消息:', result.message);
      } else {
        console.error('❌ 清理失败:', result.error || 'Unknown error');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ 解析响应失败:', error.message);
      console.error('原始响应:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ 请求失败:', error.message);
  process.exit(1);
});

req.write(postData);
req.end();
"

EXIT_CODE=$?

echo ""
echo "结束时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

exit $EXIT_CODE
