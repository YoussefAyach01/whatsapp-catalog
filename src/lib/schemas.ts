import { z } from 'zod';
import { isAccent } from './palette.ts';
import { parsePriceToCents } from './money.ts';
import { normalizeMoroccanPhone } from './whatsapp.ts';

const text = (max: number) => z.string().trim().max(max);

export const whatsappField = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizeMoroccanPhone(v);
    if (!n) ctx.addIssue({ code: 'custom', message: 'invalid_phone' });
    return n ?? '';
  });

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().max(200).pipe(z.email()),
  password: z.string().min(10, 'password_short').max(200),
  shopName: text(80).min(2),
  whatsapp: whatsappField,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(200),
  password: z.string().min(1).max(200),
});

export const settingsSchema = z.object({
  name: text(80).min(2),
  whatsapp: whatsappField,
  accent: z.string().refine(isAccent, 'invalid_accent'),
});

export const categorySchema = z.object({
  name: text(60).min(1),
  name_ar: text(60).default(''),
});

const price = z.string().transform((v, ctx) => {
  const cents = parsePriceToCents(v);
  if (cents === null) ctx.addIssue({ code: 'custom', message: 'invalid_price' });
  return cents ?? 0;
});

export const productSchema = z.object({
  name: text(80).min(1),
  name_ar: text(80).default(''),
  description: text(300).default(''),
  description_ar: text(300).default(''),
  price_cents: price,
});

export const idSchema = z.coerce.number().int().positive();
