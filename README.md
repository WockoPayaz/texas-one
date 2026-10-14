# TEXAS ONE

Restaurant ordering website and manager dashboard for TEXAS ONE, Quetta. Cream, red and charcoal styling, a restored logo, and a text-first menu ready for your own photographs.

## Restaurant defaults

- PSO Askari Petrol Pump, Airport Road, Quetta
- Open 24 hours; 03178103338
- Delivery across Quetta: Rs. 300 fixed, Rs. 1,000 minimum food subtotal
- Pickup and table orders: no delivery fee or minimum
- Cash and manually verified JazzCash, Easypaisa and bank transfers

## Manager setup

Visit `/manager` and sign in with ChatGPT. The first signed-in owner on the private preview becomes the manager owner when `INITIAL_OWNER_SETUP=true`. Open the manager dashboard once, then turn this environment variable off before making the site public. The Team page lets the owner allow other managers by their ChatGPT email addresses. Do not expose bootstrap on a public deployment.

Use **Menu** to change prices, options, availability and photos. Use **Settings** to enter actual payment account titles/numbers; unconfigured advance methods cannot be selected. Use **Tables** to create each table and download or print its QR code. Set the final public website URL before printing customer QR codes. The private preview cannot accept public customer orders.

See [operations](docs/OPERATIONS.md) for the daily workflow and [reference report](docs/REFERENCE.md) for the REA investigation and limitations.

## Development

Node 22.13+ and pnpm are required (Node 24 recommended for SQLite tests).

```sh
pnpm install
pnpm dev
pnpm exec tsc --noEmit
node --test tests/api.test.mjs
node --experimental-strip-types --test tests/orders.test.mjs
pnpm build
```

The project uses React, Vinext, Cloudflare Workers, D1 and R2. `db/schema.ts` defines schema; committed Drizzle migrations provision tables. Catalog defaults are in `lib/menu.ts`; manager changes persist in D1, uploaded images in R2. The server validates availability, options, prices, minimums and totals. Orders use idempotency keys and opaque tracking links.

Hosting here uses the Sites platform's trusted ChatGPT identity headers. Running this independently requires configuring equivalent trusted authentication, D1/R2 bindings and migrations. Never accept identity headers directly from an untrusted client. A ZIP is the complete source backup, not a one-click static host upload.

## Verification

Type checking, production build and automated pricing/API tests were run. API tests exercise the real handlers against an in-memory SQLite database with mocked platform identity and bindings. Browser end-to-end testing of this deployment was unavailable in the provided environment; verify checkout, image upload, receipt/QR printing and mobile layout on the private preview before public launch.

## Menu review

Special Shawarma's price was partly obscured in the upload. It is saved at Rs. 450 but disabled with a review note; confirm before enabling. One fully obscured soda row could not be transcribed. All product photos intentionally start empty. Advance payments are manually checked by staff; there is no automatic payment gateway or bank verification. Taxes, SMS and automated delivery dispatch are not configured.
