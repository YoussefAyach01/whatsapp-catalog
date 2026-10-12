# whatsapp-catalog (Hanoot): business one-pager

## Buyer and problem

Small shop owners selling physical goods who do not have (and do not want) a full e-commerce site:
grocers/epiceries, home-based cosmetics/argan sellers, clothing resellers, artisans. Today they post product
photos one by one on WhatsApp Status or Instagram, and lose track of who wants what. They want one link that
shows all their products with prices, that customers can browse and order from, ending on the WhatsApp number
they already check all day.

## Offer and pricing

| Plan                              | MAD / month | USD / month | Includes                                               |
| --------------------------------- | ----------- | ----------- | ------------------------------------------------------ |
| Free                              | 0           | 0           | 30 products, photos, FR/AR, WhatsApp orders            |
| Pro                               | 99          | 10          | Unlimited products, priority WhatsApp support          |
| Setup service (optional, one-off) | 200 - 400   | 20 - 40     | You photograph/enter the catalog and print the QR card |

Realistic goal: 15-20 paying shops = 1,500-2,000 MAD/month. Hosting cost is roughly 40-80 MAD/month for a
small VPS, so margin is high but absolute income is modest until there is volume.

## First 5 customers

1. Target home-based sellers already posting products on Instagram/WhatsApp Status (argan oil, honey,
   clothing, home-made cosmetics): message them with their own demo catalog pre-built from 3-4 of their
   existing photos as the pitch.
2. Walk into small grocers/epiceries and corner shops with a phone showing the demo catalog; offer a free
   setup on the spot with a printed QR sticker for the counter.
3. Partner with a local printer/sign shop (same angle as qr-menu): they already print for small businesses
   and can refer customers for a small commission.

## Accounts needed to go live

- A VPS or PaaS with persistent disk (about 40-80 MAD/month, bigger disk than a text-only app since photos
  are stored in the database) and a domain (about 100 MAD/year).
- Optional later: Stripe for card billing (limited availability for Moroccan businesses; cash/bank
  transfer/CMI plus the manual Pro switch is the realistic route at first), Resend or similar for
  password-reset e-mails.

## Honest limits

- Customers must have WhatsApp (almost all do in Morocco) and the shop owner must watch it; there is no
  order history, inventory sync, delivery tracking, or online payment.
- Competes with free tools (Instagram, WhatsApp Business catalog, Facebook Shop): the pitch is a single
  shareable link/QR with FR/AR and MAD pricing, no Meta Business account setup required.
- Pro billing, password reset and e-mail verification are not built yet.
- Not tested on Safari/iOS or real Android phones; verified with real headless Chrome (desktop) at 375px and
  via the automated flow below. WhatsApp hand-off was checked by inspecting the generated link, not by
  sending a real message.
- Photo storage is simple (base64 in SQLite, 300 KB cap); fine for a few dozen shops, would need real object
  storage to scale further.
