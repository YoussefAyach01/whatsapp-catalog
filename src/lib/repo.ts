import type { DB } from './db.ts';
import { slugify, uniqueSlug } from './slug.ts';

export const PLAN_PRODUCT_LIMIT = { free: 30, pro: Number.POSITIVE_INFINITY } as const;

export interface User {
  id: number;
  email: string;
  password_hash: string;
}

export interface Shop {
  id: number;
  owner_id: number;
  slug: string;
  name: string;
  whatsapp: string;
  accent: string;
  plan: 'free' | 'pro';
}

export interface Category {
  id: number;
  shop_id: number;
  name: string;
  name_ar: string;
  position: number;
}

export interface Product {
  id: number;
  shop_id: number;
  category_id: number;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price_cents: number;
  photo: string | null;
  available: number;
  position: number;
}

export interface CatalogCategory extends Category {
  products: Product[];
}

export type ProductInput = Pick<
  Product,
  'name' | 'name_ar' | 'description' | 'description_ar' | 'price_cents'
> & { photo?: string | null };
export type Result<T = undefined> =
  ({ ok: true } & (T extends undefined ? object : { value: T })) | { ok: false; error: string };

// node:sqlite returns loosely typed rows; the SELECTs below always return exactly these columns.
const one = <T>(row: unknown): T | undefined => (row ?? undefined) as T | undefined;
const many = <T>(rows: unknown): T[] => rows as T[];

