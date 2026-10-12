import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Hanoot · Catalogue produits et commandes WhatsApp', template: '%s · Hanoot' },
  description:
    'Créez le catalogue de votre boutique et recevez les commandes sur WhatsApp. Gratuit jusqu’à 30 produits.',
  icons: { icon: 'data:,' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
