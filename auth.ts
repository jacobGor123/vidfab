/**
 * NextAuth v4 Main Configuration for VidFab AI Video Platform
 */
import NextAuth, { type DefaultSession, type NextAuthOptions } from "next-auth"
import { authConfig } from "@/auth/config"

// NextAuth v4 handler for API routes
const handler = NextAuth(authConfig as NextAuthOptions)

// Export handler for API routes
export default handler

// Export auth functions for server components
import { getServerSession } from "next-auth"

export const auth = () => getServerSession(authConfig)

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