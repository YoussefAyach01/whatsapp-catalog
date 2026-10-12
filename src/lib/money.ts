export type Lang = 'fr' | 'ar';

/**
 * Parse what a restaurant owner types ("45", "12,5", "12.50 dh") into centimes.
 * Returns null when it is not a sane price (negative, NaN, more than 2 decimals, > 100 000 MAD).
 */
export function parsePriceToCents(input: string): number | null {
  const cleaned = input
    .trim()
    .replace(/\s*(mad|dh|dhs|درهم)\s*$/i, '')
    .replace(',', '.');
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  return cents <= 100_000 * 100 ? cents : null;
}

/** 4500 -> "45 MAD", 1250 -> "12,50 MAD" (fr) / "12.50 درهم" (ar). Whole amounts drop the decimals. */
export function formatMAD(cents: number, lang: Lang = 'fr'): string {
  const whole = cents % 100 === 0;
  const value = (cents / 100).toFixed(whole ? 0 : 2);
  const shown = lang === 'fr' ? value.replace('.', ',') : value;
  return `${shown} ${lang === 'fr' ? 'MAD' : 'درهم'}`;
}
