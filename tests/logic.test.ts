import { describe, expect, it } from 'vitest';
import { formatMAD, parsePriceToCents } from '../src/lib/money.ts';
import { buildOrderMessage, normalizeMoroccanPhone, orderTotalCents, waUrl } from '../src/lib/whatsapp.ts';
import { slugify, uniqueSlug } from '../src/lib/slug.ts';
import {
  createSessionToken,
  getSessionSecret,
  hashPassword,
  verifySessionToken,
  verifyPassword,
} from '../src/lib/auth.ts';
import { rateLimit, resetRateLimits } from '../src/lib/rate-limit.ts';
import { ACCENTS } from '../src/lib/palette.ts';
import { sniffImage, MAX_IMAGE_BYTES } from '../src/lib/image.ts';

describe('money', () => {
  it.each([
    ['45', 4500],
    ['12,5', 1250],
    ['12.50 dh', 1250],
    ['0', 0],
    [' 30 MAD ', 3000],
  ])('parses %s', (input, cents) => expect(parsePriceToCents(input)).toBe(cents));

  it.each(['', 'abc', '-5', '1.234', '12,,5', '1000000', '1e3'])('rejects %j', (input) =>
    expect(parsePriceToCents(input)).toBeNull(),
  );

  it('formats whole and fractional amounts per language', () => {
    expect(formatMAD(4500, 'fr')).toMatch(/^45\sMAD$/);
    expect(formatMAD(1250, 'fr')).toMatch(/^12,50\sMAD$/);
    expect(formatMAD(1250, 'ar')).toMatch(/^12\.50\sدرهم$/);
  });
});

describe('phone numbers', () => {
  it.each([
    ['0612345678', '212612345678'],
    ['+212 6 12 34 56 78', '212612345678'],
    ['00212612345678', '212612345678'],
    ['06-12-34-56-78', '212612345678'],
    ['0522000000', '212522000000'],
  ])('normalises %s', (input, out) => expect(normalizeMoroccanPhone(input)).toBe(out));

  it.each(['', '12345', '+33612345678', '0112345678', '06123456789', 'abc', '+212 (6) 1x'])(
    'rejects %j',
    (input) => expect(normalizeMoroccanPhone(input)).toBeNull(),
  );
});

describe('WhatsApp order message', () => {
  const lines = [
    { name: 'Huile d’olive', qty: 2, unitCents: 9000 },
    { name: 'Miel', qty: 1, unitCents: 12000 },
    { name: 'Ignored', qty: 0, unitCents: 100 },
  ];

  it('lists lines, customer name, note and the total in French', () => {
    const msg = buildOrderMessage({
      shopName: 'Dar Zaytoun',
      lines,
      customerName: 'Fatima',
      note: 'livraison demain',
      lang: 'fr',
    });
    expect(msg).toContain('Bonjour Dar Zaytoun,');
    expect(msg).toContain('2 x Huile d’olive');
    expect(msg).toContain('Nom: Fatima');
    expect(msg).toContain('Remarque: livraison demain');
    expect(msg).not.toContain('Ignored');
    expect(msg.split('\n').at(-1)).toMatch(/^Total: 300\sMAD$/);
  });

  it('writes Arabic labels', () => {
    expect(buildOrderMessage({ shopName: 'X', lines, lang: 'ar' })).toContain('المجموع');
  });

  it('strips control characters and caps length of customer input', () => {
    const msg = buildOrderMessage({
      shopName: 'X',
      lines,
      note: 'a\r\nb\u0000' + 'z'.repeat(500),
      lang: 'fr',
    });
    const note = msg.split('\n').find((l) => l.startsWith('Remarque:')) ?? '';
    expect(note.length).toBeLessThanOrEqual('Remarque: '.length + 200);
    expect(note).not.toMatch(/\u0000/);
  });

  it('totals correctly and builds an encoded wa.me URL', () => {
    expect(orderTotalCents(lines)).toBe(30000);
    expect(waUrl('212612345678', 'a b&c\nd')).toBe('https://wa.me/212612345678?text=a%20b%26c%0Ad');
  });
});

