/**
 * Admin Auth Debug Page - 用于线上环境排查认证问题
 * 访问: /admin-debug-auth
 */

import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth/config';

export default async function AdminDebugAuthPage() {
  const session = await getServerSession(authConfig as any);

  const adminEmails = process.env.ADMIN_EMAILS || '';
  const adminEmailsList = adminEmails
    ? adminEmails.split(',').map((email) => email.trim())
    : [];

  const userEmail = session?.user?.email;
  const isAdmin = userEmail ? adminEmailsList.includes(userEmail.toLowerCase()) : false;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          Admin Auth Debug
        </h1>

        {/* Session 信息 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Session 信息
          </h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 w-32">Session 状态:</span>
              <span className={`px-3 py-1 rounded ${session ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {session ? '✅ 已登录' : '❌ 未登录'}
              </span>
            </div>

            {session && (
              <>
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 dark:text-gray-400 w-32">User Email:</span>
                  <span className="text-gray-900 dark:text-white">{userEmail || 'N/A'}</span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-gray-600 dark:text-gray-400 w-32">User Name:</span>
                  <span className="text-gray-900 dark:text-white">{session.user?.name || 'N/A'}</span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-gray-600 dark:text-gray-400 w-32">User Image:</span>
                  {session.user?.image ? (
                    <img src={session.user.image} alt="avatar" className="w-10 h-10 rounded-full" />
                  ) : (
                    <span className="text-gray-500">N/A</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 环境变量信息 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            环境配置
          </h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex items-start gap-2">
              <span className="text-gray-600 dark:text-gray-400 w-32">NODE_ENV:</span>
              <span className="text-gray-900 dark:text-white">{process.env.NODE_ENV}</span>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-gray-600 dark:text-gray-400 w-32">ADMIN_EMAILS:</span>
              <span className="text-gray-900 dark:text-white">{adminEmails || '未配置'}</span>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-gray-600 dark:text-gray-400 w-32">邮箱列表:</span>
              <div className="text-gray-900 dark:text-white">
                {adminEmailsList.length > 0 ? (
                  <ul className="list-disc list-inside">
                    {adminEmailsList.map((email, i) => (
                      <li key={i}>{email}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-red-500">空列表</span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-gray-600 dark:text-gray-400 w-32">NEXTAUTH_URL:</span>
              <span className="text-gray-900 dark:text-white">{process.env.NEXTAUTH_URL || '未配置'}</span>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-gray-600 dark:text-gray-400 w-32">NEXTAUTH_SECRET:</span>
              <span className="text-gray-900 dark:text-white">
                {process.env.NEXTAUTH_SECRET ? '✅ 已配置' : '❌ 未配置'}
              </span>
            </div>
          </div>
        </div>

        {/* 权限检查 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            权限检查
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-gray-600 dark:text-gray-400 w-40">当前邮箱:</span>
              <span className="text-gray-900 dark:text-white font-mono">
                {userEmail || '未登录'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-gray-600 dark:text-gray-400 w-40">小写转换:</span>
              <span className="text-gray-900 dark:text-white font-mono">
                {userEmail?.toLowerCase() || 'N/A'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-gray-600 dark:text-gray-400 w-40">是否在白名单:</span>
              <span className={`px-4 py-2 rounded font-semibold ${isAdmin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isAdmin ? '✅ 是管理员' : '❌ 不是管理员'}
              </span>
            </div>

            {userEmail && !isAdmin && (
              <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
                <p className="font-semibold">⚠️ 匹配失败原因分析:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {adminEmailsList.map((adminEmail, i) => {
                    const match = adminEmail.toLowerCase() === userEmail.toLowerCase();
                    return (
                      <li key={i} className={match ? 'text-green-700' : ''}>
                        <code>{adminEmail}</code> {match ? '✅ 匹配' : '❌ 不匹配'}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* 完整 Session 对象 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            完整 Session 对象
          </h2>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        {/* 建议操作 */}
        <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-700">
          <p className="font-semibold">💡 调试建议:</p>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>如果 Session 为 null，说明未登录或 cookie 丢失</li>
            <li>如果邮箱不在白名单，检查 ADMIN_EMAILS 环境变量</li>
            <li>确认环境变量修改后重启了应用</li>
            <li>检查邮箱大小写是否完全匹配</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
