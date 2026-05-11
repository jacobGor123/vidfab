import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      uuid: string
      id?: string
      email: string
      nickname?: string
      avatar_url?: string
      created_at?: string
      isNewUser?: boolean
      signinProvider?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user?: {
      uuid: string
      id?: string
      email: string
      nickname?: string
      avatar_url?: string
      created_at?: string
    }
    isNewUser?: boolean
    signinProvider?: string
  }
}
