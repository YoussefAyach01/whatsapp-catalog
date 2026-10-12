'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { formatMAD, type Lang } from '@/lib/money';
import { buildOrderMessage, orderTotalCents, waUrl } from '@/lib/whatsapp';

export interface ViewProduct {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  photo: string | null;
}
export interface ViewCategory {
  id: number;
  name: string;
  products: ViewProduct[];
}

const UI = {
  fr: {
    add: 'Ajouter',
    remove: 'Retirer',
    empty: 'Ce catalogue est en cours de préparation. Revenez bientôt.',
    view: 'Voir ma commande',
    order: 'Ma commande',
    close: 'Fermer',
    name: 'Votre nom (facultatif)',
    note: 'Remarque (couleur, taille…)',
    send: 'Envoyer sur WhatsApp',
    total: 'Total',
    none: 'Votre commande est vide.',
    categories: 'Catégories',
    lang: 'العربية',
    langLabel: 'Afficher le catalogue en arabe',
    hint: 'Vous confirmez votre commande dans WhatsApp, rien n’est envoyé avant.',
  },
  ar: {
    add: 'أضف',
    remove: 'أزل',
    empty: 'الكتالوج قيد الإعداد. عودوا قريباً.',
    view: 'عرض طلبي',
    order: 'طلبي',
    close: 'إغلاق',
    name: 'اسمك (اختياري)',
    note: 'ملاحظة (اللون، المقاس…)',
    send: 'إرسال عبر واتساب',
    total: 'المجموع',
    none: 'طلبك فارغ.',
    categories: 'الأصناف',
    lang: 'Français',
    langLabel: 'عرض الكتالوج بالفرنسية',
    hint: 'تؤكد طلبك داخل واتساب ولا يُرسل شيء قبل ذلك.',
  },
} as const;

