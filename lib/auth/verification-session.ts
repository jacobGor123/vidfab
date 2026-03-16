/**
 * Verification session helpers — localStorage persistence for email code flow
 */

export interface VerificationSession {
  email: string
  sentAt: number
  expiresAt: number
  cooldownUntil: number
  inputtedCode?: string
}

const STORAGE_KEY = "vidfab_verification_session"

export const saveVerificationSession = (session: VerificationSession) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch (e) {
    console.warn("Failed to save verification session:", e)
  }
}

export const getVerificationSession = (): VerificationSession | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const session = JSON.parse(stored) as VerificationSession
    if (Date.now() > session.expiresAt) {
      clearVerificationSession()
      return null
    }
    return session
  } catch (e) {
    console.warn("Failed to get verification session:", e)
    clearVerificationSession()
    return null
  }
}

export const clearVerificationSession = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.warn("Failed to clear verification session:", e)
  }
}
