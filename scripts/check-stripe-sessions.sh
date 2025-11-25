#!/bin/bash

# Check Stripe Checkout Sessions Script
# 用于检查 Stripe 上的 Checkout Session 状态

set -e

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "=========================================="
echo "检查 Stripe Checkout Sessions"
echo "=========================================="

# 使用 Node.js 脚本查询 Stripe
node -e "
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const sessionIds = [
  'cs_live_b1aGoe52woD6kGYw39yvMS9WEITznNg0B8DntS86PQ5JO7DeQzMj1TYEF3',
  'cs_live_a123Gk4t97PJOE4W4MelpXr91zyqWxThxk6oRdjLOv1pX6lzWDFJwPKvVo',
  'cs_live_a1ddT7I8I82bzTWrsWp46WTaXdjGH7ThoR4uLnalS2NgICBNsQRrIXEj2R',
  'cs_live_a1hQ0kG6DiAE8QmMKwflq8uL702oH6mQJcdTpC7JdstPT2p74jNAYhU0Yy',
  'cs_live_a16X1WNFCyccbATQctfX1elNyocgsBdqrt0iFjjhFfiM2y3hjnrI2AsaDA',
  'cs_live_a1l8zIAjAeKYaVvxPMSrma70vLvudKW0cvne5NzINpJIWDzqyU1qM2mR1n',
  'cs_live_a1cnS4WZsufReXLb0zl13qzpKpIGTbOpT0bvplfAzdnTR1PLsahd7w2EF8'
];

async function checkSessions() {
  console.log(\`\n检查 \${sessionIds.length} 个 Checkout Sessions...\n\`);

  for (let i = 0; i < sessionIds.length; i++) {
    const sessionId = sessionIds[i];
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      console.log(\`Session #\${i + 1}: \${sessionId}\`);
      console.log(\`  - 状态: \${session.status}\`);
      console.log(\`  - 支付状态: \${session.payment_status}\`);
      console.log(\`  - 金额: \${session.amount_total / 100} USD\`);
      console.log(\`  - 客户ID: \${session.customer || 'N/A'}\`);
      console.log(\`  - 订阅ID: \${session.subscription || 'N/A'}\`);
      console.log(\`  - 创建时间: \${new Date(session.created * 1000).toISOString()}\`);
      console.log(\`  - 过期时间: \${new Date(session.expires_at * 1000).toISOString()}\`);
      console.log(\`  - 元数据: \${JSON.stringify(session.metadata || {})}\`);
      console.log('');
    } catch (error) {
      console.error(\`❌ 获取 Session \${sessionId} 失败:\`, error.message);
      console.log('');
    }
  }
}

checkSessions()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('检查失败:', error);
    process.exit(1);
  });
"

echo ""
echo "=========================================="
echo "检查完成"
echo "=========================================="
