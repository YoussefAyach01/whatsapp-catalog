import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signupAction } from '@/app/actions';
import { ERRORS, pick } from '@/lib/messages';
import { getOwner } from '@/lib/session';

export const metadata = { title: 'Créer mon catalogue' };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getOwner()) redirect('/dashboard');
  const { error } = await searchParams;
  const message = pick(ERRORS, error);
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link href="/" className="font-display text-2xl font-bold">
        Hanoot
      </Link>
      <h1 className="mt-6 font-display text-3xl font-bold">Créer mon catalogue</h1>
      <p className="mt-2 text-muted">Gratuit jusqu’à 30 produits. Sans carte bancaire.</p>
      {message && (
        <p role="alert" className="mt-4 rounded-lg border border-red-700 bg-red-50 p-3 text-red-900">
          {message}
        </p>
      )}
      <form action={signupAction} className="card mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="shopName">
            Nom de la boutique
          </label>
          <input
            className="field"
            id="shopName"
            name="shopName"
            required
            maxLength={80}
            autoComplete="organization"
          />
        </div>
        <div>
          <label className="label" htmlFor="whatsapp">
            Numéro WhatsApp qui reçoit les commandes
          </label>
          <input
            className="field"
            id="whatsapp"
            name="whatsapp"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="06 12 34 56 78"
          />
        </div>
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input
            className="field"
            id="email"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Mot de passe (10 caractères minimum)
          </label>
          <input
            className="field"
            id="password"
            name="password"
            type="password"
            required
            minLength={10}
            maxLength={200}
            autoComplete="new-password"
          />
        </div>
        <button className="btn btn-solid w-full" type="submit">
          Créer mon catalogue
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        Déjà inscrit ?{' '}
        <Link className="font-semibold underline" style={{ color: 'var(--accent)' }} href="/login">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
