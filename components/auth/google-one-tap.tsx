/**
 * Google One Tap Component for VidFab AI Video Platform
 */
"use client";

import { useEffect, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useClientOnly } from "@/hooks/use-client-only";

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
  const isClient = useClientOnly();

  useEffect(() => {
    // Don't show One Tap if user is already logged in
    if (status === "authenticated" || disabled || !isClient) {
      console.log('🔐 Google One Tap disabled:', {
        authenticated: status === "authenticated",
        disabled,
        isClient,
        dockerEnv: !!process.env.DOCKER_ENVIRONMENT
      });
      return;
    }

    // Only disable in local development without Docker
    // Allow in Docker environment and production
    if (process.env.NODE_ENV === 'development' &&
        !process.env.DOCKER_ENVIRONMENT &&
        window.location.hostname === 'localhost') {
      console.log('🔐 Google One Tap disabled in local development');
      return;
    }

    // Only initialize once
    if (initRef.current) {
      console.log('🔐 Google One Tap already initialized');
      return;
    }
    initRef.current = true;

    // Check if Google One Tap is enabled
    const isEnabled = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED === "true";
    const clientId = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID;

    console.log('🔐 Google One Tap configuration:', {
      isEnabled,
      hasClientId: !!clientId,
      clientId: clientId?.slice(0, 20) + '...',
      dockerEnv: !!process.env.DOCKER_ENVIRONMENT,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown'
    });

    if (!isEnabled || !clientId) {
      console.log('❌ Google One Tap not enabled or missing client ID');
      return;
    }

    // Load Google Identity Services script
    const loadGoogleScript = () => {
      console.log('📥 Loading Google Identity Services script...');

      // Check if script already exists
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        console.log('📥 Google script already exists, initializing...');
        initializeGoogleOneTap();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log('✅ Google Identity Services script loaded successfully');
        initializeGoogleOneTap();
      };

      script.onerror = (error) => {
        console.error('❌ Failed to load Google Identity Services script:', error);
        onError?.(new Error('Failed to load Google authentication'));
      };

      document.head.appendChild(script);
    };

    const initializeGoogleOneTap = () => {
      if (!window.google?.accounts?.id) {
        console.error("❌ Google Identity Services not loaded");
        // Retry after a delay
        setTimeout(() => {
          if (window.google?.accounts?.id) {
            initializeGoogleOneTap();
          }
        }, 1000);
        return;
      }

      try {
        console.log('🔧 Initializing Google One Tap with client ID:', clientId.slice(0, 20) + '...');

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          context: "signin",
          ux_mode: "popup",
          itp_support: true,
          // Additional configuration for Docker environments
          ...(process.env.DOCKER_ENVIRONMENT && {
            use_fedcm_for_prompt: false,
          }),
        });

        console.log('✅ Google One Tap initialized, showing prompt...');

        // Prompt the One Tap UI with error handling
        try {
          window.google.accounts.id.prompt((notification) => {
            console.log('🔐 Google One Tap prompt result:', notification);

            if (notification.isNotDisplayed()) {
              console.log('ℹ️ Google One Tap not displayed:', notification.getNotDisplayedReason());
            }

            if (notification.isSkippedMoment()) {
              console.log('ℹ️ Google One Tap skipped:', notification.getSkippedReason());
            }
          });
        } catch (promptError) {
          console.error('❌ Google One Tap prompt error:', promptError);
        }
      } catch (error) {
        console.error("❌ Failed to initialize Google One Tap:", error);
        onError?.(error);
      }
    };

    const handleCredentialResponse = async (response: any) => {
      try {
        console.log('🔐 Google One Tap credential received');

        if (!response.credential) {
          throw new Error("No credential received from Google");
        }

        console.log('🔐 Attempting NextAuth sign-in with Google One Tap...');

        // Sign in using NextAuth with the credential
        const result = await signIn("google-one-tap", {
          credential: response.credential,
          redirect: false,
        });

        console.log('🔐 Google One Tap sign-in result:', {
          ok: result?.ok,
          error: result?.error,
          url: result?.url,
          dockerEnv: !!process.env.DOCKER_ENVIRONMENT
        });

        if (result?.error) {
          let errorMessage = "Google One Tap sign-in failed. Please try the regular Google sign-in.";

          // Provide specific error messages
          if (result.error.includes('token')) {
            errorMessage = "Invalid token from Google. Please try again.";
          } else if (result.error.includes('fetch')) {
            errorMessage = "Network error. Please check your connection.";
          }

          throw new Error(errorMessage);
        }

        if (result?.ok) {
          console.log('✅ Google One Tap sign-in successful');
          onSuccess?.();

          // Handle redirect with Docker support
          const redirectUrl = result.url || "/create";

          if (process.env.DOCKER_ENVIRONMENT) {
            window.location.href = redirectUrl;
          } else {
            router.push(redirectUrl);
          }
        }
      } catch (error: any) {
        console.error("❌ Google One Tap sign-in error:", error);
        onError?.(error);

        // Optional: Show a subtle error message
        if (typeof window !== 'undefined' && error.message.includes('Please try again')) {
          console.log('ℹ️ User can try regular Google sign-in as fallback');
        }
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
  }, [status, disabled, onSuccess, onError, router, isClient]);

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