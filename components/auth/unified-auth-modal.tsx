"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GoogleLoginButton } from "@/components/auth/google-login-button"
import { GoogleOneTap } from "@/components/auth/google-one-tap"
import { useVerificationCodeInput } from "./verification-code-input"
import { ArrowLeft, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { signIn } from "next-auth/react"
import { trackSignUp, trackLogin } from "@/lib/analytics/gtm"
import {
  saveVerificationSession,
  getVerificationSession,
  clearVerificationSession,
} from "@/lib/auth/verification-session"

type AuthStep = "options" | "email" | "code" | "verifying"

interface UnifiedAuthModalProps extends React.ComponentPropsWithoutRef<"div"> {
  callbackUrl?: string
}

export function UnifiedAuthModal({ className, callbackUrl: callbackUrlProp, ...props }: UnifiedAuthModalProps) {
  const [authStep, setAuthStep] = useState<AuthStep>("options")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)

  const AUTH_PATHS = ["/login", "/signup", "/register", "/auth"]
  const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : ""
  const isAuthPage = AUTH_PATHS.some((p) => currentPath.startsWith(p))
  const callbackUrl = callbackUrlProp ?? (isAuthPage || !currentPath ? "/studio/discover" : currentPath)

  const startCooldown = (seconds = 300) => {
    setResendCooldown(seconds)
    const interval = setInterval(() => {
      setResendCooldown((prev) => { if (prev <= 1) { clearInterval(interval); return 0 } return prev - 1 })
    }, 1000)
  }

  const { code, setCode, error: codeError, setError: setCodeError, clear: clearCode, VerificationCodeInputComponent } =
    useVerificationCodeInput({
      length: 6,
      onComplete: handleVerificationComplete,
      onChange: (inputCode) => {
        const s = getVerificationSession()
        if (s) saveVerificationSession({ ...s, inputtedCode: inputCode })
      },
    })

  useEffect(() => {
    const s = getVerificationSession()
    if (!s) return
    setEmail(s.email)
    setAuthStep("code")
    if (s.inputtedCode) setCode(s.inputtedCode)
    const remaining = Math.max(0, Math.floor((s.cooldownUntil - Date.now()) / 1000))
    if (remaining > 0) startCooldown(remaining)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAuthSuccess = () => { window.location.href = callbackUrl }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setIsLoading(true); setError("")
    try {
      const res = await fetch("/api/auth/send-verification-code", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send verification code")
      const now = Date.now()
      saveVerificationSession({ email: email.trim().toLowerCase(), sentAt: now, expiresAt: now + 300000, cooldownUntil: now + 300000 })
      setAuthStep("code"); startCooldown()
    } catch (err: any) {
      setError(err.message || "Failed to send verification code")
    } finally { setIsLoading(false) }
  }

  async function handleVerificationComplete(completedCode: string) {
    if (completedCode.length !== 6) return
    setAuthStep("verifying"); setCodeError(false)
    try {
      const verifyRes = await fetch("/api/auth/verify-code-login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: completedCode }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) throw new Error(verifyData.error || "Invalid verification code")
      const signInResult = await signIn("verification-code", {
        email: email.trim().toLowerCase(), token: verifyData.verified_token, callbackUrl, redirect: false,
      })
      if (signInResult?.error) throw new Error(signInResult.error)
      if (signInResult?.ok) {
        clearVerificationSession()
        verifyData.isNewUser ? trackSignUp("email") : trackLogin("email")
        handleAuthSuccess()
      }
    } catch (err: any) {
      setCodeError(true); setError(err.message || "Verification failed")
      setAuthStep("code"); clearCode()
    }
  }

  async function handleResendCode() {
    if (resendCooldown > 0) return
    setIsLoading(true); setError("")
    try {
      const res = await fetch("/api/auth/send-verification-code", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to resend code")
      const now = Date.now()
      saveVerificationSession({ email: email.trim().toLowerCase(), sentAt: now, expiresAt: now + 300000, cooldownUntil: now + 300000 })
      startCooldown()
    } catch (err: any) {
      setError(err.message || "Failed to resend verification code")
    } finally { setIsLoading(false) }
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`

  return (
    <div className={cn("relative overflow-hidden rounded-[20px]", className)} style={{ background: "#0e1018" }} {...props}>
      {/* Decorative gradient ellipse */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[320px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(127,110,223,0.45) 0%, rgba(14,16,24,0) 70%)" }}
      />

      <div className="relative z-10 flex flex-col items-center px-6 md:px-[68px] pt-10 pb-8 text-center">

        {/* Logo — centered */}
        <Link href="/" aria-label="Go to homepage" className="flex items-center gap-3 mb-8">
          <img src="/logo/vidfab-not-text.png" width={56} height={56} alt="VidFab" className="rounded-xl" />
          <span className="text-white font-bold text-2xl tracking-tight">VidFab</span>
        </Link>

        {/* ── OPTIONS STEP ── */}
        {authStep === "options" && (
          <>
            {/* Title */}
            <h2 className="text-2xl md:text-[42px] leading-tight font-bold text-white mb-4 text-center">
              Welcome to{" "}
              <span style={{
                background: "linear-gradient(to right, #4cc3ff, #7b5cff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>VidFab</span>
              {" "}<SparkleIcon className="inline-block align-middle" />
            </h2>

            {/* Promo */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 mb-2">
              <GiftIcon />
              <p className="text-base font-semibold text-center" style={{ color: "#f9d84e" }}>
                Sign up now to get a limited-time bonus of 200 credits.
              </p>
            </div>

            {/* Subtitle */}
            <p className="text-base mb-8" style={{ color: "#c3c2cc" }}>
              Perfect for trying our new AI Story-to-Video workflow.
            </p>

            {/* Buttons */}
            <div className="w-full space-y-3">
              <GoogleLoginButton
                onSuccess={handleAuthSuccess}
                onError={(e) => setError(e.message || "Authentication failed")}
                callbackUrl={callbackUrl}
                className="w-full h-[58px] rounded-xl text-lg font-normal justify-center gap-3 !bg-[#212533] !border-0 !text-white hover:!bg-[#2a3040]"
              />
              <button
                onClick={() => setAuthStep("email")}
                className="w-full h-[58px] rounded-xl text-white text-lg font-normal flex items-center justify-center gap-3 transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(to right, #4cc3ff, #7b5cff)" }}
              >
                <EmailIcon />
                Continue with Email
              </button>
            </div>

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

            <Link href="/" className="flex items-center gap-2 mt-6 text-sm hover:opacity-80 transition-opacity" style={{ color: "#d5d5d5" }}>
              <ArrowLeft className="w-4 h-4" />
              Back to homepage
            </Link>
          </>
        )}

        {/* ── EMAIL STEP ── */}
        {authStep === "email" && (
          <form onSubmit={handleEmailSubmit} className="w-full space-y-5 text-left">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-bold text-white">Sign in with Email</h2>
              <p className="text-sm mt-1" style={{ color: "#c3c2cc" }}>We&apos;ll send you a 6-digit verification code</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm" style={{ color: "#aaa9b4" }}>Email Address</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required disabled={isLoading}
                className="h-12 rounded-xl border-transparent text-white placeholder:text-[#a8adbd] focus:border-purple-500/50 focus-visible:ring-0"
                style={{ background: "#131621" }}
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={isLoading || !email.trim()}
              className="w-full h-12 rounded-xl text-white text-base font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(to right, #4cc3ff, #7b5cff)" }}
            >
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Sending...</span></> : "Send Verification Code"}
            </button>
            <button type="button" onClick={() => { setAuthStep("options"); setError(""); setEmail("") }}
              className="w-full flex items-center justify-center gap-2 text-sm hover:opacity-80 transition-opacity" style={{ color: "#d5d5d5" }}
            >
              <ArrowLeft className="w-4 h-4" /> Back to Login Options
            </button>
          </form>
        )}

        {/* ── CODE / VERIFYING STEP ── */}
        {(authStep === "code" || authStep === "verifying") && (
          <div className="w-full space-y-5">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">
                {authStep === "verifying" ? "Verifying..." : "Enter Verification Code"}
              </h2>
              <p className="text-sm mt-1" style={{ color: "#c3c2cc" }}>Code sent to {email}</p>
            </div>
            {authStep === "verifying" ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                <p className="text-sm" style={{ color: "#aaa9b4" }}>Verifying your code...</p>
              </div>
            ) : (
              <VerificationCodeInputComponent autoFocus className="justify-center" />
            )}
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <div className="flex flex-col items-center gap-2">
              <button type="button" onClick={handleResendCode} disabled={isLoading || resendCooldown > 0}
                className="text-sm disabled:opacity-40 hover:opacity-80 transition-opacity" style={{ color: "#aaa9b4" }}
              >
                {resendCooldown > 0 ? `Resend in ${fmt(resendCooldown)}` : "Resend Code"}
              </button>
              <button type="button" onClick={() => { setAuthStep("email"); setError(""); clearCode() }}
                className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity" style={{ color: "#d5d5d5" }}
              >
                <ArrowLeft className="w-4 h-4" /> Change Email
              </button>
            </div>
          </div>
        )}
      </div>

      <GoogleOneTap onSuccess={handleAuthSuccess} onError={(e) => setError(e?.message ?? "")} />
    </div>
  )
}

// ── Icons ──

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("flex-shrink-0", className)}>
      <path d="M20.2192 34.6647C20.7362 35.8446 22.41 35.8446 22.9269 34.6647L26.7792 25.8716C26.9107 25.5717 27.138 25.3238 27.4255 25.1671L34.5223 21.2977C35.5496 20.7375 35.5496 19.2624 34.5223 18.7023L27.4255 14.8329C27.138 14.6761 26.9107 14.4283 26.7792 14.1283L22.9269 5.33529C22.41 4.15539 20.7362 4.1554 20.2192 5.33529L16.3669 14.1283C16.2355 14.4283 16.0081 14.6761 15.7206 14.8329L8.62386 18.7023C7.59652 19.2624 7.59652 20.7375 8.62386 21.2977L15.7206 25.1671C16.0081 25.3238 16.2355 25.5717 16.3669 25.8716L20.2192 34.6647Z" fill="url(#sp_g0)"/>
      <path d="M6.89693 15.5992C7.03744 15.92 7.4924 15.92 7.63291 15.5992L8.68004 13.2092C8.71576 13.1276 8.77755 13.0603 8.8557 13.0177L10.7847 11.9659C11.0639 11.8137 11.0639 11.4127 10.7847 11.2604L8.8557 10.2087C8.77755 10.1661 8.71576 10.0987 8.68004 10.0172L7.63291 7.62711C7.4924 7.30639 7.03744 7.30639 6.89693 7.62711L5.84981 10.0172C5.81409 10.0987 5.7523 10.1661 5.67414 10.2087L3.74515 11.2604C3.4659 11.4127 3.4659 11.8137 3.74514 11.9659L5.67414 13.0177C5.7523 13.0603 5.81409 13.1276 5.84981 13.2092L6.89693 15.5992Z" fill="url(#sp_g1)"/>
      <path d="M6.89693 32.7134C7.03744 33.0341 7.4924 33.0341 7.63291 32.7134L8.68004 30.3233C8.71576 30.2418 8.77755 30.1744 8.8557 30.1318L10.7847 29.08C11.0639 28.9278 11.0639 28.5268 10.7847 28.3746L8.8557 27.3228C8.77755 27.2802 8.71576 27.2129 8.68004 27.1313L7.63291 24.7412C7.4924 24.4205 7.03744 24.4205 6.89693 24.7412L5.84981 27.1313C5.81409 27.2129 5.7523 27.2802 5.67414 27.3228L3.74515 28.3746C3.4659 28.5268 3.4659 28.9278 3.74514 29.08L5.67414 30.1318C5.7523 30.1744 5.81409 30.2418 5.84981 30.3233L6.89693 32.7134Z" fill="url(#sp_g2)"/>
      <defs>
        <linearGradient id="sp_g0" x1="34.86" y1="18.36" x2="8.80" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD360"/><stop offset="1" stopColor="#FF7F3A"/>
        </linearGradient>
        <linearGradient id="sp_g1" x1="10.88" y1="11.17" x2="3.79" y2="11.61" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD360"/><stop offset="1" stopColor="#FF7F3A"/>
        </linearGradient>
        <linearGradient id="sp_g2" x1="10.88" y1="28.28" x2="3.79" y2="28.73" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD360"/><stop offset="1" stopColor="#FF7F3A"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

function GiftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0">
      <rect x="2" y="8" width="16" height="10" rx="1.5" stroke="#f9d84e" strokeWidth="1.5"/>
      <rect x="1" y="5" width="18" height="4" rx="1" stroke="#f9d84e" strokeWidth="1.5"/>
      <line x1="10" y1="5" x2="10" y2="18" stroke="#f9d84e" strokeWidth="1.5"/>
      <path d="M10 5C10 5 7.5 2.5 6 4C4.5 5.5 7.5 5 10 5Z" fill="#f9d84e"/>
      <path d="M10 5C10 5 12.5 2.5 14 4C15.5 5.5 12.5 5 10 5Z" fill="#f9d84e"/>
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg width="22" height="18" viewBox="0 0 22 18" fill="none" className="flex-shrink-0">
      <rect x="1" y="1" width="20" height="16" rx="2" stroke="white" strokeWidth="1.5"/>
      <path d="M1 5l10 7 10-7" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}
