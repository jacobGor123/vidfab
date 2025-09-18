"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { GoogleLoginButton } from "@/components/auth/google-login-button"
import { GoogleOneTap } from "@/components/auth/google-one-tap"
import { VerificationCodeLogin } from "@/components/auth/verification-code-login"
import { ArrowRight, Mail } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * LoginForm component.
 * Provides UI for user login with multiple authentication methods.
 * @param {React.ComponentPropsWithoutRef<"div">} props - Standard div props.
 */
export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [loginMethod, setLoginMethod] = useState<"options" | "verification-code">("options")

  const handleAuthSuccess = () => {
    console.log("✅ Authentication successful")
    // Additional success handling can be added here
  }

  const handleAuthError = (error: any) => {
    console.error("❌ Authentication error:", error)
    // Additional error handling can be added here
  }

  if (loginMethod === "verification-code") {
    return (
      <div className={cn("flex items-center justify-center min-h-screen p-4", className)} {...props}>
        <VerificationCodeLogin
          onBack={() => setLoginMethod("options")}
          onSuccess={handleAuthSuccess}
          callbackUrl="/dashboard"
        />
        <GoogleOneTap 
          onSuccess={handleAuthSuccess} 
          onError={handleAuthError}
        />
      </div>
    )
  }

  return (
    <div className={cn("flex items-center justify-center min-h-screen p-4", className)} {...props}>
      <Card className="w-full max-w-md bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader className="items-center text-center space-y-4">
          <Link href="/" aria-label="Go to homepage">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">V</span>
            </div>
          </Link>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
              Welcome to VidFab
            </CardTitle>
            <CardDescription className="text-gray-400 mt-2">
              Sign in to start creating amazing AI-powered videos
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Google Login */}
          <GoogleLoginButton
            onSuccess={handleAuthSuccess}
            onError={handleAuthError}
            callbackUrl="/dashboard"
            className="w-full"
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full bg-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black px-2 text-gray-400">Or continue with</span>
            </div>
          </div>

          {/* Email/Verification Code Login */}
          <Button
            onClick={() => setLoginMethod("verification-code")}
            variant="outline"
            className="w-full border-white/10 hover:border-purple-500/50 hover:bg-white/5 transition-colors"
          >
            <Mail className="mr-2 h-4 w-4" />
            Continue with Email
          </Button>

          {/* Developer Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-3 text-xs text-gray-500 bg-gray-900/50 border border-gray-800 rounded-md">
              <p className="font-semibold mb-1">🔧 Development Mode</p>
              <p>• Google login requires OAuth setup</p>
              <p>• Email login sends codes to console</p>
              <p>• Check browser console for debug info</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm text-gray-400">
            {"Don't have an account? "}
            <Link
              href="/signup"
              className="font-medium text-purple-400 hover:text-purple-300 hover:underline underline-offset-2"
            >
              Sign up for free
            </Link>
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-gray-400 hover:underline underline-offset-2"
            >
              ← Back to homepage
            </Link>
          </div>
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
