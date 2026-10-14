# TEXAS ONE — Next.js on Vercel

Restaurant storefront, ordering, manager dashboard and table QR ordering. Uses **standard Next.js**, **Supabase PostgreSQL**, **Supabase Auth** and **Supabase Storage**. No Cloudflare or ChatGPT Sites runtime is required.

## Deploy on Vercel

1. Import `WockoPayaz/texas-one` into Vercel, choose **Next.js**, root directory `.` and **Node.js 22.x**. Remove any previous custom Output Directory setting. `vercel.json` supplies `npm ci` and `npm run build`; keep other build settings at their defaults.
2. Deploy. No secrets are required to build. Until the backend is connected, customers can browse the menu but checkout is disabled. This is intentional: orders are never silently saved to temporary server memory.
3. Create a **new Supabase project**. In its SQL Editor run [supabase/schema.sql](supabase/schema.sql). This creates the restaurant tables, restricts client access and creates the private `menu-images` storage bucket.
4. Set the five variables below in Vercel → Project → Settings → Environment Variables. Select Production (and Preview only if you want previews to access that database).
5. In Supabase → Authentication → Users, **create a user** with your email and a strong password. Confirm that user's email. Set `OWNER_EMAIL` to exactly that address. The first successful manager request by that verified account registers it as owner; other users cannot claim ownership.
6. Redeploy Vercel, open `/manager/login`, and sign in. Add your payment details under Settings. Review menu prices and upload photos. Create table QR codes using your final Vercel/custom-domain URL.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Supabase **Connect → Transaction pooler** PostgreSQL URL, port **6543**, with your database password and `?sslmode=verify-full`. URL-encode special password characters. |
| `SUPABASE_URL` | Supabase project URL, such as `https://PROJECT_REF.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase publishable key or legacy anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret key or legacy service_role key; used only by the server for storage |
| `OWNER_EMAIL` | Your confirmed Supabase Authentication user's email |

Never prefix database credentials or the storage secret with `NEXT_PUBLIC_`. Never commit `.env.local`.

### Adding managers

Create a confirmed email/password user in Supabase Authentication, then add that email in the owner's **Team** tab. Both an authenticated account and a manager allowlist entry are required. Remove the Team entry to immediately revoke access. Manage password resets and account recovery through Supabase Authentication. Public signup is not offered by this app; you can disable new signups in Supabase Auth settings.

### Existing deployment troubleshooting

- Use the latest `main` commit and select **Redeploy**, clearing the previous build cache if an old Cloudflare build command appears.
- Framework: **Next.js**. Install: **npm ci**. Build: **npm run build**. Output Directory: **default** (do not enter `dist`).
- Missing database: menu stays browse-only; checkout is disabled.
- Database error after adding variables: run `supabase/schema.sql`, check the transaction pooler URL and password, then redeploy.
- Manager sign-in error: check Supabase URL/key, create/confirm the Auth user, and verify `OWNER_EMAIL`.
- Photo upload error: check the service key and `menu-images` bucket. JPEG, PNG and WebP are supported up to **4 MB**, below Vercel's request-body limit.
- A successful build verifies deployment compatibility, not live credentials. Test delivery, pickup, table ordering, uploads and manager sign-in once your Supabase project is connected.

## Local development

Node 22.x. Copy `.env.example` to `.env.local`, fill the values and run the SQL schema on your Supabase project.

```sh
npm ci
npm run dev
npm test
npm run build
npm start
```

Tests execute the actual order handlers and database adapter against PGlite (PostgreSQL) with mocked authenticated identities/storage. They cover server pricing, minimums, idempotency, payment verification, manager access/revocation, owner restrictions, table validity and unconfigured deployment behavior. They do not claim live Supabase authentication/storage verification.

## Restaurant settings

PSO Askari Petrol Pump, Airport Road, Quetta. Open 24 hours. Phone **03178103338**. Delivery across Quetta: **Rs. 300**, minimum food subtotal **Rs. 1,000**. Pickup/table orders have no delivery fee or minimum. Cash and manually verified JazzCash/Easypaisa/bank transfers are supported; advance payments remain disabled until configured.

Menu photos start empty. Special Shawarma's partly obscured price is provisionally Rs. 450 and the item remains disabled pending confirmation. One entirely obscured soda entry was omitted.

## Migration note

The earlier ChatGPT Sites preview is a separate Cloudflare deployment. Existing orders, uploaded photos, settings and manager accounts there do **not** automatically transfer to Supabase. This repository now targets Vercel; the previous preview remains unchanged. Use Supabase backups for live records and photos; a source ZIP is not a data backup.

See [daily operations](docs/OPERATIONS.md) and [REA/reference investigation](docs/REFERENCE.md).
