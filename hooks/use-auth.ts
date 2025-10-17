'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export interface AuthUser {
  uuid: string
  email: string
  nickname: string
  avatar_url?: string
  created_at: string
}

export interface UseAuthReturn {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  session: any
}

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession()
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    if (session?.user) {
      setUser(session.user as AuthUser)
    } else {
      setUser(null)
    }
  }, [session])

  return {
    user,
    isLoading: status === 'loading',
    isAuthenticated: !!session?.user,
    session
  }
}