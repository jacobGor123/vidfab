/**
 * Hash utilities for VidFab AI Video Platform
 */
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

// VidFab namespace UUID for deterministic UUID generation
const VIDFAB_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Generate a unique UUID
 */
export function getUuid(): string {
  return uuidv4();
}

/**
 * Generate a deterministic UUID based on user email
 * Same email will always generate the same UUID
 */
export function getUserUuidFromEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Invalid email for UUID generation');
  }
  return uuidv5(email.toLowerCase().trim(), VIDFAB_NAMESPACE);
}

/**
 * Generate a random verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a random string
 */
export function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}