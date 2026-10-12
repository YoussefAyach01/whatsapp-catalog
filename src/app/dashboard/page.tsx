import Link from 'next/link';
import {
  addCategoryAction,
  addProductAction,
  deleteCategoryAction,
  deleteProductAction,
  logoutAction,
  saveSettingsAction,
  toggleProductAction,
  updateProductAction,
} from '@/app/actions';
import { getDb } from '@/lib/db';
import { ERRORS, MESSAGES, pick } from '@/lib/messages';
import { formatMAD } from '@/lib/money';
import { ACCENTS } from '@/lib/palette';
import { countProducts, getCatalog, PLAN_PRODUCT_LIMIT, type Product } from '@/lib/repo';
import { requireOwner } from '@/lib/session';

export const metadata = { title: 'Tableau de bord' };
export const dynamic = 'force-dynamic';

const priceValue = (cents: number) => (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2).replace('.', ',');

function ProductFields({ product }: { product?: Product }) {
  const id = product ? `i${product.id}` : 'new';
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor={`${id}-name`}>
          Nom du produit
        </label>
        <input
          className="field"
          id={`${id}-name`}
          name="name"
          required
          maxLength={80}
          defaultValue={product?.name}
        />
      </div>
      <div>
        <label className="label" htmlFor={`${id}-price`}>
          Prix (MAD)
        </label>
        <input
          className="field"
          id={`${id}-price`}
          name="price"
          required
          inputMode="decimal"
          placeholder="45"
          defaultValue={product ? priceValue(product.price_cents) : ''}
        />
      </div>
      <div>
        <label className="label" htmlFor={`${id}-name_ar`}>
          Nom en arabe (facultatif)
        </label>
        <input
          className="field"
          dir="rtl"
          id={`${id}-name_ar`}
          name="name_ar"
          maxLength={80}
          defaultValue={product?.name_ar}
        />
      </div>
      <div>
        <label className="label" htmlFor={`${id}-desc`}>
          Description (facultatif)
        </label>
        <input
          className="field"
          id={`${id}-desc`}
          name="description"
          maxLength={300}
          defaultValue={product?.description}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor={`${id}-desc_ar`}>
          Description en arabe (facultatif)
        </label>
        <input
          className="field"
          dir="rtl"
          id={`${id}-desc_ar`}
          name="description_ar"
          maxLength={300}
          defaultValue={product?.description_ar}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor={`${id}-photo`}>
          Photo (JPEG/PNG/WebP, 300 Ko maximum)
        </label>
        {product?.photo && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={product.photo}
            alt=""
            width={64}
            height={64}
            className="mb-2 size-16 rounded-lg border border-line object-cover"
          />
        )}
        <input
          className="field"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          id={`${id}-photo`}
          name="photo"
        />
        {product?.photo && (
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="remove_photo" value="1" />
            Supprimer la photo actuelle
          </label>
        )}
      </div>
    </div>
  );
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { shop } = await requireOwner();
  const { msg, error } = await searchParams;
  const db = getDb();
  const catalog = getCatalog(db, shop.id, { onlyAvailable: false });
  const used = countProducts(db, shop.id);
  const limit = PLAN_PRODUCT_LIMIT[shop.plan];
  const catalogPath = `/c/${shop.slug}`;
  const flash = pick(MESSAGES, msg);
  const problem = pick(ERRORS, error);
  const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);

  return (
    <div style={{ ['--accent' as string]: shop.accent }}>
      <header className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div>
          <p className="font-display text-2xl font-bold">{shop.name}</p>
          <p className="text-sm text-muted">
            Offre {shop.plan === 'pro' ? 'Pro' : 'Gratuite'} · {used}/{Number.isFinite(limit) ? limit : '∞'}{' '}
            produits
          </p>
        </div>
        <form action={logoutAction}>
          <button className="btn" type="submit">
            Se déconnecter
          </button>
        </form>
      </header>

      <main className="mx-auto grid max-w-4xl gap-6 px-4 pb-16">
        {flash && (
          <p role="status" className="rounded-lg border border-green-800 bg-green-50 p-3 text-green-900">
            {flash}
          </p>
        )}
        {problem && (
          <p role="alert" className="rounded-lg border border-red-700 bg-red-50 p-3 text-red-900">
            {problem}
          </p>
        )}

        <section className="card grid gap-4 sm:grid-cols-[auto_1fr]" aria-labelledby="share">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/qr/${shop.slug}`}
            alt={`QR code du catalogue de ${shop.name}`}
            width={160}
            height={160}
            className="size-40 rounded-lg border border-line"
          />
          <div>
            <h2 id="share" className="font-display text-2xl font-bold">
              Votre catalogue en ligne
            </h2>
            <p className="mt-1 break-all">
              <Link className="underline" style={{ color: 'var(--accent)' }} href={catalogPath}>
                {catalogPath}
              </Link>
            </p>
            <p className="mt-3 flex flex-wrap gap-2">
              <Link className="btn btn-solid" href={catalogPath}>
                Voir mon catalogue
              </Link>
            </p>
          </div>
        </section>

        <section aria-labelledby="catalog-h" className="grid gap-4">
          <h2 id="catalog-h" className="font-display text-2xl font-bold">
            Mon catalogue
          </h2>

          {catalog.length === 0 && (
            <p className="card text-muted">
              Aucune catégorie pour l’instant. Ajoutez-en une ci-dessous (Alimentation, Cosmétique…).
            </p>
          )}

          {catalog.map((c) => (
            <article key={c.id} className="card" aria-labelledby={`cat-${c.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id={`cat-${c.id}`} className="text-xl font-bold">
                  {c.name}
                  {c.name_ar && (
                    <span dir="rtl" lang="ar" className="ms-3 text-muted">
                      {c.name_ar}
                    </span>
                  )}
                </h3>
                <form action={deleteCategoryAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    className="btn btn-danger"
                    type="submit"
                    aria-label={`Supprimer la catégorie ${c.name} et ses produits`}
                  >
                    Supprimer
                  </button>
                </form>
              </div>

              <ul className="mt-3 divide-y divide-line">
                {c.products.map((p) => (
                  <li key={p.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className={p.available ? '' : 'text-muted line-through'}>
                        <span className="font-semibold">{p.name}</span> · {formatMAD(p.price_cents)}
                        {!p.available && <span className="ms-2 no-underline">(indisponible)</span>}
                      </p>
                      <div className="flex gap-2">
                        <form action={toggleProductAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="available" value={p.available ? '0' : '1'} />
                          <button
                            className="btn"
                            type="submit"
                            aria-label={`${p.available ? 'Marquer indisponible' : 'Remettre en vente'} : ${p.name}`}
                          >
                            {p.available ? 'Indisponible' : 'Disponible'}
                          </button>
                        </form>
                        <form action={deleteProductAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="btn btn-danger" type="submit" aria-label={`Supprimer ${p.name}`}>
                            Supprimer
                          </button>
                        </form>
                      </div>
                    </div>
                    <details className="mt-2">
                      <summary
                        className="min-h-11 cursor-pointer py-2 font-semibold"
                        style={{ color: 'var(--accent)' }}
                      >
                        Modifier {p.name}
                      </summary>
                      <form
                        action={updateProductAction}
                        className="mt-2 grid gap-3"
                        encType="multipart/form-data"
                      >
                        <input type="hidden" name="id" value={p.id} />
                        <ProductFields product={p} />
                        <button className="btn btn-solid justify-self-start" type="submit">
                          Enregistrer
                        </button>
                      </form>
                    </details>
                  </li>
                ))}
              </ul>

              <details className="mt-3 rounded-lg border border-dashed border-line p-3">
                <summary
                  className="min-h-11 cursor-pointer py-2 font-semibold"
                  style={{ color: 'var(--accent)' }}
                >
                  Ajouter un produit à « {c.name} »
                </summary>
                <form action={addProductAction} className="mt-2 grid gap-3" encType="multipart/form-data">
                  <input type="hidden" name="category_id" value={c.id} />
                  <ProductFields />
                  <button className="btn btn-solid justify-self-start" type="submit">
                    Ajouter le produit
                  </button>
                </form>
              </details>
            </article>
          ))}

          <form
            action={addCategoryAction}
            className="card grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <div>
              <label className="label" htmlFor="cat-name">
                Nouvelle catégorie
              </label>
              <input
                className="field"
                id="cat-name"
                name="name"
                required
                maxLength={60}
                placeholder="Alimentation"
              />
            </div>
            <div>
              <label className="label" htmlFor="cat-name-ar">
                En arabe (facultatif)
              </label>
              <input className="field" dir="rtl" id="cat-name-ar" name="name_ar" maxLength={60} />
            </div>
            <button className="btn btn-solid" type="submit">
              Ajouter
            </button>
          </form>
        </section>

        <section id="reglages" className="card" aria-labelledby="settings-h">
          <h2 id="settings-h" className="font-display text-2xl font-bold">
            Réglages
          </h2>
          <form action={saveSettingsAction} className="mt-3 grid gap-4">
            <div>
              <label className="label" htmlFor="s-name">
                Nom de la boutique
              </label>
              <input
                className="field"
                id="s-name"
                name="name"
                required
                maxLength={80}
                defaultValue={shop.name}
              />
            </div>
            <div>
              <label className="label" htmlFor="s-wa">
                Numéro WhatsApp des commandes
              </label>
              <input
                className="field"
                id="s-wa"
                name="whatsapp"
                required
                inputMode="tel"
                defaultValue={`+${shop.whatsapp}`}
              />
            </div>
            <fieldset>
              <legend className="label">Couleur du catalogue</legend>
              <div className="flex flex-wrap gap-3">
                {ACCENTS.map((a) => (
                  <label
                    key={a.id}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-3"
                  >
                    <input type="radio" name="accent" value={a.hex} defaultChecked={a.hex === shop.accent} />
                    <span aria-hidden="true" className="size-5 rounded-full" style={{ background: a.hex }} />
                    {a.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="btn btn-solid justify-self-start" type="submit">
              Enregistrer les réglages
            </button>
          </form>
        </section>

        <section className="card" aria-labelledby="plan-h">
          <h2 id="plan-h" className="font-display text-2xl font-bold">
            Offre
          </h2>
          {shop.plan === 'pro' ? (
            <p className="mt-2">Vous êtes sur l’offre Pro : produits illimités.</p>
          ) : stripeReady ? (
            <p className="mt-2 text-muted">
              Le paiement en ligne est configuré côté serveur mais n’est pas encore relié à ce bouton.
            </p>
          ) : (
            <p className="mt-2 text-muted">
              Offre gratuite : 30 produits. Le paiement en ligne n’est pas configuré sur ce serveur. Pour
              passer à Pro (99 MAD par mois), contactez l’assistance.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
