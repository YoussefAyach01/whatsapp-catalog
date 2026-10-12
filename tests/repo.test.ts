import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type DB } from '../src/lib/db.ts';
import { logIn, signUp } from '../src/lib/accounts.ts';
import * as repo from '../src/lib/repo.ts';

let db: DB;
beforeEach(() => {
  db = openDb(':memory:');
});

const signup = (email: string, name = 'Dar Zaytoun') =>
  signUp(db, { email, password: 'a-long-password', shopName: name, whatsapp: '0612345678' });

function owner(email: string, name?: string) {
  const r = signup(email, name);
  if (!r.ok) throw new Error(r.error);
  const shop = repo.getShopByOwner(db, r.userId);
  if (!shop) throw new Error('no shop');
  return shop;
}

const product = (name: string, price = 1000) => ({
  name,
  name_ar: '',
  description: '',
  description_ar: '',
  price_cents: price,
});

describe('signup and login', () => {
  it('creates a user with a shop, a slug and a normalised WhatsApp number', () => {
    const r = owner('A@Example.com', 'Épicerie Dar Zaytoun');
    expect(r.slug).toBe('epicerie-dar-zaytoun');
    expect(r.whatsapp).toBe('212612345678');
    expect(r.plan).toBe('free');
  });

  it('gives a second shop with the same name a different slug', () => {
    owner('a@x.com');
    expect(owner('b@x.com').slug).toBe('dar-zaytoun-2');
  });

  it('rejects a duplicate email, case-insensitively', () => {
    owner('a@x.com');
    expect(signup('A@X.com')).toEqual({ ok: false, error: 'email_taken' });
  });

  it.each([
    [{ email: 'nope', password: 'a-long-password', shopName: 'X Y', whatsapp: '0612345678' }, 'email'],
    [{ email: 'a@x.com', password: 'short', shopName: 'X Y', whatsapp: '0612345678' }, 'password'],
    [{ email: 'a@x.com', password: 'a-long-password', shopName: 'X Y', whatsapp: '123' }, 'whatsapp'],
    [{ email: 'a@x.com', password: 'a-long-password', shopName: '', whatsapp: '0612345678' }, 'shopName'],
  ])('rejects invalid signup %#', (input, field) => {
    expect(signUp(db, input)).toEqual({ ok: false, error: 'invalid_input', field });
  });

  it('logs in with the right password and uses one error for unknown user and wrong password', () => {
    owner('a@x.com');
    expect(logIn(db, { email: 'A@x.com', password: 'a-long-password' }).ok).toBe(true);
    const wrong = logIn(db, { email: 'a@x.com', password: 'nope-nope-nope' });
    const unknown = logIn(db, { email: 'ghost@x.com', password: 'a-long-password' });
    expect(wrong).toEqual({ ok: false, error: 'invalid_credentials' });
    expect(unknown).toEqual(wrong);
  });

  it('never stores the plaintext password', () => {
    owner('a@x.com');
    const u = repo.findUserByEmail(db, 'a@x.com');
    expect(u?.password_hash.startsWith('scrypt$')).toBe(true);
    expect(u?.password_hash).not.toContain('a-long-password');
  });
});

