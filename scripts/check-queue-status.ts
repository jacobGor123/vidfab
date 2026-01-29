
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load env vars immediately
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config()

// Dynamic imports to ensure env vars are loaded first
async function main() {
    console.log('🔍 Checking Queue System Status...')

    try {
        const { videoQueueManager } = await import('../lib/queue/queue-manager')
        const { checkBullMQRedisHealth } = await import('../lib/redis-bullmq')

        // 1. Check Redis Health
        const isRedisHealthy = await checkBullMQRedisHealth()
        console.log(`Redis Health: ${isRedisHealthy ? '✅ Connected' : '❌ Disconnected'}`)

        if (!isRedisHealthy) {
            console.error('CRITICAL: Cannot connect to Redis. Queue system is down.')
            process.exit(1)
        }

        // 2. Check Queue Stats
        const stats = await videoQueueManager.getQueueStats()
        console.log('\n📊 Queue Statistics:')
        console.log(JSON.stringify(stats, null, 2))

        if (stats.waiting > 0) {
            console.log(`\n⚠️  Found ${stats.waiting} jobs waiting in queue.`)
            console.log('If these jobs are not being processed, the Worker is likely NOT running.')
            console.log('👉 Run this command in a new terminal: npm run worker')
        } else if (stats.active > 0) {
            console.log(`\n✅ Found ${stats.active} jobs currently being processed.`)
        } else {
            console.log('\n✅ Queue is empty.')
        }
    } catch (error) {
        console.error('An error occurred:', error)
    }

    process.exit(0)
}

main().catch(console.error)
