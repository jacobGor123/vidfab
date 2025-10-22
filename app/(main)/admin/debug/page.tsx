/**
 * Admin Debug Page
 * 用于调试管理员权限问题
 */

import { getCurrentUser, isAdminEmail } from '@/lib/admin/auth';

export default async function AdminDebugPage() {
  const user = await getCurrentUser();

  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Admin Auth Debug</h1>

        {/* Current User Info */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Current User:</h2>
          <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-x-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        {/* User Email */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">User Email:</h2>
          <p className="font-mono bg-blue-100 dark:bg-blue-900 p-2 rounded">
            {user?.email || 'Not logged in'}
          </p>
        </div>

        {/* Admin Emails Config */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Admin Emails Config:</h2>
          <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-x-auto">
            {JSON.stringify(adminEmails, null, 2)}
          </pre>
        </div>

        {/* Email Check */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Email Check:</h2>
          <div className="space-y-2">
            <p>User email: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{user?.email || 'null'}</code></p>
            <p>User email lowercase: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{user?.email?.toLowerCase() || 'null'}</code></p>
            <p>Is Admin: <code className={`px-2 py-1 rounded ${isAdminEmail(user?.email) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {isAdminEmail(user?.email) ? 'YES ✓' : 'NO ✗'}
            </code></p>
          </div>
        </div>

        {/* Environment Variables */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Environment Variables:</h2>
          <div className="space-y-1">
            <p>ADMIN_EMAILS: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{process.env.ADMIN_EMAILS || 'NOT SET'}</code></p>
            <p>NODE_ENV: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{process.env.NODE_ENV}</code></p>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded">
          <h2 className="text-lg font-semibold mb-2">Troubleshooting:</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>确认你已经登录了</li>
            <li>确认登录的邮箱是 {adminEmails[0] || 'jsdasww593@gmail.com'}</li>
            <li>确认环境变量 ADMIN_EMAILS 已设置</li>
            <li>重启开发服务器 (npm run dev)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
