// Creates a demo shop (slug "demo") so the landing page's demo link works.
// Usage: npm run seed   (login: demo@example.com / demo-password-1)
import { openDb } from '../src/lib/db.ts';
import { signUp } from '../src/lib/accounts.ts';
import { addCategory, addProduct, getShopBySlug } from '../src/lib/repo.ts';

const db = openDb(process.env.DATABASE_PATH ?? './data/whatsapp-catalog.db');
if (getShopBySlug(db, 'demo')) {
  console.log('Demo already exists, nothing to do.');
} else {
  const r = signUp(db, {
    email: 'demo@example.com',
    password: 'demo-password-1',
    shopName: 'Demo',
    whatsapp: '0612345678',
  });
  if (!r.ok) throw new Error(`seed failed: ${r.error}`);
  const shop = getShopBySlug(db, 'demo');
  if (!shop) throw new Error('seed failed');
  db.prepare("UPDATE shops SET name = 'Dar Zaytoun (démo)' WHERE id = ?").run(shop.id);
  const epicerie = addCategory(db, shop.id, { name: 'Épicerie fine', name_ar: 'بقالة' });
  const cosmetique = addCategory(db, shop.id, { name: 'Cosmétique', name_ar: 'تجميل' });
  const product = (name: string, name_ar: string, description: string, price: number) => ({
    name,
    name_ar,
    description,
    description_ar: '',
    price_cents: price * 100,
  });
  for (const p of [
    product('Huile d’olive extra vierge 1L', 'زيت الزيتون 1 لتر', 'Première pression à froid', 90),
    product('Miel de thym 500g', 'عسل الزعتر 500غ', 'Récolte artisanale du Moyen Atlas', 120),
  ])
    addProduct(db, shop, epicerie, p);
  for (const p of [
    product('Savon noir au gant kessa', 'الصابون البلدي', 'Prêt pour le hammam', 35),
    product('Huile d’argan cosmétique 100ml', 'زيت الأركان', 'Pressée à froid, non raffinée', 150),
  ])
    addProduct(db, shop, cosmetique, p);
  console.log('Demo created: /c/demo');
}