export function CatalogView(props: {
  shopName: string;
  whatsapp: string;
  categories: ViewCategory[];
  lang: Lang;
  otherLangHref: string;
}) {
  const { lang } = props;
  const ui = UI[lang];
  const [cart, setCart] = useState<Record<number, number>>({});
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);

  const byId = new Map(props.categories.flatMap((c) => c.products).map((p) => [p.id, p]));
  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ product: byId.get(Number(id)), qty }))
    .filter((l): l is { product: ViewProduct; qty: number } => !!l.product && l.qty > 0)
    .map((l) => ({ name: l.product.name, qty: l.qty, unitCents: l.product.priceCents, id: l.product.id }));
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = orderTotalCents(lines);

  const change = (id: number, delta: number) =>
    setCart((c) => {
      const qty = Math.max(0, Math.min(50, (c[id] ?? 0) + delta));
      const next = { ...c };
      if (qty === 0) delete next[id];
      else next[id] = qty;
      return next;
    });

  const href = waUrl(
    props.whatsapp,
    buildOrderMessage({ shopName: props.shopName, lines, customerName, note, lang }),
  );

  return (
    <div className="mx-auto max-w-2xl pb-28">
      <header className="flex items-center justify-between gap-3 px-4 py-4">
        <h1 className="font-display text-2xl font-bold">{props.shopName}</h1>
        <Link
          href={props.otherLangHref}
          lang={lang === 'ar' ? 'fr' : 'ar'}
          aria-label={ui.langLabel}
          className="btn"
        >
          {ui.lang}
        </Link>
      </header>

      {props.categories.length === 0 ? (
        <p className="px-4 py-10 text-muted">{ui.empty}</p>
      ) : (
        <>
          <nav
            aria-label={ui.categories}
            className="sticky top-0 z-10 overflow-x-auto border-b border-line bg-paper px-4 py-2"
          >
            <ul className="flex gap-2 whitespace-nowrap">
              {props.categories.map((c) => (
                <li key={c.id}>
                  <a
                    href={`#cat-${c.id}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 font-semibold"
                  >
                    {c.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <main>
            {props.categories.map((c) => (
              <section
                key={c.id}
                id={`cat-${c.id}`}
                aria-labelledby={`h-${c.id}`}
                className="scroll-mt-16 px-4 pt-6"
              >
                <h2
                  id={`h-${c.id}`}
                  className="font-display text-2xl font-bold"
                  style={{ color: 'var(--accent)' }}
                >
                  {c.name}
                </h2>
                <ul className="mt-2 divide-y divide-line">
                  {c.products.map((p) => {
                    const qty = cart[p.id] ?? 0;
                    return (
                      <li key={p.id} className="flex items-start justify-between gap-3 py-3">
                        {p.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.photo}
                            alt=""
                            width={64}
                            height={64}
                            className="size-16 shrink-0 rounded-lg border border-line object-cover"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-xs text-muted"
                          >
                            {lang === 'ar' ? 'بلا صورة' : 'Sans photo'}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold">{p.name}</h3>
                          {p.description && <p className="text-sm text-muted">{p.description}</p>}
                          <p className="mt-1 font-bold tabular-nums">{formatMAD(p.priceCents, lang)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {qty > 0 && (
                            <>
                              <button
                                type="button"
                                className="btn size-11 !p-0"
                                aria-label={`${ui.remove}: ${p.name}`}
                                onClick={() => change(p.id, -1)}
                              >
                                −
                              </button>
                              <span className="w-6 text-center font-bold tabular-nums" aria-live="polite">
                                {qty}
                              </span>
                            </>
                          )}
                          <button
                            type="button"
                            className="btn btn-solid size-11 !p-0"
                            aria-label={`${ui.add}: ${p.name}`}
                            onClick={() => change(p.id, 1)}
                          >
                            +
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </main>
        </>
      )}

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white p-3">
          <button
            type="button"
            className="btn btn-solid mx-auto flex w-full max-w-2xl justify-between"
            onClick={() => dialog.current?.showModal()}
          >
            <span>
              {ui.view} ({count})
            </span>
            <span>{formatMAD(total, lang)}</span>
          </button>
        </div>
      )}

      <dialog
        ref={dialog}
        aria-labelledby="order-title"
        className="m-auto w-[min(32rem,calc(100vw-1.5rem))] rounded-2xl p-0 backdrop:bg-black/50"
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h2 id="order-title" className="font-display text-2xl font-bold">
              {ui.order}
            </h2>
            <button type="button" className="btn" onClick={() => dialog.current?.close()}>
              {ui.close}
            </button>
          </div>

          {lines.length === 0 ? (
            <p className="py-6 text-muted">{ui.none}</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {lines.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0 flex-1">{l.name}</span>
                  <button
                    type="button"
                    className="btn size-11 !p-0"
                    aria-label={`${ui.remove}: ${l.name}`}
                    onClick={() => change(l.id, -1)}
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-bold tabular-nums">{l.qty}</span>
                  <button
                    type="button"
                    className="btn size-11 !p-0"
                    aria-label={`${ui.add}: ${l.name}`}
                    onClick={() => change(l.id, 1)}
                  >
                    +
                  </button>
                  <span className="w-20 text-end tabular-nums">{formatMAD(l.qty * l.unitCents, lang)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 grid gap-3">
            <div>
              <label className="label" htmlFor="customer-name">
                {ui.name}
              </label>
              <input
                id="customer-name"
                className="field"
                maxLength={60}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="note">
                {ui.note}
              </label>
              <textarea
                id="note"
                className="field"
                rows={2}
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <p className="mt-4 flex justify-between text-lg font-bold">
            <span>{ui.total}</span>
            <span>{formatMAD(total, lang)}</span>
          </p>
          {lines.length > 0 && (
            <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-solid mt-3 w-full">
              {ui.send}
            </a>
          )}
          <p className="mt-2 text-sm text-muted">{ui.hint}</p>
        </div>
      </dialog>
    </div>
  );
}
