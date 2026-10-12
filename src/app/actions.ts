'use server';

import { redirect } from 'next/navigation';
import { logIn, signUp } from '@/lib/accounts';
import { getDb } from '@/lib/db';
import { MAX_IMAGE_BYTES, sniffImage } from '@/lib/image';
import { rateLimit } from '@/lib/rate-limit';
import * as repo from '@/lib/repo';
import { categorySchema, idSchema, productSchema, settingsSchema } from '@/lib/schemas';
import { clearSession, clientIp, requireOwner, setSession } from '@/lib/session';

const str = (fd: FormData, key: string): string => {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
};

const HOUR = 3_600_000;

/**
 * Reads an optional `photo` file field and returns a data: URL, or null if the field was removed
 * (checkbox `remove_photo=1`), or undefined to leave the existing photo untouched.
 * Returns the special value 'invalid' when a file was provided but fails the size/type check.
 */
async function readPhoto(fd: FormData): Promise<string | null | undefined | 'invalid'> {
  if (str(fd, 'remove_photo') === '1') return null;
  const file = fd.get('photo');
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (file.size > MAX_IMAGE_BYTES) return 'invalid';
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) return 'invalid';
  return `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
}

export async function signupAction(fd: FormData): Promise<void> {
  const ip = await clientIp();
  if (!rateLimit(`signup:${ip}`, 5, HOUR).ok) redirect('/signup?error=rate');
  const result = signUp(getDb(), {
    email: str(fd, 'email'),
    password: str(fd, 'password'),
    shopName: str(fd, 'shopName'),
    whatsapp: str(fd, 'whatsapp'),
  });
  if (!result.ok) {
    const code = result.error === 'invalid_input' ? `invalid_${result.field ?? ''}` : result.error;
    redirect(`/signup?error=${encodeURIComponent(code)}`);
  }
  await setSession(result.userId);
  redirect('/dashboard?msg=welcome');
}

export async function loginAction(fd: FormData): Promise<void> {
  const ip = await clientIp();
  const email = str(fd, 'email').trim().toLowerCase().slice(0, 200);
  if (!rateLimit(`login-ip:${ip}`, 20, 15 * 60_000).ok || !rateLimit(`login:${email}`, 5, 15 * 60_000).ok) {
    redirect('/login?error=rate');
  }
  const result = logIn(getDb(), { email, password: str(fd, 'password') });
  if (!result.ok) redirect('/login?error=invalid_credentials');
  await setSession(result.userId);
  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect('/');
}

export async function saveSettingsAction(fd: FormData): Promise<void> {
  const { shop } = await requireOwner();
  const parsed = settingsSchema.safeParse({
    name: str(fd, 'name'),
    whatsapp: str(fd, 'whatsapp'),
    accent: str(fd, 'accent'),
  });
  if (!parsed.success) redirect('/dashboard?error=invalid_settings#reglages');
  repo.updateShop(getDb(), shop.id, parsed.data);
  redirect('/dashboard?msg=settings_saved');
}

export async function addCategoryAction(fd: FormData): Promise<void> {
  const { shop } = await requireOwner();
  const parsed = categorySchema.safeParse({ name: str(fd, 'name'), name_ar: str(fd, 'name_ar') });
  if (!parsed.success) redirect('/dashboard?error=invalid_category');
  repo.addCategory(getDb(), shop.id, parsed.data);
  redirect('/dashboard?msg=category_added');
}

export async function deleteCategoryAction(fd: FormData): Promise<void> {
  const { shop } = await requireOwner();
  const id = idSchema.safeParse(fd.get('id'));
  if (id.success) repo.deleteCategory(getDb(), shop.id, id.data);
  redirect('/dashboard?msg=category_deleted');
}

export async function addProductAction(fd: FormData): Promise<void> {
  const { shop } = await requireOwner();
  const categoryId = idSchema.safeParse(fd.get('category_id'));
  const parsed = productSchema.safeParse({
    name: str(fd, 'name'),
    name_ar: str(fd, 'name_ar'),
    description: str(fd, 'description'),
    description_ar: str(fd, 'description_ar'),
    price_cents: str(fd, 'price'),
  });
  if (!categoryId.success || !parsed.success) redirect('/dashboard?error=invalid_product');
  const photo = await readPhoto(fd);
  if (photo === 'invalid') redirect('/dashboard?error=invalid_photo');
  const result = repo.addProduct(getDb(), shop, categoryId.data, { ...parsed.data, photo: photo ?? null });
  if (!result.ok) redirect(`/dashboard?error=${result.error}`);
  redirect('/dashboard?msg=product_added');
}

export async function updateProductAction(fd: FormData): Promise<void> {
  const { shop } = await requireOwner();
  const id = idSchema.safeParse(fd.get('id'));
  const parsed = productSchema.safeParse({
    name: str(fd, 'name'),
    name_ar: str(fd, 'name_ar'),
    description: str(fd, 'description'),
    description_ar: str(fd, 'description_ar'),
    price_cents: str(fd, 'price'),
  });
  if (!id.success || !parsed.success) redirect('/dashboard?error=invalid_product');
  const photo = await readPhoto(fd);
  if (photo === 'invalid') redirect('/dashboard?error=invalid_photo');
  repo.updateProduct(getDb(), shop.id, id.data, { ...parsed.data, photo });
  redirect('/dashboard?msg=product_saved');
}

export async function toggleProductAction(fd: FormData): Promise<void> {
  const { shop } = await requireOwner();
  const id = idSchema.safeParse(fd.get('id'));
  if (id.success) repo.setProductAvailable(getDb(), shop.id, id.data, str(fd, 'available') === '1');
  redirect('/dashboard');
}

export async function deleteProductAction(fd: FormData): Promise<void> {
  const { shop } = await requireOwner();
  const id = idSchema.safeParse(fd.get('id'));
  if (id.success) repo.deleteProduct(getDb(), shop.id, id.data);
  redirect('/dashboard?msg=product_deleted');
}
