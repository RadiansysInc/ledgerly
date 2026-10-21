# Ledgerly Invoice Studio

A polished full-stack invoice workspace for small businesses. Ledgerly combines a responsive editor with a live, print-ready invoice, persistent Cloudflare D1 storage, and transactional email delivery through Brevo.

## Highlights

- Live editing for business details, customer details, invoice dates, notes, and invoice number
- Add, edit, and remove line items with exact cent-based rounding
- USD subtotal, fixed discount, percentage tax, and grand total
- Editable custom fields with independent show/hide controls
- Responsive editor/preview experience with visible focus states and accessible labels
- Simple branded landing page with an application-owned demo login
- Print stylesheet that prints only the invoice at US Letter size
- D1-backed save, update, history, and automatic last-invoice restore
- Server-side Brevo integration with escaped HTML content and no browser-exposed credentials
- Helpful validation for required fields, negative values, and excess discounts

The required calculation check is covered by an automated test: `2 x $50 - $10 discount + 10% tax = $99.00`.

## Stack

- Next.js 16 + React 19 + TypeScript
- Vinext / Cloudflare Workers runtime
- Cloudflare D1 + Drizzle ORM
- Brevo Transactional Email API
- Tailwind build tooling plus a custom responsive design system
- Node's built-in test runner

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run db:generate
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_*.sql
npm run dev
```

Open the local URL printed by the development server. The editor works without email configuration. Saving requires the local D1 migration to be applied.

## Email setup

1. Create a [Brevo](https://www.brevo.com) account and verify a sender address or domain.
2. Copy `.env.example` to `.dev.vars` for local Cloudflare development.
3. Set `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, and optionally `BREVO_FROM_NAME` with real values.
4. Restart `npm run dev` after changing `.dev.vars`.
5. For production, add the same values as encrypted/server-side environment variables in the hosting dashboard.
6. Send tests only to an address you control.

Credentials are read exclusively in `app/api/email/route.ts`. Never commit `.env`, `.dev.vars`, or provider keys.

## Demo login

The local demo uses an application-owned HTTP-only cookie session. It does not use ChatGPT sign-in.

- Email: `demo@ledgerly.app`
- Password: `ledgerly2026`

Override `AUTH_EMAIL`, `AUTH_PASSWORD`, and `AUTH_SECRET` through server-side environment variables before a production deployment. The invoice and email APIs reject unauthenticated requests.

## Storage and backend

The `invoices` D1 table stores a queryable invoice number and customer name alongside the complete JSON payload. API endpoints are:

- `GET /api/invoices` - retrieve the 12 most recently updated invoices
- `GET /api/invoices?id=...` - retrieve one invoice
- `POST /api/invoices` - validate and save a new invoice
- `PUT /api/invoices` - validate and update an existing invoice
- `POST /api/email` - validate and send an invoice through Brevo

Generate a migration after any schema change with `npm run db:generate`. Hosted Sites deployments apply committed migrations automatically.

## Quality checks

```bash
npm test
npm run lint
npm run build
```

## Product decisions

- **Split workspace:** Editing and preview remain visible together on desktop; mobile uses an explicit Edit/Preview switch so neither surface feels cramped.
- **Editorial visual language:** Warm paper, deep green, restrained orange, and serif display typography make the product feel trustworthy without resembling generic accounting software.
- **Money correctness:** Every line is rounded to cents first, then summed. Discount is applied next, followed by rounded percentage tax.
- **Progressive backend behavior:** The editor and print preview remain useful when storage or email credentials are not configured, while backend actions return specific setup guidance.
- **Application-owned demo access:** A lightweight branded login keeps the interview demo self-contained. The session is stored in an HTTP-only, same-site cookie and all backend routes enforce it.
- **Email format:** Brevo receives a responsive HTML invoice summary. The browser print flow is the PDF path, avoiding a heavyweight server PDF dependency during the exercise window.

## AI tools used

OpenAI Codex was used for implementation scaffolding, UI iteration, and test generation. All requirements, interaction behavior, validation rules, and final code were reviewed against the exercise brief.

## Time spent

Approximately 3 hours, respecting the exercise cap.

## Known limitations / next steps

- Email delivery needs a verified Brevo sender and server-side secrets.
- Print to PDF uses the browser dialog rather than attaching a generated PDF to email.
- Full account registration, password recovery, and payment collection are intentionally omitted because the brief marks them out of scope.
- The included single-user login is intentionally a demo gate, not a multi-user account system.
- With more time, I would add invoice status tracking, logo upload, and Playwright coverage for the complete save/reload/email flow.
