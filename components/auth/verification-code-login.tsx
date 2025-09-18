/**
 * Verification Code Login Component for VidFab AI Video Platform
 */
"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVerificationCodeInput } from "./verification-code-input";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerificationCodeLoginProps {
  onBack?: () => void;
  onSuccess?: () => void;
  callbackUrl?: string;
  className?: string;
}

type LoginStep = "email" | "code" | "verifying";

interface VerificationSession {
  email: string;
  sentAt: number;
  expiresAt: number;
  cooldownUntil: number;
  inputtedCode?: string; // User's partial input
}

const STORAGE_KEY = "vidfab_verification_session";

// localStorage helper functions
const saveVerificationSession = (session: VerificationSession) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn("Failed to save verification session:", error);
  }
};

const getVerificationSession = (): VerificationSession | null => {
  try {
    console.log("🔍 Trying to get verification session from localStorage");
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log("❌ No stored session found");
      return null;
    }
    
    const session = JSON.parse(stored) as VerificationSession;
    const now = Date.now();
    
    // Check if session is expired (verification codes expire after 5 minutes)
    if (now > session.expiresAt) {
      console.log("⏰ Session expired, clearing:", session.email);
      clearVerificationSession();
      return null;
    }
    
    console.log("✅ Valid session found:", session.email);
    return session;
  } catch (error) {
    console.warn("❌ Failed to get verification session:", error);
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

export function VerificationCodeLogin({
  onBack,
  onSuccess,
  callbackUrl = "/dashboard",
  className,
}: VerificationCodeLoginProps) {
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();

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
  });

  // Restore verification session on component mount
  useEffect(() => {
    console.log("🔄 Component mounted, checking for existing session");
    console.log("📍 Current step:", step);
    console.log("📧 Current email:", email);
    const existingSession = getVerificationSession();
    if (existingSession) {
      console.log("✅ Restoring verification session for:", existingSession.email);
      setEmail(existingSession.email);
      setStep("code");
      
      // Restore partial code input if exists
      if (existingSession.inputtedCode) {
        console.log("🔄 Restoring partial code input:", existingSession.inputtedCode.length + " digits");
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

  // Handle verification code input change - save to localStorage
  function handleCodeChange(inputCode: string) {
    console.log("🔧 handleCodeChange called with:", inputCode);
    const existingSession = getVerificationSession();
    if (existingSession) {
      const updatedSession: VerificationSession = {
        ...existingSession,
        inputtedCode: inputCode
      };
      saveVerificationSession(updatedSession);
      console.log("💾 Saving partial code input:", inputCode.length + " digits");
    } else {
      console.log("⚠️ No existing session found for saving code");
    }
  }

  // Handle email submission and send verification code
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      console.log("✅ Verification code sent successfully");
      
      console.log("🔧 About to save session to localStorage BEFORE state update");
      
      // Save verification session to localStorage BEFORE state update
      const now = Date.now();
      console.log("⏰ Current timestamp:", now);
      
      const session: VerificationSession = {
        email: email.trim().toLowerCase(),
        sentAt: now,
        expiresAt: now + (5 * 60 * 1000), // 5 minutes
        cooldownUntil: now + (5 * 60 * 1000) // 5 minutes cooldown
      };
      
      console.log("📝 Session object created:", session);
      saveVerificationSession(session);
      console.log("✅ saveVerificationSession called");
      
      // Update UI state AFTER localStorage is saved
      console.log("🎨 About to update UI state");
      setStep("code");
      
      // Start resend cooldown (5 minutes)
      setResendCooldown(300);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error: any) {
      console.error("Send verification code error:", error);
      setError(error.message || "Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  }

  // Handle verification code input change
  function handleCodeChange(inputCode: string) {
    // Save partial code input to localStorage
    const existingSession = getVerificationSession();
    if (existingSession) {
      const updatedSession: VerificationSession = {
        ...existingSession,
        inputtedCode: inputCode
      };
      saveVerificationSession(updatedSession);
    }
  }

  // Handle verification code completion
  async function handleVerificationComplete(completedCode: string) {
    if (completedCode.length !== 6) return;

    setStep("verifying");
    setCodeError(false);

    try {
      // First, verify the code with our API
      const verifyResponse = await fetch("/api/auth/verify-code-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          code: completedCode 
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || "Invalid verification code");
      }

      console.log("✅ Verification code validated");

      // Now sign in with NextAuth using the verified token
      const signInResult = await signIn("verification-code", {
        email: email.trim().toLowerCase(),
        token: verifyData.verified_token,
        callbackUrl,
        redirect: false,
      });

      if (signInResult?.error) {
        throw new Error(signInResult.error);
      }

      if (signInResult?.ok) {
        console.log("✅ Verification code sign-in successful");
        
        // Clear verification session on successful login
        clearVerificationSession();
        
        onSuccess?.();
        
        // Redirect to callback URL
        if (signInResult.url) {
          router.push(signInResult.url);
        } else {
          router.push(callbackUrl);
        }
      }

    } catch (error: any) {
      console.error("Verification error:", error);
      setCodeError(true);
      setError(error.message || "Verification failed");
      setStep("code");
      clearCode();
    }
  }

  // Handle resend code
  async function handleResendCode() {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend verification code");
      }

      console.log("✅ Verification code resent");
      
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
      setResendCooldown(300);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error: any) {
      console.error("Resend code error:", error);
      setError(error.message || "Failed to resend verification code");
    } finally {
      setIsLoading(false);
    }
  }

  // Format cooldown time
  const formatCooldown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          {step === "email" && "Sign in with Email"}
          {step === "code" && "Enter Verification Code"}
          {step === "verifying" && "Verifying..."}
        </CardTitle>
        <CardDescription>
          {step === "email" && "We'll send you a verification code"}
          {step === "code" && `Code sent to ${email}`}
          {step === "verifying" && "Please wait while we verify your code"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Email Step */}
        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isLoading}
                className="mt-1"
              />
            </div>

            <Button type="submit" disabled={isLoading || !email.trim()} className="w-full">
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
          </form>
        )}

        {/* Code Step */}
        {step === "code" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Enter the 6-digit code</Label>
              <VerificationCodeInputComponent
                disabled={step === "verifying"}
                className="justify-center"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleResendCode}
                disabled={isLoading || resendCooldown > 0}
                className="text-sm"
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
                  setStep("email");
                  setError("");
                  clearCode();
                  clearVerificationSession();
                }}
                disabled={step === "verifying"}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Change Email
              </Button>
            </div>
          </div>
        )}

        {/* Verifying Step */}
        {step === "verifying" && (
          <div className="flex flex-col items-center space-y-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm text-muted-foreground">
              Verifying your code...
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            {error}
          </div>
        )}

        {/* Back Button */}
        {onBack && step === "email" && (
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="w-full mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login Options
          </Button>
        )}
      </CardContent>
    </Card>
  );
}