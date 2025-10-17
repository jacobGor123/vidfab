/**
 * NextAuth API Route Handler for VidFab AI Video Platform - NextAuth 4.x
 */
import NextAuth from "next-auth"
import { authConfig } from "@/auth/config"
import { NextAuthOptions } from "next-auth"

const handler = NextAuth(authConfig as NextAuthOptions)

export { handler as GET, handler as POST }