# FuelTrack — Project Status & Handoff

_Last updated: 7 Oct 2026 (after go-live). Read this first in any new session._

## What the app is

FuelTrack v2 is a fuel tracker for bikes and scooters **without a fuel gauge**. It estimates how far
the rider can go before reserve from three signals: going on reserve (one-tap "On reserve"), fills,
and odometer readings. Stack: Next.js 16 (App Router) · React 19 · Tailwind 4 · Supabase Auth ·
Postgres via Prisma 7 (`@prisma/adapter-pg`) · Recharts · Jest. Installable PWA.

## Where things stand

**v2 is live** (go-live completed by the owner on 7 Oct 2026).

- **Code:** v2 is merged into `master` (PR #50). Branch `master` is what Vercel deploys.
- **Database (Supabase):** all migrations are applied, including `20261008090000_v2_fresh_start`.
  Tables are `User`, `Vehicle`, `Event`, with RLS enabled. The v1 data was wiped as agreed.
- **Deploy (Vercel):** production runs v2. The env vars `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `DATABASE_URL` (transaction pooler, rotated password) are set.
- **Supabase Auth:** Site URL and redirect URLs point to the Vercel production URL (plus
  `http://localhost:3000`).
- **Phone:** installed as a PWA from the production URL.
- **Checks:** lint, typecheck, 46 unit tests, 4 DB integration tests and the production build pass.
- **Local setup (owner's Windows laptop, VS Code, PowerShell):** `.env` holds all four variables;
  `.env.local` holds only the two `NEXT_PUBLIC_…` keys.
- **Design mockups:** Figma file "FuelTrack v2 — Mockups" and a Claude design canvas (reference only).

## Direction (keep in mind for every change)

- **Android app later.** Keep it reusable: business rules stay in pure functions (`lib/engine.ts`,
  `lib/validation.ts`), all data goes through the JSON API with a bearer token (no server-rendered
  data or cookie-only auth), and web-only features (notifications, service worker) stay optional.
  First step will be packaging the PWA (Trusted Web Activity); a native app can reuse the API.
- **AI must be free.** Prefer on-device models (Transformers.js / Hugging Face) over paid APIs.

## What to work on next

- `ROADMAP.md` → In Progress / Planned: the "complete vehicle manager" plan, then customisation,
  an in-app guide, on-device AI and an Android app.
- Low-fuel reminders run only when the app opens (no server push). True background push would need
  Web Push (VAPID keys, a subscription table) plus a scheduled job.
- `npm audit` reports dependency warnings; review them carefully. Never run `npm audit fix --force`,
  which can upgrade Next.js and break the app.
- Any database change needs a new Prisma migration, applied with `npx prisma migrate deploy`
  (uses `DIRECT_URL`).

## Map of the code

| Area | Files |
|---|---|
| Calculation engine (cycles, gauge, stats, low-fuel check) | `lib/engine.ts` + `tests/engine.test.ts` |
| Document reminders | `app/documents`, `app/api/documents/**`, `Document` table, `daysUntil`/`documentStage` in `lib/engine.ts` |
| Expenses / cost of ownership | `app/expenses`, `app/api/expenses/**`, `app/api/vehicles/[id]/expenses`, `Expense` table, `ownershipCost` in `lib/engine.ts`, card on `app/stats` |
| Mileage drop alert | `mileageDrop` in `lib/engine.ts` (via `summarizeVehicle`), notice on `app/page.tsx`, notification in `lib/fuel-context.tsx` |
| Service log | `app/service`, `app/api/service-items/**`, `app/api/service-records/**`, `app/api/vehicles/[id]/service-*`, `ServiceItem`/`ServiceRecord`/`ServiceRecordItem`/`Issue` tables, `app/api/issues/**`, `app/api/vehicles/[id]/issues`, `serviceStatus` in `lib/engine.ts` |
| Low-fuel reminders | `notifyLowFuel` in `lib/fuel-context.tsx`, Settings card, `User.lowFuelKm`, `notificationclick` in `public/sw.js` |
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
- **Installed app updates:** `components/ServiceWorker.tsx` compares `NEXT_PUBLIC_BUILD_ID` (commit SHA baked in
  at build) with `/api/version` on open/foreground and reloads once if they differ (never on `/fill`
  or `/quick/reserve`). Locally both are "dev", so it never fires.
- **Deprecated columns:** `Vehicle.serviceIntervalKm` and `lastServiceOdometer` were copied into
  `ServiceItem` ("Engine oil") and are no longer read or written. Drop them in a later migration.
- **Figma** is on a Starter plan: one mode per variable collection.

## How to work on it

- Follow `AGENTS.md`: pick tasks from `ROADMAP.md` → Planned. Commit and push after each logical
  step; run `npm run lint`, `npm run typecheck`, `npm test` before pushing.
- After PR #50 is merged, start new work on a fresh branch from `master`.
- Next: see `ROADMAP.md` → In Progress and Planned.
