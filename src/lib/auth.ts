import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1 } as const;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, SCRYPT);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, SCRYPT);
  return timingSafeEqual(actual, expected);
}

/** A hash to compare against when the email is unknown, so "no such user" costs the same as "wrong password". */
export const DUMMY_HASH = hashPassword('not-a-real-password');

export const SESSION_TTL_SECONDS = 7 * 24 * 3600;

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken(userId: number, secret: string, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: now + SESSION_TTL_SECONDS * 1000 }),
  ).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

/** Returns the user id, or null for tampered, malformed or expired tokens. */
export function verifySessionToken(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): number | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      uid?: unknown;
      exp?: unknown;
    };
    if (typeof data.uid !== 'number' || typeof data.exp !== 'number' || data.exp < now) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export function getSessionSecret(env: Record<string, string | undefined> = process.env): string {
  const secret = env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (env.NODE_ENV === 'production') throw new Error('SESSION_SECRET must be set (32+ chars) in production');
  return 'dev-only-insecure-session-secret-do-not-use';
}
