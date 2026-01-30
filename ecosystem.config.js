/**
 * PM2 配置文件 - Worker 进程管理
 *
 * 功能：
 * 1. Worker 自动重启（崩溃后 1 秒内重启）
 * 2. 内存监控（超过 512MB 自动重启，防止内存泄漏）
 * 3. 日志自动分割和归档
 * 4. 环境变量管理
 */

module.exports = {
  apps: [
    {
      name: 'vidfab-worker',
      script: 'npx',
      args: 'tsx worker/queue-worker.ts',

      // 自动重启配置
      autorestart: true,
      watch: false, // 生产环境不要 watch，会导致频繁重启
      max_memory_restart: '512M', // 内存超过 512MB 自动重启

      // 崩溃重启策略
      min_uptime: '10s', // 至少运行 10 秒才算成功启动
      max_restarts: 10, // 10 分钟内最多重启 10 次
      restart_delay: 1000, // 崩溃后 1 秒重启

      // 环境变量
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },

      // 日志配置
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // 实例数量（单实例，避免任务重复消费）
      instances: 1,
      exec_mode: 'fork',

      // 健康检查
      listen_timeout: 10000,
      kill_timeout: 5000,
    },

    // 可选：Next.js 前端也用 PM2 管理
    {
      name: 'vidfab-frontend',
      script: 'npm',
      args: 'run dev',

      autorestart: true,
      watch: false,
      max_memory_restart: '1G',

      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },

      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      instances: 1,
      exec_mode: 'fork',
    }
  ]
};
