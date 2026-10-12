import type { DB } from './db.ts';
import { DUMMY_HASH, hashPassword, verifyPassword } from './auth.ts';
import { DEFAULT_ACCENT } from './palette.ts';
import { createOwner, findUserByEmail } from './repo.ts';
import { loginSchema, signupSchema } from './schemas.ts';

export type AuthResult =
  | { ok: true; userId: number; slug?: string }
  | { ok: false; error: 'invalid_input' | 'email_taken' | 'invalid_credentials'; field?: string };

export function signUp(db: DB, raw: unknown): AuthResult {
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? '');
    return { ok: false, error: 'invalid_input', field };
  }
  const { email, password, shopName, whatsapp } = parsed.data;
  const created = createOwner(db, {
    email,
    passwordHash: hashPassword(password),
    shopName,
    whatsapp,
    accent: DEFAULT_ACCENT,
  });
  if (!created.ok) return { ok: false, error: 'email_taken' };
  return { ok: true, userId: created.value.userId, slug: created.value.slug };
}

/** Same error for "no such user" and "wrong password", and the same amount of hashing work for both. */
export function logIn(db: DB, raw: unknown): AuthResult {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid_credentials' };
  const user = findUserByEmail(db, parsed.data.email);
  const good = verifyPassword(parsed.data.password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !good) return { ok: false, error: 'invalid_credentials' };
  return { ok: true, userId: user.id };
}
