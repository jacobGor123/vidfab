import { assertSafeExternalUrl } from './url-guard'

function assertThrows(fn: () => unknown) {
  let threw = false
  try {
    fn()
  } catch {
    threw = true
  }
  if (!threw) {
    throw new Error('Expected function to throw')
  }
}

// Minimal node-based test file that can be run with tsx.
// Usage: npx tsx lib/services/video-agent/security/url-guard.test.ts

const u = assertSafeExternalUrl('https://example.com/path/file.png')
if (u.protocol !== 'https:' || u.hostname !== 'example.com') {
  throw new Error('Expected https://example.com to be allowed')
}

assertThrows(() => assertSafeExternalUrl('http://example.com/a'))
assertThrows(() => assertSafeExternalUrl('https://localhost/a'))
assertThrows(() => assertSafeExternalUrl('https://127.0.0.1/a'))
assertThrows(() => assertSafeExternalUrl('https://[::1]/a'))
assertThrows(() => assertSafeExternalUrl('https://127.0.0.1.nip.io/a'))

console.log('url-guard tests: OK')
