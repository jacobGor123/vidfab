/**
 * Auth Test Page - 测试认证状态
 * 这个页面可以访问,用于调试
 */

import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth/config';

export default async function TestAuthPage() {
  const session = await getServerSession(authConfig as any);

  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
  const userEmail = session?.user?.email;
  const isAdmin = userEmail ? adminEmails.includes(userEmail.toLowerCase()) : false;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <h1 className="text-2xl font-bold">Auth Status Test</h1>

        {/* Session Info */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Session:</h2>
          <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-x-auto text-xs">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        {/* User Email */}
        <div>
          <h2 className="text-lg font-semibold mb-2">User Email:</h2>
          <p className={`font-mono p-2 rounded ${userEmail ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
            {userEmail || 'Not logged in'}
          </p>
        </div>

        {/* Admin Emails */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Admin Emails Config:</h2>
          <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-x-auto text-xs">
            {JSON.stringify(adminEmails, null, 2)}
          </pre>
        </div>

        {/* Is Admin Check */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Is Admin?</h2>
          <p className={`text-2xl font-bold p-4 rounded text-center ${isAdmin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isAdmin ? '✅ YES - You are an admin!' : '❌ NO - You are not an admin'}
          </p>
        </div>

        {/* Environment Variables */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Environment:</h2>
          <div className="space-y-1 text-sm">
            <p>ADMIN_EMAILS: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{process.env.ADMIN_EMAILS || 'NOT SET'}</code></p>
            <p>NODE_ENV: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{process.env.NODE_ENV}</code></p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
          <h2 className="text-lg font-semibold mb-2">Next Steps:</h2>
          {isAdmin ? (
            <div className="space-y-2">
              <p className="text-green-600 dark:text-green-400 font-semibold">✅ You should be able to access admin pages!</p>
              <p>Try visiting:</p>
              <ul className="list-disc list-inside ml-4">
                <li><a href="/admin/users" className="text-blue-600 hover:underline">/admin/users</a></li>
                <li><a href="/admin/paid-orders" className="text-blue-600 hover:underline">/admin/paid-orders</a></li>
                <li><a href="/admin/tasks" className="text-blue-600 hover:underline">/admin/tasks</a></li>
              </ul>
            </div>
          ) : (
            <div className="space-y-2">
              {!session ? (
                <p className="text-red-600 dark:text-red-400">❌ You are not logged in. Please login first.</p>
              ) : (
                <>
                  <p className="text-red-600 dark:text-red-400">❌ Your email ({userEmail}) is not in the admin list.</p>
                  <p>Admin emails configured: {adminEmails.join(', ')}</p>
                  <p>Please update ADMIN_EMAILS environment variable to include your email.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
