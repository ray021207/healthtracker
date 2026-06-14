# Monark Health Solutions

Monorepo for Monark Health Solutions:
- Mobile app: Expo + React Native
- Admin portal: React + Vite
- Backend API: Node.js + Express + Prisma

## Workspace Commands

- Install dependencies:
  - `npm install`
- Run API in dev mode:
  - `npm run dev:api`
- Run admin in dev mode:
  - `npm run dev:admin`
- Run mobile in dev mode:
  - `npm run dev:mobile`
- Run all typechecks:
  - `npm run typecheck`

## Backend Setup

1. Create `packages/api/.env` from `.env.example`.
2. Ensure `DATABASE_URL` includes SSL mode (`sslmode=require`).
3. Run Prisma migration and seed:
   - `npm run prisma:migrate -w @monark/api`
   - `npm run prisma:generate -w @monark/api`
   - `npm run prisma:seed -w @monark/api`
4. Start API:
   - `npm run dev:api`

## Testing

- API unit/integration tests:
  - `npm run test -w @monark/api`

## Deployment Runbook

### Backend (HIPAA-eligible host)

1. Deploy `packages/api` to HIPAA-eligible environment (AWS/GCP with BAA).
2. Use managed PostgreSQL with encrypted storage and SSL connections.
3. Configure environment variables from `.env.example`.
4. Run migrations in deployment:
   - `npm run prisma:deploy -w @monark/api`
5. Start with production process manager/container.
6. Ensure HTTPS/TLS 1.2+ at ingress/load balancer.

### Admin Portal

1. Set `VITE_API_URL` to production API URL.
2. Build and deploy static bundle:
   - `npm run build -w @monark/admin`

### Mobile (Expo EAS)

1. Configure Expo account and project.
2. Set `EXPO_PUBLIC_API_URL` to production API URL.
3. Build Android:
   - `npm run build:android -w @monark/mobile`
4. Build iOS:
   - `npm run build:ios -w @monark/mobile`
