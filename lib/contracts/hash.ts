import { createHash } from 'crypto'

/**
 * Compute SHA-256 hash of a buffer (PDF document).
 * Returns lowercase hex string.
 */
export function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}
