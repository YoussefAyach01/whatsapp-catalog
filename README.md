# whatsapp-catalog ("Hanoot")

A product catalog for small shops, with orders sent to the shop's WhatsApp. Multi-tenant: each shop owner
signs up, builds a catalog (categories + products with photo, price in MAD, FR + optional AR names), shares a
link or a QR code, and customers order from their phone. Orders are composed in the browser and handed to
WhatsApp (`wa.me` link), so there is no order database and nothing to install for the customer.

Stack: Next.js 16 (App Router) + Tailwind 4 + TypeScript strict + SQLite via the built-in `node:sqlite` (no
native modules, no cloud account).

## Run

Requires Node 22.18+ (developed on Node 25).

```bash
npm install
cp .env.example .env.local     # then edit SESSION_SECRET
npm run seed                   # optional: demo shop at /c/demo (demo@example.com / demo-password-1)
npm run dev                    # http://localhost:3500
```

Checks: `npm run typecheck && npm run lint && npm test`.
End-to-end (real Chrome, needs `npm run build` first): `npm run test:e2e`.

## How it is built

- `src/lib/*`: pure logic (money, WhatsApp message, phone normalisation, slugs, scrypt passwords, signed
  session cookies, rate limiter, image magic-byte sniffing, SQLite repository). Unit-tested without Next.
- `src/app/actions.ts`: server actions. Each mutating action calls `requireOwner()` and every SQL write is
  scoped by `shop_id` (ownership check, tested against IDOR).
- `src/app/c/[slug]`: public catalog + cart (client component, `<dialog>` for the order panel).
- `src/app/api/qr/[slug]`: QR code as SVG linking to the public catalog.
- Product photos: uploaded as a normal `<input type=file>`, verified by magic bytes (never trusts the
  filename or `Content-Type`), capped at 300 KB, stored as a `data:` URL in SQLite. Good enough for small
  catalogs without wiring up S3/object storage; swap for real file storage if photo volume grows.
- Security: zod validation on every form, parameterised SQL, httpOnly + SameSite=Lax session cookie (Secure
  in production), login/signup rate limits, same error for unknown user and wrong password, CSP and other
  headers in `next.config.ts`.

## Deploy

Needs a Node host with a persistent disk (SQLite is a file, and product photos live in it too): a small VPS,
Railway or Fly with a volume. It will NOT work on Vercel's serverless filesystem as-is; to use Vercel, swap
`src/lib/db.ts` for Postgres/Turso and move photos to object storage (only `db.ts` and `repo.ts` touch the
database).

1. Set env vars from `.env.example` (`SESSION_SECRET` is mandatory in production: the app refuses to start
   sessions without it).
2. `npm run build && npm start` behind HTTPS (Caddy/nginx). Set `NEXT_PUBLIC_APP_URL` to the public URL: it is
   what the QR code encodes.
3. Back up `DATABASE_PATH` (it is one file; use `sqlite3 .backup` or copy while idle). It now also holds
   product photos, so it is bigger than a text-only database.
4. Make sure your reverse proxy overwrites `X-Forwarded-For`, otherwise the rate limiter can be bypassed.

## Known limits

- Upgrading to Pro is manual for now: `UPDATE shops SET plan='pro' WHERE slug='...'`. Stripe env vars exist
  but no checkout is wired (a "not configured" message is shown).
- No password reset or e-mail verification (needs an e-mail provider). Sessions last 7 days.
- Rate limiter is in memory (one server process).
- Orders are not stored: the shop owner only sees them in WhatsApp.
- Photos are stored inline as base64 in SQLite (simple, but the database grows with every photo; no
  resizing/compression beyond the 300 KB cap, no CDN).
- Dashboard is French only; the public catalog is French/Arabic.
