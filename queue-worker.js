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
