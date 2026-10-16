# Table ordering: location and spam protection

Existing printed table QR codes continue working. Delivery and pickup do not require location or a dine-in session.

## One-time setup

At the restaurant, open Manager → Settings → Table ordering location. Choose **Use my current location at the restaurant**, allow precise location, check the coordinates and **Save settings**. Alternatively enter coordinates from a verified map pin. Do not capture the location from home.

Start with the 150 metre boundary and test from seats inside the building. The manager can choose 50–500 metres. Until coordinates are saved, table ordering fails closed with a message to ask staff. Other order modes remain available. No database migration or new environment variables are needed; the existing server-only `rate_limits` table stores expiring sessions and counters.

## Customer experience

- Browse without granting location; mobile data and any Wi-Fi work.
- Table checkout requests a fresh precise location. Readings over two minutes old, over 15 seconds in the future, with accuracy worse than 100 metres, or outside the configured boundary are rejected.
- Advance-payment account details are shown after an initial location check, to avoid asking a remote customer to transfer money before discovering the restriction. Submission still checks a fresh location.
- Permission denied, timeout, inaccurate location and unavailable location have retry/staff guidance. Coordinates are validated but not saved in orders or logs.

## Server controls

- Four-hour opaque HttpOnly, Secure, SameSite=Strict cookie. Only its hash is stored server-side and associated with orders.
- Up to six table submission attempts per ten minutes per session and normalized phone number. The broader per-IP guard permits 120 attempts to accommodate shared restaurant/mobile-provider networks. Phone numbers are not verified identities.
- One unacknowledged (`new`) table order per session **or phone number**, across tables. Acceptance or cancellation releases this restriction. PostgreSQL row locks and a transaction serialize competing inserts.
- Existing request-ID idempotency makes retries return the same order. A synchronous browser guard prevents double-click submissions.
- Managers can block a browser session from its order details. Blocking does not cancel the existing order. Blocked sessions cannot be renewed while valid.
- Customer tracking excludes session identifiers. Browser location is never used to calculate the delivery address.

## Practical limits

Location is supplied by the browser and can be forged. This deters ordinary saved-link misuse; it is not proof of presence or of the correct table. Clearing cookies and changing phone numbers can evade some controls. Shared networks may still reach the broad IP ceiling. Provide staff ordering for phones that cannot obtain an accurate position. Do not promise that all remote spam is impossible.

## Validation

`npm test` covers location rejection, pending orders across phone formats and sessions, concurrent submissions, request retries, throttling, expiry, blocking and manager authorization, alongside existing payment and delivery/pickup tests. API tests use a local PostgreSQL-compatible PGlite database, never production orders. `npm run build` checks the production build and types.
