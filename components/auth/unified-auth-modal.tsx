"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { GoogleLoginButton } from "@/components/auth/google-login-button"
import { GoogleOneTap } from "@/components/auth/google-one-tap"
import { useVerificationCodeInput } from "./verification-code-input"
import { ArrowLeft, Mail, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

// Verification session interface and localStorage helpers
interface VerificationSession {
  email: string;
  sentAt: number;
  expiresAt: number;
  cooldownUntil: number;
  inputtedCode?: string;
}

const STORAGE_KEY = "vidfab_verification_session";

const saveVerificationSession = (session: VerificationSession) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn("Failed to save verification session:", error);
  }
};

const getVerificationSession = (): VerificationSession | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    
    const session = JSON.parse(stored) as VerificationSession;
    const now = Date.now();
    
    if (now > session.expiresAt) {
      clearVerificationSession();
      return null;
    }
    
    return session;
  } catch (error) {
    console.warn("Failed to get verification session:", error);
    clearVerificationSession();
    return null;
  }
};

const clearVerificationSession = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear verification session:", error);
  }
};

/**
 * Unified Authentication Modal Component
 * Provides a single modal for both Google and email verification login
 */
export function UnifiedAuthModal({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [authStep, setAuthStep] = useState<"options" | "email" | "code" | "verifying">("options")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const router = useRouter()

  // Handle verification code input change - save to localStorage
  function handleCodeChange(inputCode: string) {
    const existingSession = getVerificationSession();
    if (existingSession) {
      const updatedSession: VerificationSession = {
        ...existingSession,
        inputtedCode: inputCode
      };
      saveVerificationSession(updatedSession);
    }
  }

  // Restore verification session on component mount
  useEffect(() => {
    const existingSession = getVerificationSession();
    if (existingSession) {
      setEmail(existingSession.email);
      setAuthStep("code");
      
      // Restore partial code input if exists
      if (existingSession.inputtedCode) {
        setCode(existingSession.inputtedCode);
      }
      
      // Calculate remaining cooldown
      const now = Date.now();
      const cooldownRemaining = Math.max(0, Math.floor((existingSession.cooldownUntil - now) / 1000));
      if (cooldownRemaining > 0) {
        setResendCooldown(cooldownRemaining);
        const interval = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
  }, []);

  const {
    code,
    setCode,
    error: codeError,
    setError: setCodeError,
    clear: clearCode,
    VerificationCodeInputComponent,
  } = useVerificationCodeInput({
    length: 6,
    onComplete: handleVerificationComplete,
    onChange: handleCodeChange, // Add onChange handler
  })

  const handleAuthSuccess = () => {
    router.push("/create")
  }

  const handleAuthError = (error: any) => {
    console.error("Authentication error:", error)
    setError(error.message || "Authentication failed")
  }

  // Handle email submission and send verification code
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification code")
      }

      // Save verification session to localStorage BEFORE state update
      const now = Date.now();
      const session: VerificationSession = {
        email: email.trim().toLowerCase(),
        sentAt: now,
        expiresAt: now + (5 * 60 * 1000), // 5 minutes
        cooldownUntil: now + (5 * 60 * 1000) // 5 minutes cooldown
      };
      saveVerificationSession(session);
      
      // Update UI state AFTER localStorage is saved
      setAuthStep("code")
      
      // Start resend cooldown (5 minutes)
      setResendCooldown(300)
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)

    } catch (error: any) {
      console.error("Send verification code error:", error)
      setError(error.message || "Failed to send verification code")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle verification code completion
  async function handleVerificationComplete(completedCode: string) {
    if (completedCode.length !== 6) return

    setAuthStep("verifying")
    setCodeError(false)

    try {
      // First, verify the code with our API
      const verifyResponse = await fetch("/api/auth/verify-code-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          code: completedCode 
        }),
      })

      const verifyData = await verifyResponse.json()

      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || "Invalid verification code")
      }


      // Now sign in with NextAuth using the verified token
      const signInResult = await signIn("verification-code", {
        email: email.trim().toLowerCase(),
        token: verifyData.verified_token,
        callbackUrl: "/create",
        redirect: false,
      })

      if (signInResult?.error) {
        throw new Error(signInResult.error)
      }

      if (signInResult?.ok) {
        // Clear verification session on successful login
        clearVerificationSession();
        
        handleAuthSuccess()
      }

    } catch (error: any) {
      console.error("Verification error:", error)
      setCodeError(true)
      setError(error.message || "Verification failed")
      setAuthStep("code")
      clearCode()
    }
  }

  // Handle resend code
  async function handleResendCode() {
    if (resendCooldown > 0) return

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend verification code")
      }

      // Update verification session in localStorage
      const now = Date.now();
      const session: VerificationSession = {
        email: email.trim().toLowerCase(),
        sentAt: now,
        expiresAt: now + (5 * 60 * 1000), // 5 minutes
        cooldownUntil: now + (5 * 60 * 1000) // 5 minutes cooldown
      };
      saveVerificationSession(session);
      
      // Restart cooldown
      setResendCooldown(300)
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)

    } catch (error: any) {
      console.error("Resend code error:", error)
      setError(error.message || "Failed to resend verification code")
    } finally {
      setIsLoading(false)
    }
  }

  // Format cooldown time
  const formatCooldown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <div className={cn("flex items-center justify-center min-h-screen p-4", className)} {...props}>
      <Card className="w-full max-w-md bg-gradient-to-br from-slate-900/95 via-gray-900/95 to-slate-900/95 backdrop-blur-xl border-white/20 shadow-apple-strong">
        <CardHeader className="items-center text-center">
          <Link href="/" aria-label="Go to homepage">
             <img src="/logo/vidfab-not-text.png" width={80} height={80} alt="logo" />
          </Link>
          <div>
            <CardTitle className="text-3xl font-heading text-gradient-brand">
              {authStep === "options" && "Welcome to VidFab !"}
              {authStep === "email" && "Sign in with Email"}
              {authStep === "code" && "Enter Verification Code"}
              {authStep === "verifying" && "Verifying..."}
            </CardTitle>
            <CardDescription className="text-gray-400 mt-2">
              {authStep === "options" && "Choose your preferred sign-in method"}
              {authStep === "email" && "We'll send you a verification code"}
              {authStep === "code" && `Code sent to ${email}`}
              {authStep === "verifying" && "Please wait while we verify your code"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {/* Login Options */}
          {authStep === "options" && (
            <div className="space-y-6">
              {/* Google Login */}
              <GoogleLoginButton
                onSuccess={handleAuthSuccess}
                onError={handleAuthError}
                callbackUrl="/create"
                className="w-full font-heading py-3 text-base bg-white/5 border-white/20 text-white hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300"
              />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full bg-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gradient-to-br from-slate-900/95 via-gray-900/95 to-slate-900/95 px-2 text-gray-400">Or continue with</span>
                </div>
              </div>

              {/* Email Login */}
              <Button
                variant="outline"
                onClick={() => setAuthStep("email")}
                className="w-full font-heading py-3 text-base bg-white/5 border-white/20 text-white hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-cyan-400/10 hover:border-purple-400/30 transition-all duration-300"
              >
                <Mail className="mr-2 h-4 w-4" />
                Continue with Email
              </Button>
            </div>
          )}

          {/* Email Input Step */}
          {authStep === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/20"
                />
              </div>

              <Button
                type="submit"
                variant="outline"
                disabled={isLoading || !email.trim()}
                className="w-full font-heading py-3 text-base bg-white/5 border-white/20 text-white hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-cyan-400/10 hover:border-purple-400/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Verification Code
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAuthStep("options")
                  setError("")
                  setEmail("")
                }}
                className="w-full text-gray-400 hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login Options
              </Button>
            </form>
          )}

          {/* Code Input Step */}
          {authStep === "code" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-gray-300">Enter the 6-digit code</Label>
                <VerificationCodeInputComponent
                  autoFocus
                  disabled={authStep === "verifying"}
                  className="justify-center"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResendCode}
                  disabled={isLoading || resendCooldown > 0}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  {resendCooldown > 0
                    ? `Resend in ${formatCooldown(resendCooldown)}`
                    : "Resend Code"
                  }
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAuthStep("email")
                    setError("")
                    clearCode()
                  }}
                  disabled={authStep === "verifying"}
                  className="border-white/20 text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-cyan-400/10 hover:border-purple-400/30"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Change Email
                </Button>
              </div>
            </div>
          )}

          {/* Verifying Step */}
          {authStep === "verifying" && (
            <div className="flex flex-col items-center space-y-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-brand-purple-DEFAULT" />
              <p className="text-sm text-gray-400">
                Verifying your code...
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-md">
              {error}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-center">
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-gray-400 hover:underline underline-offset-2"
          >
            ← Back to homepage
          </Link>
        </CardFooter>
      </Card>

      {/* Google One Tap (invisible) */}
      <GoogleOneTap 
        onSuccess={handleAuthSuccess} 
        onError={handleAuthError}
      />
    </div>
  )
}