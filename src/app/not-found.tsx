import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-3xl font-bold">Page introuvable</h1>
      <p className="mt-2 text-muted">Cette boutique n’existe pas ou a été supprimée.</p>
      <p className="mt-6">
        <Link href="/" className="btn">
          Retour à l’accueil
        </Link>
      </p>
    </main>
  );
}
