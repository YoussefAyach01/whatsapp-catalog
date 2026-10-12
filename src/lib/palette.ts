/** Accent colours an owner can pick. Every one has >= 4.5:1 contrast with white text (checked in tests). */
export const ACCENTS = [
  { id: 'teal', hex: '#0f766e', label: 'Sarcelle' },
  { id: 'green', hex: '#166534', label: 'Vert' },
  { id: 'blue', hex: '#1d4ed8', label: 'Bleu' },
  { id: 'indigo', hex: '#4338ca', label: 'Indigo' },
  { id: 'plum', hex: '#86198f', label: 'Prune' },
  { id: 'red', hex: '#b91c1c', label: 'Rouge' },
  { id: 'orange', hex: '#a3410c', label: 'Rouille' },
  { id: 'slate', hex: '#334155', label: 'Ardoise' },
] as const;

export const DEFAULT_ACCENT = ACCENTS[0].hex;

export function isAccent(hex: string): boolean {
  return ACCENTS.some((a) => a.hex === hex);
}
