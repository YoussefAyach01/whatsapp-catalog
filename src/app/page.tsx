import Link from 'next/link';

const STEPS = [
  ['Ajoutez vos produits', 'Catégories, prix en dirhams, photo, noms en français et en arabe.'],
  ['Partagez le lien ou le QR code', 'Sur Instagram, WhatsApp Status, ou imprimé en boutique.'],
  ['Recevez les commandes', 'Le client compose sa commande et vous l’envoie directement sur WhatsApp.'],
] as const;

export default function Home() {
  return (
    <>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="font-display text-2xl font-bold">Hanoot</span>
        <nav aria-label="Compte" className="flex items-center gap-3">
          <Link href="/login" className="min-h-11 px-2 py-2 font-semibold underline">
            Connexion
          </Link>
          <Link href="/signup" className="btn btn-solid">
            Créer mon catalogue
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-[1.2fr_1fr] md:py-16">
          <div>
            <p className="text-sm font-bold tracking-widest text-brand uppercase">
              Catalogue en ligne pour petits commerces
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight font-bold sm:text-5xl">
              Vos produits en photo. Les commandes sur votre WhatsApp.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted">
              Plus besoin d’envoyer vos photos une par une sur WhatsApp Status. Un seul lien à partager, vos
              clients choisissent et vous envoient leur commande directement, sans application à installer.
            </p>
            <p className="mt-6 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-solid">
                Créer mon catalogue gratuitement
              </Link>
              <Link href="/c/demo" className="btn">
                Voir un catalogue de démonstration
              </Link>
            </p>
          </div>

          {/* The thing the customer sees, drawn in CSS so the page needs no images */}
          <div
            aria-hidden="true"
            className="mx-auto w-full max-w-64 rounded-[2rem] border-4 border-ink bg-white p-3 shadow-xl"
          >
            <div className="rounded-xl bg-brand px-3 py-2 font-display font-bold text-white">Dar Zaytoun</div>
            {[
              ['Huile d’olive 1L', '90 MAD'],
              ['Miel de thym 500g', '120 MAD'],
              ['Savon noir', '35 MAD'],
              ['Argan cosmétique', '150 MAD'],
            ].map(([n, p]) => (
              <div key={n} className="flex items-center justify-between border-b border-line py-2 text-sm">
                <span>{n}</span>
                <span className="font-semibold">{p}</span>
              </div>
            ))}
            <div className="mt-3 rounded-lg bg-brand py-2 text-center text-sm font-semibold text-white">
              Commander sur WhatsApp
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10" aria-labelledby="how">
          <h2 id="how" className="font-display text-3xl font-bold">
            Comment ça marche
          </h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="card">
                <span className="text-sm font-bold text-brand">Étape {i + 1}</span>
                <h3 className="mt-1 text-xl font-bold">{title}</h3>
                <p className="mt-2 text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10" aria-labelledby="pricing">
          <h2 id="pricing" className="font-display text-3xl font-bold">
            Tarifs
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="text-xl font-bold">Gratuit</h3>
              <p className="mt-1 text-3xl font-bold">0 MAD</p>
              <ul className="mt-3 list-disc ps-5 text-muted">
                <li>Jusqu’à 30 produits</li>
                <li>Photos, FR/AR</li>
                <li>Commandes WhatsApp</li>
              </ul>
            </div>
            <div className="card">
              <h3 className="text-xl font-bold">Pro</h3>
              <p className="mt-1 text-3xl font-bold">
                99 MAD <span className="text-base font-normal text-muted">/ mois</span>
              </p>
              <ul className="mt-3 list-disc ps-5 text-muted">
                <li>Produits illimités</li>
                <li>Tout ce qui est dans Gratuit</li>
                <li>Assistance par WhatsApp</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted">Hanoot · fait au Maroc</footer>
    </>
  );
}
