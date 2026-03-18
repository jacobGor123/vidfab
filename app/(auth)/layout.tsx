import type React from "react"
/**
 * Layout for authentication pages (login, signup).
 * Provides a centered container for auth forms.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-brand-gray-900 p-4 md:p-10">
      <div className="w-full max-w-[800px] rounded-[20px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 0 60px rgba(127,110,223,0.12)' }}>{children}</div>
    </div>
  )
}
