/**
 * IP address utilities for VidFab AI Video Platform
 */
import { headers } from 'next/headers';

/**
 * Get client IP address from request headers
 */
export async function getClientIp(): Promise<string> {
  try {
    const headersList = await headers();
    
    // Try different header sources for IP
    const xForwardedFor = headersList.get('x-forwarded-for');
    const xRealIp = headersList.get('x-real-ip');
    const cfConnectingIp = headersList.get('cf-connecting-ip');
    
    if (xForwardedFor) {
      // x-forwarded-for can contain multiple IPs, get the first one
      return xForwardedFor.split(',')[0].trim();
    }
    
    if (cfConnectingIp) {
      return cfConnectingIp;
    }
    
    if (xRealIp) {
      return xRealIp;
    }
    
    // Fallback
    return '127.0.0.1';
  } catch (error) {
    console.error('Error getting client IP:', error);
    return '127.0.0.1';
  }
}

/**
 * Validate IP address format
 */
export function isValidIp(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}