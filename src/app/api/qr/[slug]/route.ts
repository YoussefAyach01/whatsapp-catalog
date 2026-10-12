import QRCode from 'qrcode';
import { getDb } from '@/lib/db';
import { getShopBySlug } from '@/lib/repo';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getShopBySlug(getDb(), slug)) return new Response('Not found', { status: 404 });

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin).replace(/\/$/, '');
  const target = `${base}/c/${encodeURIComponent(slug)}`;
  const svg = await QRCode.toString(target, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml',
      'cache-control': 'public, max-age=3600',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
