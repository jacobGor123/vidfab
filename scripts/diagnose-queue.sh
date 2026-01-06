#!/bin/bash

##############################################################################
# Queue Diagnostics Script
# VidFab - 诊断队列连接问题
##############################################################################

echo "🔍 Queue System Diagnostics"
echo "================================"
echo ""

# Check environment variables
echo "📋 Environment Variables:"
echo "--------------------------------"
if [ -n "$UPSTASH_REDIS_URL" ]; then
    # Mask password in URL
    MASKED_URL=$(echo "$UPSTASH_REDIS_URL" | sed -E 's/(rediss?:\/\/[^:]+:)[^@]+(@)/\1****\2/')
    echo "✓ UPSTASH_REDIS_URL: $MASKED_URL"
else
    echo "✗ UPSTASH_REDIS_URL: Not set"
fi

if [ -n "$BULLMQ_REDIS_URL" ]; then
    MASKED_URL=$(echo "$BULLMQ_REDIS_URL" | sed -E 's/(rediss?:\/\/[^:]+:)[^@]+(@)/\1****\2/')
    echo "✓ BULLMQ_REDIS_URL: $MASKED_URL"
else
    echo "✗ BULLMQ_REDIS_URL: Not set"
fi

echo ""
echo "📋 Queue Configuration:"
echo "--------------------------------"
echo "Queue Prefix: ${QUEUE_PREFIX:-vidfab-video-processing (default)}"
echo "Concurrency: ${QUEUE_CONCURRENCY:-3 (default)}"
echo "Max Retries: ${QUEUE_MAX_RETRIES:-3 (default)}"
echo ""

# Check Redis connection
echo "🔌 Testing Redis Connection..."
echo "--------------------------------"

# Use Node.js to test Redis connection
node -e "
const Redis = require('ioredis');

const redisUrl = process.env.BULLMQ_REDIS_URL || process.env.UPSTASH_REDIS_URL;

if (!redisUrl) {
  console.error('❌ No Redis URL configured!');
  process.exit(1);
}

console.log('Connecting to Redis...');
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: { rejectUnauthorized: false }
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('ready', async () => {
  console.log('✅ Redis ready');

  // Test ping
  try {
    const result = await redis.ping();
    console.log('✅ PING successful:', result);

    // Check queue keys
    const queuePrefix = process.env.QUEUE_PREFIX || 'vidfab-video-processing';
    const keys = await redis.keys(\`\${queuePrefix}:*\`);
    console.log(\`\\n📦 Queue Keys (found \${keys.length} keys):\`);
    console.log('--------------------------------');
    keys.slice(0, 10).forEach(key => console.log('  -', key));
    if (keys.length > 10) {
      console.log(\`  ... and \${keys.length - 10} more\`);
    }

    await redis.quit();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('❌ Connection timeout after 10 seconds');
  process.exit(1);
}, 10000);
"

echo ""
echo "================================"
echo "✅ Diagnostics completed"
