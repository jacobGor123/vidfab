/**
 * NextAuth v5 Main Configuration for VidFab AI Video Platform
 */
import NextAuth, { type DefaultSession } from "next-auth"
import { authConfig } from "@/auth/config"

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig)

// Export auth configuration for middleware
export { authConfig } from "@/auth/config"

// Type augmentation for NextAuth
declare module "next-auth" {
  interface Session {
    user: {
      uuid: string
      email: string
      nickname: string
      avatar_url?: string
      created_at: string
    } & DefaultSession["user"]
  }

  interface User {
    uuid?: string
    nickname?: string
    avatar_url?: string
    created_at?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user?: {
      uuid: string
      email: string
      nickname: string
      avatar_url?: string
      created_at: string
    }
  }
}