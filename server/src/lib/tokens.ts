import { createHash, randomBytes } from 'node:crypto';

/** Generate a URL-safe random token. Return the plaintext to the user once. */
export function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

/** One-way hash a reset token for storage/lookup. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
