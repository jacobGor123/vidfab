/**
 * Admin Debug Page
 * 用于调试管理员权限问题
 * 访问路径: /debug-admin (无需管理员权限即可访问)
 *
 * 注意: 此页面在 app/debug-admin/ 目录下,
 * 不受 app/(main)/admin/layout.tsx 保护,可以直接访问
 */

import { getCurrentUser, isAdminEmail } from '@/lib/admin/auth';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth/config';

// 🔥 Force dynamic rendering - disable caching for admin pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDebugPage() {
  const user = await getCurrentUser();
  const session = await getServerSession(authConfig as any);

  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
  const adminEmailsRaw = process.env.ADMIN_EMAILS || '';

  // 详细的邮箱匹配检查
  const userEmail = user?.email || '';
  const userEmailLower = userEmail.toLowerCase();
  const isAdmin = isAdminEmail(userEmail);

  // 逐个检查每个管理员邮箱
  const emailChecks = adminEmails.map(adminEmail => ({
    adminEmail,
    adminEmailLower: adminEmail.toLowerCase(),
    matches: adminEmail.toLowerCase() === userEmailLower,
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          🔍 Admin Auth Debug
        </h1>

        {/* Status Summary */}
        <div className="mb-6 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Status Summary:</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Logged In:</span>
              <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${user ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {user ? '✓ YES' : '✗ NO'}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Is Admin:</span>
              <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${isAdmin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isAdmin ? '✓ YES' : '✗ NO'}
              </span>
            </div>
          </div>
        </div>

        {/* Session Info */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Full Session:</h2>
          <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-x-auto text-xs">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        {/* User Email Details */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">User Email Details:</h2>
          <div className="space-y-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Original Email:</span>
              <code className="bg-white dark:bg-gray-800 px-3 py-1 rounded border border-gray-300 dark:border-gray-600">
                {userEmail || '(empty)'}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Lowercase Email:</span>
              <code className="bg-white dark:bg-gray-800 px-3 py-1 rounded border border-gray-300 dark:border-gray-600">
                {userEmailLower || '(empty)'}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Length:</span>
              <code className="bg-white dark:bg-gray-800 px-3 py-1 rounded border border-gray-300 dark:border-gray-600">
                {userEmail.length} chars
              </code>
            </div>
          </div>
        </div>

        {/* Admin Emails Config */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Admin Emails Configuration:</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Raw ADMIN_EMAILS env:</span>
              <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded mt-1 text-xs overflow-x-auto">
{adminEmailsRaw || '(NOT SET)'}
              </pre>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Parsed Admin Emails ({adminEmails.length}):</span>
              <div className="mt-2 space-y-1">
                {adminEmails.length === 0 ? (
                  <p className="text-red-600 text-sm">⚠️ No admin emails configured!</p>
                ) : (
                  adminEmails.map((email, idx) => (
                    <div key={idx} className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm">
                      {idx + 1}. <code className="font-mono">{email}</code>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Email Matching Details */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Email Matching Analysis:</h2>
          <div className="space-y-2">
            {emailChecks.length === 0 ? (
              <p className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded">
                ❌ No admin emails to check against
              </p>
            ) : (
              emailChecks.map((check, idx) => (
                <div key={idx} className={`p-3 rounded border-2 ${check.matches ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm">{check.adminEmail}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${check.matches ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
                      {check.matches ? '✓ MATCH' : '✗ NO MATCH'}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                    <div>Admin (lower): <code>{check.adminEmailLower}</code></div>
                    <div>User (lower): <code>{userEmailLower || '(empty)'}</code></div>
                    <div>Exact match: <code>{check.adminEmailLower === userEmailLower ? 'true' : 'false'}</code></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Environment Info */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Environment Info:</h2>
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">NODE_ENV:</span>
              <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded">{process.env.NODE_ENV}</code>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Timestamp:</span>
              <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded">{new Date().toISOString()}</code>
            </div>
          </div>
        </div>

        {/* Troubleshooting Guide */}
        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border-2 border-yellow-200 dark:border-yellow-800">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">🔧 Troubleshooting Steps:</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className={user ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              <strong>登录状态:</strong> {user ? '✓ 已登录' : '✗ 未登录 - 请先登录'}
            </li>
            <li className={adminEmailsRaw ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              <strong>环境变量:</strong> {adminEmailsRaw ? '✓ ADMIN_EMAILS 已设置' : '✗ ADMIN_EMAILS 未设置'}
            </li>
            <li className={emailChecks.some(c => c.matches) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              <strong>邮箱匹配:</strong> {emailChecks.some(c => c.matches) ? '✓ 邮箱匹配成功' : `✗ 当前邮箱 "${userEmail}" 不在管理员列表中`}
            </li>
            <li>
              <strong>刷新配置:</strong> 如果修改了环境变量,需要重启服务器
            </li>
          </ol>
        </div>

        {/* Quick Actions */}
        {isAdmin && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded border-2 border-green-200 dark:border-green-800">
            <h2 className="text-lg font-semibold mb-3 text-green-900 dark:text-green-100">✅ 管理员访问已启用</h2>
            <a
              href="/admin/tasks"
              className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              前往管理后台 →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
