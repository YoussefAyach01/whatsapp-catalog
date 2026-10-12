import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSessionToken, getSessionSecret, SESSION_TTL_SECONDS, verifySessionToken } from './auth.ts';
import { getDb } from './db.ts';
import { findUserById, getShopByOwner, type Shop, type User } from './repo.ts';

const COOKIE = 'wc_session';

export async function setSession(userId: number): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, createSessionToken(userId, getSessionSecret()), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function getOwner(): Promise<{ user: User; shop: Shop } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  const userId = verifySessionToken(token, getSessionSecret());
  if (userId === null) return null;
  const db = getDb();
  const user = findUserById(db, userId);
  const shop = user ? getShopByOwner(db, user.id) : undefined;
  return user && shop ? { user, shop } : null;
}

/** Use at the top of every dashboard page and every mutating action: the UI hiding a button is not authorization. */
export async function requireOwner(): Promise<{ user: User; shop: Shop }> {
  const owner = await getOwner();
  if (!owner) redirect('/login');
  return owner;
}

/** Best-effort client IP for rate limiting. Behind a proxy make sure it sets x-forwarded-for itself. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local';
}
