import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { getCatalog, getShopBySlug } from '@/lib/repo';
import { isAccent } from '@/lib/palette';
import type { Lang } from '@/lib/money';
import { CatalogView, type ViewCategory } from './catalog-view';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = getShopBySlug(getDb(), slug);
  return s ? { title: `${s.name} · Catalogue`, robots: { index: true } } : {};
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lang: langParam } = await searchParams;
  const db = getDb();
  const shop = getShopBySlug(db, slug);
  if (!shop) notFound();

  const lang: Lang = langParam === 'ar' ? 'ar' : 'fr';
  // Prefer the Arabic text when reading in Arabic and the owner provided one; otherwise fall back to French.
  const pickText = (fr: string, ar: string) => (lang === 'ar' && ar ? ar : fr);

  const categories: ViewCategory[] = getCatalog(db, shop.id, { onlyAvailable: true }).map((c) => ({
    id: c.id,
    name: pickText(c.name, c.name_ar),
    products: c.products.map((p) => ({
      id: p.id,
      name: pickText(p.name, p.name_ar),
      description: pickText(p.description, p.description_ar),
      priceCents: p.price_cents,
      photo: p.photo,
    })),
  }));

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      lang={lang}
      style={{ ['--accent' as string]: isAccent(shop.accent) ? shop.accent : '#0f766e' }}
    >
      <CatalogView
        shopName={shop.name}
        whatsapp={shop.whatsapp}
        categories={categories}
        lang={lang}
        otherLangHref={`/c/${encodeURIComponent(slug)}?lang=${lang === 'ar' ? 'fr' : 'ar'}`}
      />
    </div>
  );
}
