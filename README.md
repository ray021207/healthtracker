# Monark Health Solutions

Monorepo for Monark Health Solutions — a clinic wellness platform where
practitioners manage patients and generate personalised 90-day diet, exercise,
and wellness plans, and patients track their progress.

## Surfaces

| Workspace | Package | Stack | Dev port |
| --- | --- | --- | --- |
| `apps/admin` | `@monark/admin` | React + Vite (practitioner/clinic portal) | 5173 |
| `apps/patient-web` | `@monark/patient-web` | React + Vite (patient portal) | 8082 |
| `packages/api` | `@monark/api` | Node.js + Express + Prisma (PostgreSQL) | 3003 |
| `packages/pdf` | `@monark/pdf` | PDF generation helpers | — |
| `packages/shared` | `@monark/shared` | Shared types/utilities | — |

> `apps/mobile` is reserved for a future Expo + React Native patient app and is
> not yet scaffolded.

## Design system

Both web surfaces share a single **deep indigo** theme with automatic dark mode:

- Design tokens (colours, radius, shadows, typography) live in each app's
  `src/index.css` `:root`, with a `@media (prefers-color-scheme: dark)` block
  overriding them. Theme follows the device's OS setting — there is no manual
  toggle. Every color in the app is token-driven (no hardcoded hex outside
  `index.css`), so new UI should use `var(--color-*)` rather than literals.
- Reusable base components (Button, Input, Card, Badge, Avatar, EmptyState,
  Modal, Spinner, etc.) live in `src/components/ui.tsx`.
- Icons: [Lucide](https://lucide.dev) (`lucide-react`), 1.5px stroke.
- Font: Inter (weights ≤ 700).

## Patient app is installable (PWA)

`apps/patient-web` ships a web manifest, generated icons, and a service worker
(`public/manifest.webmanifest`, `public/sw.js`), so patients can install it to
their phone's home screen from the browser (Android: Chrome's install prompt
or menu; iOS: Safari's Share → "Add to Home Screen") — no app store needed.
This works from any page, logged in or not. Icons are generated from
`apps/patient-web/scripts/generateIcons.mjs` (requires `sharp`, installed
on-demand — see the script for details); re-run it only if the icon design
changes.

## Prerequisites

- Node.js 20+ and npm 10+
- A PostgreSQL database (SSL recommended; `sslmode=require`)

## First-time setup

```bash
# 1. Install all workspace dependencies
npm install

# 2. Create the API environment file and fill in the values
#    (DATABASE_URL, JWT secrets, ANTHROPIC_API_KEY, etc.)
cp .env.example packages/api/.env   # then edit packages/api/.env

# 3. Generate the Prisma client and apply migrations
npm run prisma:generate -w @monark/api
npm run prisma:migrate  -w @monark/api
```

`packages/api/.env` is git-ignored — it is never committed. See `.env.example`
for the required keys.

> ⚠️ **`npm run prisma:seed -w @monark/api`** inserts a demo clinic, admin, and
> patient (`admin@monarkhealth.com` / `patient@monarkhealth.com`). Only run it
> if you want that demo data — skip it on a database with real accounts.

## Running locally

Start each in its own terminal, from the repo root. Start the API first so the
web apps have a backend to call.

```bash
# Terminal 1 — API (port 3003)
npm run dev:api

# Terminal 2 — Admin portal (http://localhost:5173)
npm run dev:admin

# Terminal 3 — Patient portal (http://localhost:8082)
npm run dev:patient-web
```

Wiring between the front ends and the API:

- `apps/admin/.env` sets `VITE_API_URL` (defaults to `http://localhost:3003`).
- `apps/patient-web` proxies `/api` to the API via its `vite.config.ts`.
- The API's `CORS_ORIGINS` must include the front-end origins (it already lists
  `http://localhost:5173` and `http://localhost:8082` for local dev).

## Useful commands

```bash
npm run typecheck                 # typecheck every workspace
npm run test                      # test every workspace
npm run build                     # build every workspace
npm run build -w @monark/admin    # build a single app
npm run test  -w @monark/api      # API unit/integration tests
```

CI (`.github/workflows/ci.yml`) runs typecheck → test → build on every push
and PR to `main`.

Auth rate limiting is environment-aware (lenient in development, stricter in
production) and can be tuned with `AUTH_RATE_LIMIT_MAX` /
`AUTH_RATE_LIMIT_WINDOW_MIN` in `packages/api/.env`.

## Deployment

The actual, current deploy path (Neon + Render + Vercel, free-tier-friendly)
is documented step by step in [`DEPLOY.md`](./DEPLOY.md) — follow that, not a
generic runbook. In short: `packages/api` runs on Render, Postgres is Neon,
and both `apps/admin` and `apps/patient-web` are static Vite builds on Vercel.
If you later move to a different host (including a HIPAA-eligible one with a
signed BAA), the same build/env-var shape applies — `npm run build` per app,
`prisma migrate deploy` for the database, and the env vars listed in
`.env.example`.

## Security notes

- Sensitive `HealthProfile` fields (labs, medications, conditions, allergies)
  are encrypted at rest with AES-256-GCM (`packages/api/src/utils/encryption.ts`,
  `healthProfileCrypto.ts`), on top of the database provider's own encryption
  at rest and TLS in transit. Encryption/decryption happens at the route
  boundary, so the rest of the app only ever sees plain values.
  ⚠️ **`ENCRYPTION_KEY` cannot be rotated by just changing it** — every
  existing health profile is encrypted with whatever key was set when it was
  saved. See the warning in `DEPLOY.md` step 3.2 before touching this in
  production.
- No patient PII appears in page titles, browser tabs, or URL parameters.
- Secrets live only in `packages/api/.env` (git-ignored).
- `apps/admin/src/pages/LegalPage.tsx` and `apps/patient-web/src/pages/LegalPage.tsx`
  serve Terms of Service and a Privacy Policy at `/terms` and `/privacy` in
  both apps. The content is accurate to what the app actually does but is
  **not legal advice** — it has no real company name, address, or contact
  email filled in, and should get a lawyer's pass before it's binding.
