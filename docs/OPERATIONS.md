# Manager guide

## Opening checklist

1. Open `/manager`, sign in and keep Orders open. Enable the order alert sound with the button; the screen refreshes every 10 seconds.
2. In Settings enter actual JazzCash, Easypaisa and bank account details. Customers upload their receipt screenshot (JPG, PNG or WebP, up to 4 MB). Open the private screenshot from order details. Verify receipt in your banking/payment app before marking a payment paid.
3. Review menu prices, confirm the disabled Special Shawarma and upload your item photographs. Menu supports PNG, JPEG and WebP up to 4 MB.
4. Create tables with meaningful labels. Use the final public website URL to download/print QR codes; test each before attaching it to a table. Disable a table to stop orders through its QR.

## Handling orders

- New → Accepted → Preparing → Ready → Out for delivery (delivery only) → Completed.
- Pickup and table orders can go from Ready to Completed.
- Advance payments must be marked paid before accepting. Cash must be marked collected before completion.
- You can cancel active orders. Status and payment changes are recorded in the order data; this is not a full accounting or audit system.
- Print a POS receipt from the order details. Select your 80 mm thermal printer/paper, 100% scale, and turn off browser headers and footers. The receipt uses a 72 mm content width, shows saved order prices, and only marks payment paid after manager confirmation. Cancelled orders are labelled clearly. You can also save it as a PDF. Contact the customer with the displayed phone/address when needed.
- Table QR links identify the table; they do not prove the customer is physically seated there. Staff should check suspicious orders.

## Before public launch

- Complete the Vercel/Supabase setup in README.md and sign in as the configured owner.
- Create staff users in Supabase Authentication and add their emails in Team.
- Confirm the final public domain before printing table QR codes.
- Confirm payment accounts and the obscured menu entries.
- Test one delivery, pickup and table order, payment verification, cancellation, uploads and printing. Cancel test orders afterward.
- Decide tax treatment, refund policy and delivery expectations for your actual operation. Current totals include food plus the fixed delivery fee only.
- Arrange operational database and image backups before relying on the system for live trading. The source ZIP does not contain future orders or uploads.

Settings lets you pause new orders. Existing order history remains available. The dashboard shows the latest 300 orders; it is intended for day-to-day service rather than long-term accounting/reporting.

Payment receipt screenshots are stored under a private receipts/ prefix in the existing menu-images bucket. Only authenticated, allowlisted managers can retrieve them through the receipt endpoint. They are excluded from public tracking and image routes. No extra environment variables or SQL migration is required. Legacy order reference IDs remain visible to managers.
