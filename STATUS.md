# FuelTrack — Project Status & Handoff

_Last updated: 7 Oct 2026. Read this first in any new session._

## What the app is

FuelTrack v2 is a fuel tracker for bikes and scooters **without a fuel gauge**. It estimates how far
the rider can go before reserve from three signals: going on reserve (one-tap "On reserve"), fills,
and odometer readings. Stack: Next.js 16 (App Router) · React 19 · Tailwind 4 · Supabase Auth ·
Postgres via Prisma 7 (`@prisma/adapter-pg`) · Recharts · Jest. Installable PWA.

## Where things stand

- **Code:** v2 is merged into `master` (PR #50, https://github.com/jsphemil/fueltrack/pull/50).
- **Checks:** lint, typecheck, 46 unit tests, 4 DB integration tests and the production build pass.
  The full flow was tested in Chromium against a local Postgres.
- **Database (Supabase):** v1 migrations are applied. The v2 migration
  `20261008090000_v2_fresh_start` is **not applied yet**. It drops the v1 tables (agreed: start
  fresh) and creates `User`, `Vehicle`, `Event`, with RLS enabled.
- **Deploy (Vercel):** production still runs v1 until PR #50 is merged.
- **Design mockups:** Figma file "FuelTrack v2 — Mockups" and a Claude design canvas (not needed to
  run the app).

## Go-live checklist (owner does these)

1. Reset the Supabase database password; update `.env` (local) and Vercel.
2. `git pull`, `npm install`, `npx prisma migrate deploy` (applies v2; wipes v1 data).
3. Test locally with `npm run dev`.
4. Supabase → Authentication → URL Configuration: set the Site URL to the Vercel production URL.
5. Vercel → Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `DATABASE_URL`.
6. Merge PR #50, then check the production deploy and install it on the phone.

## Map of the code

| Area | Files |
|---|---|
| Calculation engine (cycles, gauge, stats) | `lib/engine.ts` + `tests/engine.test.ts` |
| Input validation (shared by UI and API) | `lib/validation.ts` + `tests/validation.test.ts` |
| Units (paise, ml, tenths of km) | `lib/units.ts` |
| Server helpers (auth wrapper, summaries) | `lib/server.ts`, `lib/auth.ts`, `lib/prisma.ts` |
| API routes | `app/api/me`, `app/api/vehicles/**`, `app/api/events/**`, `app/api/export` |
| Client data + offline outbox | `lib/fuel-context.tsx`, `lib/outbox.ts`, `lib/api.ts`, `lib/hooks.ts` |
| Pages | `app/page.tsx` (Home), `app/quick/reserve`, `app/fill`, `app/history`, `app/stats`, `app/vehicles`, `app/settings`, `app/onboarding`, `app/login` |
| Shell, UI, motion | `components/AppShell.tsx`, `components/ui.tsx`, `components/Gauge.tsx`, `lib/motion.ts`, `app/globals.css` |
| PWA | `app/manifest.ts`, `app/icon.tsx`, `app/apple-icon.tsx`, `public/sw.js`, `components/ServiceWorker.tsx` |
| Database | `prisma/schema.prisma`, `prisma/migrations/*`, `prisma.config.ts` |

## Gotchas learned the hard way

- **Two database URLs.** `DATABASE_URL` is the Supabase transaction pooler (port 6543,
  `?pgbouncer=true`) and is used by the app. `DIRECT_URL` is the session pooler (port 5432) and is
  used only by Prisma migrations. Migrations hang or time out through port 6543.
- **Keep database URLs in `.env` only.** Next.js reads `.env.local` before `.env`, so a stale URL in
  `.env.local` breaks the app while Prisma commands still work ("Failed to fetch vehicles").
- **Migration lock timeout (P1002, advisory lock):** an earlier stuck migrate still holds the lock.
  In the Supabase SQL Editor run
  `select pg_terminate_backend(pid) from pg_locks where locktype='advisory' and objid=72707369;`
  then retry. If that doesn't clear it, restart the project (Settings → General).
- **Prisma client must be regenerated after schema changes.** `npm run dev` does this; if you see
  unknown-field errors, run `npx prisma generate` and delete `.next`.
- **`next-env.d.ts` is generated** by Next.js on every `npm run dev`/`npm run build` and is not
  committed. If git ever blocks a branch switch on it: `git restore next-env.d.ts`.
- **Figma** is on a Starter plan: one mode per variable collection.

## How to work on it

- Follow `AGENTS.md`: pick tasks from `ROADMAP.md` → Planned. Commit and push after each logical
  step; run `npm run lint`, `npm run typecheck`, `npm test` before pushing.
- After PR #50 is merged, start new work on a fresh branch from `master`.
- Next planned items: low-fuel reminder notifications, service reminders (see `ROADMAP.md`).