describe('catalog', () => {
  it('shows customers only available products and hides empty categories', () => {
    const r = owner('a@x.com');
    const starters = repo.addCategory(db, r.id, { name: 'Épicerie', name_ar: '' });
    const empty = repo.addCategory(db, r.id, { name: 'Vide', name_ar: '' });
    const a = repo.addProduct(db, r, starters, product('Huile'));
    const b = repo.addProduct(db, r, starters, product('Miel'));
    if (!a.ok || !b.ok) throw new Error('add failed');
    repo.setProductAvailable(db, r.id, b.value.id, false);

    const customer = repo.getCatalog(db, r.id, { onlyAvailable: true });
    expect(customer.map((c) => c.name)).toEqual(['Épicerie']);
    expect(customer[0]?.products.map((p) => p.name)).toEqual(['Huile']);
    const owned = repo.getCatalog(db, r.id, { onlyAvailable: false });
    expect(owned.map((c) => c.id)).toEqual([starters, empty]);
    expect(owned[0]?.products).toHaveLength(2);
  });

  it('keeps insertion order via position', () => {
    const r = owner('a@x.com');
    const c = repo.addCategory(db, r.id, { name: 'C', name_ar: '' });
    for (const n of ['1', '2', '3']) repo.addProduct(db, r, c, product(n));
    expect(repo.getCatalog(db, r.id, { onlyAvailable: false })[0]?.products.map((p) => p.name)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });

  it('enforces the free plan product limit but not the pro plan', () => {
    const r = owner('a@x.com');
    const c = repo.addCategory(db, r.id, { name: 'C', name_ar: '' });
    for (let i = 0; i < repo.PLAN_PRODUCT_LIMIT.free; i++)
      expect(repo.addProduct(db, r, c, product(`i${i}`)).ok).toBe(true);
    expect(repo.addProduct(db, r, c, product('one too many'))).toEqual({ ok: false, error: 'plan_limit' });
    expect(repo.addProduct(db, { id: r.id, plan: 'pro' }, c, product('fine on pro')).ok).toBe(true);
  });

  it('deleting a category deletes its products', () => {
    const r = owner('a@x.com');
    const c = repo.addCategory(db, r.id, { name: 'C', name_ar: '' });
    repo.addProduct(db, r, c, product('x'));
    expect(repo.deleteCategory(db, r.id, c)).toBe(true);
    expect(repo.countProducts(db, r.id)).toBe(0);
  });

  it('a photo can be added, kept on update, and explicitly removed', () => {
    const r = owner('a@x.com');
    const c = repo.addCategory(db, r.id, { name: 'C', name_ar: '' });
    const added = repo.addProduct(db, r, c, { ...product('Savon'), photo: 'data:image/png;base64,AAA' });
    if (!added.ok) throw new Error('add failed');
    let p = repo.getCatalog(db, r.id, { onlyAvailable: false })[0]?.products[0];
    expect(p?.photo).toBe('data:image/png;base64,AAA');

    repo.updateProduct(db, r.id, added.value.id, product('Savon noir')); // photo omitted -> kept
    p = repo.getCatalog(db, r.id, { onlyAvailable: false })[0]?.products[0];
    expect(p?.photo).toBe('data:image/png;base64,AAA');

    repo.updateProduct(db, r.id, added.value.id, { ...product('Savon noir'), photo: null }); // removed
    p = repo.getCatalog(db, r.id, { onlyAvailable: false })[0]?.products[0];
    expect(p?.photo).toBeNull();
  });
});

describe('ownership (IDOR)', () => {
  it("one owner cannot edit, hide, delete or add into another owner's catalog", () => {
    const mine = owner('a@x.com', 'Mine');
    const theirs = owner('b@x.com', 'Theirs');
    const theirCat = repo.addCategory(db, theirs.id, { name: 'T', name_ar: '' });
    const added = repo.addProduct(db, theirs, theirCat, product('Secret'));
    if (!added.ok) throw new Error('setup');
    const id = added.value.id;

    expect(repo.updateProduct(db, mine.id, id, product('Hacked'))).toBe(false);
    expect(repo.setProductAvailable(db, mine.id, id, false)).toBe(false);
    expect(repo.deleteProduct(db, mine.id, id)).toBe(false);
    expect(repo.deleteCategory(db, mine.id, theirCat)).toBe(false);
    expect(repo.addProduct(db, mine, theirCat, product('Injected'))).toEqual({
      ok: false,
      error: 'category_not_found',
    });

    const still = repo.getCatalog(db, theirs.id, { onlyAvailable: true });
    expect(still[0]?.products.map((p) => [p.name, p.available])).toEqual([['Secret', 1]]);
  });

  it('is safe against SQL injection in text fields', () => {
    const r = owner('a@x.com');
    const c = repo.addCategory(db, r.id, { name: "x'); DROP TABLE products;--", name_ar: '' });
    expect(repo.addProduct(db, r, c, product("'; DELETE FROM users;--")).ok).toBe(true);
    expect(repo.findUserByEmail(db, 'a@x.com')).toBeTruthy();
  });
});
