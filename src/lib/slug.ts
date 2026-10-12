const RESERVED = new Set(['admin', 'api', 'dashboard', 'login', 'signup', 'c', 'static', '_next']);

/** "Épicerie Chez Hamid !" -> "epicerie-chez-hamid". Arabic-only names fall back to "boutique". */
export function slugify(name: string): string {
  const s = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return s.length >= 2 && !RESERVED.has(s) ? s : 'boutique';
}

/** Pick a slug that `isTaken` says is free: base, base-2, base-3, ... */
export function uniqueSlug(base: string, isTaken: (slug: string) => boolean): string {
  if (!isTaken(base)) return base;
  for (let i = 2; i < 10_000; i++) {
    const candidate = `${base}-${i}`;
    if (!isTaken(candidate)) return candidate;
  }
  throw new Error('Could not find a free slug');
}