describe('slugs', () => {
  it('removes accents and symbols', () =>
    expect(slugify('Épicerie Chez Hamid !')).toBe('epicerie-chez-hamid'));
  it('falls back for Arabic-only or reserved names', () => {
    expect(slugify('بقالة الزيتون')).toBe('boutique');
    expect(slugify('Admin')).toBe('boutique');
  });
  it('appends a counter until free', () => {
    const taken = new Set(['dar', 'dar-2']);
    expect(uniqueSlug('dar', (s) => taken.has(s))).toBe('dar-3');
  });
});

describe('auth', () => {
  it('verifies the right password only', () => {
    const h = hashPassword('correct horse battery');
    expect(verifyPassword('correct horse battery', h)).toBe(true);
    expect(verifyPassword('wrong', h)).toBe(false);
    expect(verifyPassword('x', 'garbage')).toBe(false);
  });

  const secret = 's'.repeat(32);
  it('round-trips a session token', () =>
    expect(verifySessionToken(createSessionToken(7, secret), secret)).toBe(7));
  it('rejects a token signed with another secret', () =>
    expect(verifySessionToken(createSessionToken(7, secret), 't'.repeat(32))).toBeNull());
  it('rejects a tampered payload', () => {
    const [, sig] = createSessionToken(7, secret).split('.');
    const forged = Buffer.from(JSON.stringify({ uid: 1, exp: Date.now() + 1e9 })).toString('base64url');
    expect(verifySessionToken(`${forged}.${sig}`, secret)).toBeNull();
  });
  it('rejects an expired token', () => {
    const token = createSessionToken(7, secret, 1000);
    expect(verifySessionToken(token, secret, 1000 + 8 * 24 * 3600 * 1000)).toBeNull();
  });
  it('rejects empty and malformed tokens', () => {
    for (const t of [undefined, '', 'abc', 'a.b.c', '.']) expect(verifySessionToken(t, secret)).toBeNull();
  });
  it('refuses a missing secret in production but not in dev', () => {
    expect(() => getSessionSecret({ NODE_ENV: 'production' })).toThrow();
    expect(() => getSessionSecret({ NODE_ENV: 'production', SESSION_SECRET: 'short' })).toThrow();
    expect(getSessionSecret({ NODE_ENV: 'development' })).toBeTruthy();
  });
});

describe('rate limit', () => {
  it('blocks after max hits and recovers after the window', () => {
    resetRateLimits();
    for (let i = 0; i < 3; i++) expect(rateLimit('k', 3, 1000, 0).ok).toBe(true);
    expect(rateLimit('k', 3, 1000, 10).ok).toBe(false);
    expect(rateLimit('other', 3, 1000, 10).ok).toBe(true);
    expect(rateLimit('k', 3, 1000, 1001).ok).toBe(true);
  });
});

describe('accent palette', () => {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (c[0] ?? 0) + 0.7152 * (c[1] ?? 0) + 0.0722 * (c[2] ?? 0);
  };
  it.each(ACCENTS.map((a) => a.hex))('%s has 4.5:1 contrast with white', (hex) =>
    expect(1.05 / (lum(hex) + 0.05)).toBeGreaterThanOrEqual(4.5),
  );
});

describe('image sniffing', () => {
  it('detects JPEG, PNG and WebP by magic bytes, not by extension', () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('image/jpeg');
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('image/png');
    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(sniffImage(webp)).toBe('image/webp');
  });

  it('rejects anything else, including a renamed script or short input', () => {
    expect(sniffImage(new TextEncoder().encode('<script>alert(1)</script>'))).toBeNull();
    expect(sniffImage(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it('caps size at 300KB', () => expect(MAX_IMAGE_BYTES).toBe(300 * 1024));
});