export function createOwner(
  db: DB,
  input: { email: string; passwordHash: string; shopName: string; whatsapp: string; accent: string },
): Result<{ userId: number; shopId: number; slug: string }> {
  if (findUserByEmail(db, input.email)) return { ok: false, error: 'email_taken' };
  db.exec('BEGIN');
  try {
    const user = db
      .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
      .run(input.email.trim().toLowerCase(), input.passwordHash);
    const userId = Number(user.lastInsertRowid);
    const slug = uniqueSlug(slugify(input.shopName), (s) => !!getShopBySlug(db, s));
    const r = db
      .prepare('INSERT INTO shops (owner_id, slug, name, whatsapp, accent) VALUES (?, ?, ?, ?, ?)')
      .run(userId, slug, input.shopName, input.whatsapp, input.accent);
    db.exec('COMMIT');
    return { ok: true, value: { userId, shopId: Number(r.lastInsertRowid), slug } };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function findUserByEmail(db: DB, email: string): User | undefined {
  return one<User>(
    db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email.trim()),
  );
}

export function findUserById(db: DB, id: number): User | undefined {
  return one<User>(db.prepare('SELECT id, email, password_hash FROM users WHERE id = ?').get(id));
}

export function getShopByOwner(db: DB, ownerId: number): Shop | undefined {
  return one<Shop>(db.prepare('SELECT * FROM shops WHERE owner_id = ?').get(ownerId));
}

export function getShopBySlug(db: DB, slug: string): Shop | undefined {
  return one<Shop>(db.prepare('SELECT * FROM shops WHERE slug = ?').get(slug));
}

export function updateShop(
  db: DB,
  shopId: number,
  data: { name: string; whatsapp: string; accent: string },
): void {
  db.prepare('UPDATE shops SET name = ?, whatsapp = ?, accent = ? WHERE id = ?').run(
    data.name,
    data.whatsapp,
    data.accent,
    shopId,
  );
}

/** Full catalog in display order. Customers get only available products and no empty categories. */
export function getCatalog(db: DB, shopId: number, opts: { onlyAvailable: boolean }): CatalogCategory[] {
  const categories = many<Category>(
    db.prepare('SELECT * FROM categories WHERE shop_id = ? ORDER BY position, id').all(shopId),
  );
  const products = many<Product>(
    db
      .prepare(
        `SELECT * FROM products WHERE shop_id = ? ${opts.onlyAvailable ? 'AND available = 1' : ''} ORDER BY position, id`,
      )
      .all(shopId),
  );
  const catalog = categories.map((c) => ({ ...c, products: products.filter((p) => p.category_id === c.id) }));
  return opts.onlyAvailable ? catalog.filter((c) => c.products.length > 0) : catalog;
}

export function countProducts(db: DB, shopId: number): number {
  const row = one<{ n: number }>(
    db.prepare('SELECT COUNT(*) AS n FROM products WHERE shop_id = ?').get(shopId),
  );
  return row?.n ?? 0;
}

export function addCategory(db: DB, shopId: number, data: { name: string; name_ar: string }): number {
  const next = one<{ p: number }>(
    db.prepare('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM categories WHERE shop_id = ?').get(shopId),
  );
  const r = db
    .prepare('INSERT INTO categories (shop_id, name, name_ar, position) VALUES (?, ?, ?, ?)')
    .run(shopId, data.name, data.name_ar, next?.p ?? 1);
  return Number(r.lastInsertRowid);
}

/** Every write below is scoped by shop_id so one owner can never touch another's rows (IDOR). */
export function deleteCategory(db: DB, shopId: number, categoryId: number): boolean {
  return (
    Number(
      db.prepare('DELETE FROM categories WHERE id = ? AND shop_id = ?').run(categoryId, shopId).changes,
    ) > 0
  );
}

export function addProduct(
  db: DB,
  shop: Pick<Shop, 'id' | 'plan'>,
  categoryId: number,
  data: ProductInput,
): Result<{ id: number }> {
  const category = one<Category>(
    db.prepare('SELECT * FROM categories WHERE id = ? AND shop_id = ?').get(categoryId, shop.id),
  );
  if (!category) return { ok: false, error: 'category_not_found' };
  if (countProducts(db, shop.id) >= PLAN_PRODUCT_LIMIT[shop.plan]) return { ok: false, error: 'plan_limit' };
  const next = one<{ p: number }>(
    db
      .prepare('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM products WHERE category_id = ?')
      .get(categoryId),
  );
  const r = db
    .prepare(
      `INSERT INTO products (shop_id, category_id, name, name_ar, description, description_ar, price_cents, photo, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      shop.id,
      categoryId,
      data.name,
      data.name_ar,
      data.description,
      data.description_ar,
      data.price_cents,
      data.photo ?? null,
      next?.p ?? 1,
    );
  return { ok: true, value: { id: Number(r.lastInsertRowid) } };
}

/** When `data.photo` is undefined the existing photo is kept; pass null to remove it. */
export function updateProduct(db: DB, shopId: number, productId: number, data: ProductInput): boolean {
  if (data.photo === undefined) {
    const r = db
      .prepare(
        `UPDATE products SET name = ?, name_ar = ?, description = ?, description_ar = ?, price_cents = ?
         WHERE id = ? AND shop_id = ?`,
      )
      .run(
        data.name,
        data.name_ar,
        data.description,
        data.description_ar,
        data.price_cents,
        productId,
        shopId,
      );
    return Number(r.changes) > 0;
  }
  const r = db
    .prepare(
      `UPDATE products SET name = ?, name_ar = ?, description = ?, description_ar = ?, price_cents = ?, photo = ?
       WHERE id = ? AND shop_id = ?`,
    )
    .run(
      data.name,
      data.name_ar,
      data.description,
      data.description_ar,
      data.price_cents,
      data.photo,
      productId,
      shopId,
    );
  return Number(r.changes) > 0;
}

export function setProductAvailable(db: DB, shopId: number, productId: number, available: boolean): boolean {
  const r = db
    .prepare('UPDATE products SET available = ? WHERE id = ? AND shop_id = ?')
    .run(available ? 1 : 0, productId, shopId);
  return Number(r.changes) > 0;
}

export function deleteProduct(db: DB, shopId: number, productId: number): boolean {
  return (
    Number(db.prepare('DELETE FROM products WHERE id = ? AND shop_id = ?').run(productId, shopId).changes) > 0
  );
}
