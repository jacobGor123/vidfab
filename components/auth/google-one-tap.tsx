/**
 * Google One Tap Component for VidFab AI Video Platform
 */
"use client";

import { useEffect, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, config: any) => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface GoogleOneTapProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
  disabled?: boolean;
}

export function GoogleOneTap({ onSuccess, onError, disabled = false }: GoogleOneTapProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const initRef = useRef(false);

  useEffect(() => {
    // Don't show One Tap if user is already logged in
    if (status === "authenticated" || disabled) {
      return;
    }

    // Disable Google One Tap in development to avoid FedCM errors
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    // Only initialize once
    if (initRef.current) return;
    initRef.current = true;

    // Check if Google One Tap is enabled
    const isEnabled = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED === "true";
    const clientId = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID;
    
    if (!isEnabled || !clientId) {
      return;
    }

    // Load Google Identity Services script
    const loadGoogleScript = () => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleOneTap;
      document.head.appendChild(script);
    };

    const initializeGoogleOneTap = () => {
      if (!window.google?.accounts?.id) {
        console.error("Google Identity Services not loaded");
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          context: "signin",
          ux_mode: "popup",
          itp_support: true,
        });

        // Prompt the One Tap UI
        window.google.accounts.id.prompt();
      } catch (error) {
        console.error("Failed to initialize Google One Tap:", error);
        onError?.(error);
      }
    };

    const handleCredentialResponse = async (response: any) => {
      try {
        if (!response.credential) {
          throw new Error("No credential received from Google");
        }


        // Sign in using NextAuth with the credential
        const result = await signIn("google-one-tap", {
          credential: response.credential,
          redirect: false,
        });

        if (result?.error) {
          throw new Error(result.error);
        }

        if (result?.ok) {
          onSuccess?.();
          router.push("/create"); // Redirect to create page
        }
      } catch (error) {
        console.error("Google One Tap sign-in error:", error);
        onError?.(error);
      }
    };

    // Load the script if not already loaded
    if (!window.google?.accounts?.id) {
      loadGoogleScript();
    } else {
      initializeGoogleOneTap();
    }

    // Cleanup function
    return () => {
      try {
        window.google?.accounts?.id?.cancel();
      } catch (error) {
        // Ignore cleanup errors
      }
    };
  }, [status, disabled, onSuccess, onError, router]);

  // This component doesn't render anything visible
  // The One Tap UI is handled by Google's SDK
  return null;
}

// Hook to use Google One Tap in any component
export function useGoogleOneTap(options?: GoogleOneTapProps) {
  const { onSuccess, onError, disabled } = options || {};
  
  return {
    GoogleOneTapComponent: () => (
      <GoogleOneTap 
        onSuccess={onSuccess} 
        onError={onError} 
        disabled={disabled} 
      />
    ),
  };
}