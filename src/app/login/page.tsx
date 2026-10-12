import Link from 'next/link';
import { redirect } from 'next/navigation';
import { loginAction } from '@/app/actions';
import { ERRORS, pick } from '@/lib/messages';
import { getOwner } from '@/lib/session';

export const metadata = { title: 'Connexion' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getOwner()) redirect('/dashboard');
  const { error } = await searchParams;
  const message = pick(ERRORS, error);
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link href="/" className="font-display text-2xl font-bold">
        Hanoot
      </Link>
      <h1 className="mt-6 font-display text-3xl font-bold">Connexion</h1>
      {message && (
        <p role="alert" className="mt-4 rounded-lg border border-red-700 bg-red-50 p-3 text-red-900">
          {message}
        </p>
      )}
      <form action={loginAction} className="card mt-6 space-y-4">
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
            Mot de passe
          </label>
          <input
            className="field"
            id="password"
            name="password"
            type="password"
            required
            maxLength={200}
            autoComplete="current-password"
          />
        </div>
        <button className="btn btn-solid w-full" type="submit">
          Se connecter
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        Pas encore de compte ?{' '}
        <Link className="font-semibold underline" style={{ color: 'var(--accent)' }} href="/signup">
          Créer mon catalogue
        </Link>
      </p>
    </main>
  );
}
