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

Both web surfaces share a single **subtle lavender** theme:

- Design tokens (colours, radius, shadows, typography) live in each app's
  `src/index.css` `:root`.
- Reusable base components (Button, Input, Card, Badge, Avatar, EmptyState,
  Modal, Spinner, etc.) live in `src/components/ui.tsx`.
- Icons: [Lucide](https://lucide.dev) (`lucide-react`), 1.5px stroke.
- Font: Inter (weights ≤ 700).

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
npm run dev -w @monark/patient-web
```

Wiring between the front ends and the API:

- `apps/admin/.env` sets `VITE_API_URL` (defaults to `http://localhost:3003`).
- `apps/patient-web` proxies `/api` to the API via its `vite.config.ts`.
- The API's `CORS_ORIGINS` must include the front-end origins (it already lists
  `http://localhost:5173` and `http://localhost:8082` for local dev).

## Useful commands

```bash
npm run typecheck                 # typecheck every workspace
npm run build                     # build every workspace
npm run build -w @monark/admin    # build a single app
npm run test  -w @monark/api      # API unit/integration tests
```

Auth rate limiting is environment-aware (lenient in development, stricter in
production) and can be tuned with `AUTH_RATE_LIMIT_MAX` /
`AUTH_RATE_LIMIT_WINDOW_MIN` in `packages/api/.env`.

## Deployment runbook

### Backend (HIPAA-eligible host)

1. Deploy `packages/api` to a HIPAA-eligible environment (AWS/GCP with a BAA).
2. Use managed PostgreSQL with encrypted storage and SSL connections.
3. Configure environment variables from `.env.example` (`NODE_ENV=production`).
4. Apply migrations: `npm run prisma:deploy -w @monark/api`.
5. Start with a production process manager/container.
6. Terminate HTTPS/TLS 1.2+ at the ingress/load balancer.

### Web portals (Admin + Patient)

1. Set the production API origin (`VITE_API_URL` for admin; configure the
   patient-web `/api` target for its host).
2. Build the static bundle:
   - `npm run build -w @monark/admin`
   - `npm run build -w @monark/patient-web`
3. Serve the generated `dist/` from any static host/CDN.

## Security notes

- No patient PII appears in page titles, browser tabs, or URL parameters.
- Secrets live only in `packages/api/.env` (git-ignored).
