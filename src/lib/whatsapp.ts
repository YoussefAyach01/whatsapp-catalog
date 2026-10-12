import { formatMAD, type Lang } from './money.ts';

/**
 * Normalise a Moroccan phone number to WhatsApp's international digits (212XXXXXXXXX).
 * Accepts "0612345678", "+212 6 12 34 56 78", "00212612345678". Returns null if it does not look valid.
 */
export function normalizeMoroccanPhone(input: string): string | null {
  let d = input.replace(/[\s.\-()]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (!/^\d+$/.test(d)) return null;
  if (d.startsWith('00212')) d = d.slice(2);
  else if (d.startsWith('0')) d = '212' + d.slice(1);
  return /^212[5-9]\d{8}$/.test(d) ? d : null;
}

export interface OrderLine {
  name: string;
  qty: number;
  unitCents: number;
}

export interface OrderInput {
  shopName: string;
  lines: OrderLine[];
  customerName?: string;
  note?: string;
  lang: Lang;
}

const T = {
  fr: { hello: 'Bonjour', order: 'Commande', name: 'Nom', note: 'Remarque', total: 'Total' },
  ar: { hello: 'السلام عليكم', order: 'طلب', name: 'الاسم', note: 'ملاحظة', total: 'المجموع' },
} as const;

export function orderTotalCents(lines: OrderLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty * l.unitCents, 0);
}

/** Strip control characters and cap the length of anything a customer typed. */
function clean(text: string | undefined, max: number): string {
  return (text ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max);
}

export function buildOrderMessage(o: OrderInput): string {
  const tr = T[o.lang];
  const lines = o.lines
    .filter((l) => l.qty > 0)
    .map((l) => `${l.qty} x ${clean(l.name, 80)} - ${formatMAD(l.qty * l.unitCents, o.lang)}`);
  const parts = [`${tr.hello} ${clean(o.shopName, 80)},`, `${tr.order}:`, ...lines];
  const name = clean(o.customerName, 60);
  if (name) parts.push(`${tr.name}: ${name}`);
  const note = clean(o.note, 200);
  if (note) parts.push(`${tr.note}: ${note}`);
  parts.push(`${tr.total}: ${formatMAD(orderTotalCents(o.lines.filter((l) => l.qty > 0)), o.lang)}`);
  return parts.join('\n');
}

export function waUrl(whatsappDigits: string, message: string): string {
  return `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(message)}`;
}
