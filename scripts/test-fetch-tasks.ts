/**
 * Test fetchAllTasks function with user_videos
 * Run: npx tsx scripts/test-fetch-tasks.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { fetchAllTasks, fetchTaskStats } from '../lib/admin/all-tasks-fetcher';

async function testFetchTasks() {
  console.log('🧪 Testing fetchAllTasks function...\n');

  try {
    // Test fetching all tasks
    console.log('📋 Fetching all tasks (limit: 5)...');
    const result = await fetchAllTasks({ limit: 5 });

    console.log(`\n✅ Results:`);
    console.log(`   Total fetched: ${result.tasks.length}`);
    console.log(`   Has more: ${result.hasMore}`);
    console.log(`   Next cursor: ${result.nextCursor ? 'yes' : 'no'}\n`);

    if (result.tasks.length > 0) {
      console.log('📄 Sample task:');
      const task = result.tasks[0];
      console.log(`   ID: ${task.id}`);
      console.log(`   Type: ${task.task_type}`);
      console.log(`   User Email: ${task.user_email}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Prompt: ${task.prompt?.substring(0, 50)}...`);
      console.log(`   Video URL: ${task.video_url ? 'Yes' : 'No'}`);
      console.log(`   Created: ${task.created_at}\n`);
    }

    // Test fetching stats
    console.log('📊 Fetching task statistics...');
    const stats = await fetchTaskStats();
    console.log(`\n✅ Stats:`);
    console.log(`   Total: ${stats.total}`);
    console.log(`   Completed: ${stats.completed}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Processing: ${stats.processing}\n`);

    // Test fetching video_generation tasks only
    console.log('🎬 Fetching video_generation tasks only (limit: 3)...');
    const videoResult = await fetchAllTasks({ taskType: 'video_generation', limit: 3 });
    console.log(`\n✅ Video generation tasks: ${videoResult.tasks.length}\n`);

    console.log('✨ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFetchTasks().catch(console.error);
