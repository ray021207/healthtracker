# Deploying Monark Health for free (Neon + Render + Vercel)

No credit card required anywhere in this path. Do the steps in order — each one feeds the next.

## Why this shape

- `apps/admin` authenticates with **httpOnly cookies** (`sameSite: strict`). For that to survive a
  cross-domain setup (Vercel frontend, Render API), the browser must see the API as same-origin.
  `apps/admin/vercel.json` and `apps/patient-web/vercel.json` handle this with a rewrite that proxies
  `/api/*` to the Render backend — the browser never sees the `onrender.com` domain directly.
- `apps/patient-web` already calls relative `/api/...` paths (dev proxy does the same job locally), so
  it needs zero code changes — just the same rewrite.
- `apps/admin/src/lib/api.ts` was tweaked so its `VITE_API_URL` fallback is `""` in production builds
  (relative paths, routed through the rewrite) instead of `localhost:3001`.

## 1. Push to GitHub

Already done — `origin` is `https://github.com/ray021207/healthtracker`, `main` branch. Commit the
files this setup added (`render.yaml`, the two `vercel.json` files, `apps/admin/src/lib/api.ts`) before
continuing.

## 2. Neon (database)

1. [neon.tech](https://neon.tech) → sign up free → **New Project**.
2. Pick a region close to where you'll put Render (e.g. Oregon, to match Render's free-tier default).
3. Copy the connection string Neon gives you (the direct one, not the pooled `-pooler` variant — a
   single Render service doesn't need PgBouncer). It looks like:
   `postgresql://user:pass@ep-xxxx.us-west-2.aws.neon.tech/neondb?sslmode=require`
4. Locally, put that string in `packages/api/.env` as `DATABASE_URL`, then run once:
   ```
   npm run prisma:deploy -w @monark/api
   npm run prisma:seed -w @monark/api
   ```
   This applies the migration and creates the demo clinic/admin login (`admin@monarkhealth.com` /
   whatever `SEED_ADMIN_PASSWORD` is set to, default `Admin@12345`). Render will also re-run
   `migrate deploy` on every start (see below), so this manual step is really just to seed the demo data.

## 3. Render (API)

This repo has `render.yaml` at the root — Render can read it directly (Blueprint), or you can enter the
same values by hand.

1. [render.com](https://render.com) → sign up free → **New → Blueprint** → connect the `healthtracker`
   GitHub repo → Render detects `render.yaml`.
2. It will ask you to fill in the env vars marked `sync: false`:
   - `DATABASE_URL` — the Neon string from step 2
   - `ANTHROPIC_API_KEY` — your Claude API key
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — any long random strings (`openssl rand -hex 32`)
   - `ENCRYPTION_KEY` — 32-byte hex (`openssl rand -hex 32`)
   - `CORS_ORIGINS` — leave a placeholder for now (e.g. `https://placeholder.vercel.app`), fill in
     for real after step 4. Browser calls go through the Vercel rewrite so this mostly matters as a
     fallback, but set it anyway.
3. Deploy. First build takes a few minutes. Note the service URL Render assigns, e.g.
   `https://monark-api.onrender.com` (if `monark-api` is taken, Render suffixes it — grab whatever it
   actually gives you).
4. **Free-tier caveat**: the service spins down after ~15 min idle, first request after that takes
   30-60s. Fine for a portfolio demo, mention it if anyone's testing live.

## 4. Vercel (both frontends)

Do this twice, once per app — same GitHub repo, different project root.

1. [vercel.com](https://vercel.com) → sign up free → **Add New → Project** → import `healthtracker`.
2. **Root Directory**: `apps/admin` (repeat later with `apps/patient-web`). Vercel auto-detects Vite.
3. No env vars needed — the `vercel.json` rewrite in each app handles the API connection.
4. Deploy. Note the URL Vercel gives you (e.g. `https://monark-admin.vercel.app`).
5. **Before or right after deploying**, open `apps/admin/vercel.json` and `apps/patient-web/vercel.json`
   and replace `https://monark-api.onrender.com` with the actual Render URL from step 3.3 if it
   differs. Commit + push — Vercel redeploys automatically.
6. Repeat steps 2-4 for `apps/patient-web`.
7. Go back to Render and update `CORS_ORIGINS` to the two real Vercel URLs (comma-separated), redeploy.

## 5. Smoke test

1. Open the admin Vercel URL → log in with `admin@monarkhealth.com` / seed password → confirm the
   dashboard loads (first request will be slow if Render's cold-started).
2. Open the patient-web Vercel URL → log in with a seeded patient account → confirm data loads.
3. Check Render logs for the `migrate deploy` line on startup to confirm it ran clean.
4. Hit `https://<render-url>/health` directly — should return `{"ok":true,"service":"monark-api"}`.

## Known trade-offs of this free path

- Render cold starts (~30-60s) after idle — not suitable for anything time-sensitive.
- Neon free tier has its own idle-suspend behavior for the *compute* (not data loss — it just needs a
  moment to resume on first query after inactivity, stacks with Render's cold start on a fully cold demo).
- No custom domains configured here — both Vercel and Render give you free `*.vercel.app` /
  `*.onrender.com` subdomains, which is what `vercel.json` currently points at.
