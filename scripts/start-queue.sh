#!/bin/bash

# ===========================================
# VidFab AI Video Platform
# Queue System Startup Script
# ===========================================

echo "🚀 Starting VidFab Video Processing Queue System..."

# Check if Redis is running
echo "🔍 Checking Redis connection..."
if ! docker exec vidfab-redis redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis is not running or not accessible"
    echo "💡 Please start Redis first: ./scripts/start-redis.sh"
    exit 1
fi

echo "✅ Redis is running and accessible"

# Check if Node.js dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "❌ Node.js dependencies not found"
    echo "💡 Please install dependencies: pnpm install"
    exit 1
fi

echo "✅ Node.js dependencies found"

# Create logs directory if it doesn't exist
mkdir -p logs

# Start the queue worker process
echo "🚀 Starting queue worker..."

# Development mode - start with nodemon for auto-restart
if [ "$NODE_ENV" = "development" ] || [ -z "$NODE_ENV" ]; then
    echo "🔧 Running in development mode"

    # Create a simple worker script to run
    cat > queue-worker.js << 'EOF'
const { initializeQueueSystem, shutdownQueueSystem } = require('./lib/queue/index.ts');

async function startWorker() {
  try {
    await initializeQueueSystem();
    console.log('✅ Queue worker is running...');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      await shutdownQueueSystem();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      await shutdownQueueSystem();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start queue worker:', error);
    process.exit(1);
  }
}

startWorker();
EOF

    # Run with ts-node for TypeScript support
    echo "📝 Starting TypeScript queue worker..."
    pnpm dlx ts-node queue-worker.js 2>&1 | tee logs/queue-worker.log &

    WORKER_PID=$!
    echo $WORKER_PID > logs/queue-worker.pid

    echo "🎯 Queue worker started with PID: $WORKER_PID"
    echo "📝 Logs are being written to: logs/queue-worker.log"
    echo "🛑 To stop the worker: kill $WORKER_PID"

else
    # Production mode
    echo "🏭 Running in production mode"
    node dist/queue-worker.js 2>&1 | tee logs/queue-worker.log &

    WORKER_PID=$!
    echo $WORKER_PID > logs/queue-worker.pid

    echo "🎯 Queue worker started with PID: $WORKER_PID"
fi

echo ""
echo "💡 Useful commands:"
echo "  - View logs: tail -f logs/queue-worker.log"
echo "  - Stop worker: kill \$(cat logs/queue-worker.pid)"
echo "  - Check Redis: docker exec -it vidfab-redis redis-cli monitor"
echo "  - Redis GUI: docker-compose --profile debug up -d redis-commander"

# Wait a moment and check if the process is still running
sleep 3
if kill -0 $WORKER_PID 2>/dev/null; then
    echo "✅ Queue worker is running successfully"
else
    echo "❌ Queue worker failed to start. Check logs/queue-worker.log for details"
    exit 1
fi