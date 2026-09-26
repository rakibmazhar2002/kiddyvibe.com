# KiddyVibe — premium kids apparel

KiddyVibe is a premium kidswear storefront built with React, Vite and a Hono Cloudflare Worker. It includes a responsive children's apparel storefront, kids' size selection and guide, one-step COD checkout, D1-backed stock variants, session-based admin, manual order management, R2 upload endpoint, Meta CAPI purchase integration and Steadfast courier submission.

## Requirements
Node 20+, npm, Cloudflare account and Wrangler login (`npx wrangler login`).

## Local development
```sh
npm install
npm run dev
```
Vite serves the storefront. To exercise the Worker API locally, build and use `npx wrangler pages dev dist` after setting up your D1/R2 bindings. In normal `npm run dev`, checkout falls back to a local confirmation flow if the API is unavailable; no order is persisted in that fallback. Do not use that fallback for live sales.

## Cloudflare deployment
1. The existing D1 database binding is retained under its current Cloudflare resource name to avoid disconnecting the live database. Check `wrangler.toml` for its configured ID.
2. Create the media bucket if required: `npx wrangler r2 bucket create kiddyvibe-product-media`, then add its `BUCKET` binding in `wrangler.toml`.
3. Apply the D1 migrations, including the kidswear catalog conversion: `npm run db:migrate:remote`.
4. Optional development inventory: `npx wrangler d1 execute forme-production --remote --file=seed.sql`.
5. Set Worker secrets: `npx wrangler secret put META_CAPI_TOKEN`, `STEADFAST_API_KEY`, `STEADFAST_SECRET_KEY`. Public Pixel ID, configurable delivery prices and remaining store settings are managed through D1 settings.
6. Create the first admin without a default password: `npm run admin:create -- <username> '<long-random-password>' --remote` (the password must be at least 14 characters). For a local D1 database, omit `--remote`.
7. Build/deploy: `npm run build && npx wrangler deploy`. Attach your production domain in Cloudflare and enable HTTPS. For Pages deployment, deploy `dist` and configure the Worker as the Pages Functions entrypoint or use the Worker asset binding as configured here.

## Admin login recovery
Admin authentication verifies PBKDF2-SHA256 hashes with Web Crypto; there is intentionally no hard-coded password bypass. To reset/create the admin login safely, run `npm run admin:create -- admin '<new-long-password>' --remote`. This writes a fresh salted hash directly to D1. Never put an admin password in Worker source code.

## Configuration & security notes
- Replace the D1 database ID placeholder before deployment; never commit credentials.
- Admin session cookies are HttpOnly, Secure and SameSite=Strict, with an eight-hour expiry. Passwords are PBKDF2-SHA256 (210,000 rounds, random salt). Admin APIs require the server-side session.
- Meta CAPI token and Steadfast credentials can be Worker secrets; D1 settings are supported for admin-managed config and are not returned publicly. The settings admin API returns boolean presence flags for stored secrets only.
- `schema.sql` is the canonical SQL and `migrations/0001_initial.sql` initializes a fresh D1 database. Seed data is optional and contains remote development imagery.
- For production image URLs, expose an R2 custom domain or add an authenticated/public media delivery route appropriate to your Cloudflare setup. Uploaded files are constrained to JPEG/PNG/WebP and 8 MB.
- Configure Worker rate limiting at Cloudflare (WAF/rate limiting rules) on `/api/orders/create` and `/api/auth/login`; use Turnstile or equivalent bot control for paid-traffic campaigns. Add CSRF token checks if admin mutations are ever called cross-origin; SameSite cookies and same-origin deployment are assumed.
- Meta Pixel browser events are not injected in this visual starter. Configure the public `pixel_id` and wire client PageView/ViewContent/InitiateCheckout/Purchase in a consent-aware tag module before advertising. Server Purchase CAPI is implemented with the deterministic invoice event ID.

## Admin dashboard
Visit `/admin` after creating the first admin account. The dashboard includes an order queue with status/search filters, customer/address/order details, inline status updates and one-click Steadfast submission; a product inventory view with editable price and size-level stock; and a marketing/courier settings form. Secret fields are write-only in the UI (the settings API returns only whether each secret is configured). Product size stock updates write to `product_variants` and recompute the product-level stock total.

## Endpoints
Public: `GET /api/public/config`, `GET /api/public/products`, `GET /api/public/products/:slug`, `POST /api/orders/create`.
Auth: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
Admin: `GET /api/admin/orders`, `GET /api/admin/orders/:id`, `PATCH /api/admin/orders/:id/status`, `POST /api/admin/orders/:id/send-steadfast`, `GET /api/admin/orders/:id/track-courier`, product CRUD, settings GET/PATCH, and `POST /api/admin/media` multipart file upload.

## Architecture
`src/client` is the React/Vite UI. `src/server/index.ts` is the Hono Worker and keeps public/admin API boundaries separate. `schema.sql` and `migrations/` contain native D1 SQL; `seed.sql` contains optional product and size inventory. Cloudflare bindings are `DB`, `BUCKET`, and `ASSETS`.
