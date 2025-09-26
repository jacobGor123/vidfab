/**
 * Time utilities for VidFab AI Video Platform
 */

/**
 * Get current ISO timestamp string
 */
export function getIsoTimestr(): string {
  return new Date().toISOString();
}

/**
 * Get timestamp for X minutes from now
 */
export function getTimeAfterMinutes(minutes: number): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

/**
 * Check if a timestamp is expired
 */
export function isExpired(timestamp: string): boolean {
  return new Date() > new Date(timestamp);
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}