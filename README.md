# FuelTrack

**The fuel gauge your bike doesn't have.** FuelTrack is for motorcycles and scooters without a fuel
gauge. It tells you roughly how far you can ride before you hit reserve, using three things you
already notice: when the bike goes on reserve, when you fill up, and the odometer.

## How to use it

1. **Bike sputters? Switch to reserve**, reset your trip meter to 0, and tap **On reserve** when it's
   safe. One tap, no typing, works without signal. On an installed app, long-press the icon for the
   shortcut.
2. **At the pump, tap Add fuel.** Enter the odometer and any two of amount, price per litre and
   litres. If you reset the trip meter, enter its reading so the app knows exactly where reserve
   started.
3. **Home shows the estimate**: "≈ 197 km to reserve", where reserve is expected, km you get on
   reserve, and a fuel gauge. It sharpens with every reserve-to-reserve cycle.

## How the estimate works

The tank level is only known at two moments: **on reserve** and **full tank**. Between two such
moments, the fuel burned is the fuel you added (for reserve → reserve or full → full), so:

`mileage = km between them ÷ litres added in between`

Partial top-ups are counted, and with tank capacity and reserve set, mixed cycles (reserve → full,
full → reserve) count too. Predictions use the distance-weighted mileage of your last 5 cycles. The
km left to reserve is `(litres added since reserve − km ridden since ÷ mileage) × mileage`. If you
haven't logged the odometer for a while, it is projected from your average km per day and marked as
estimated. Everything is in `lib/engine.ts` and covered by tests in `tests/engine.test.ts`.

Money, litres and distance are stored as integers (paise, millilitres, tenths of a km) so totals stay
exact.

## Tech stack

Next.js (App Router) · React · Tailwind CSS · Supabase Auth · Postgres + Prisma · Recharts · Jest.
Installable as a PWA (manifest, home-screen shortcuts, offline app shell); entries made offline wait
in a local outbox and sync when you're back online.

## Setup

```bash
npm install
cp .env.example .env   # fill in your values
npx prisma migrate deploy
npm run dev
```

`.env` needs:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase → Project Settings → API
- `DATABASE_URL`: the app's connection (Supabase **transaction pooler**, port 6543, `?pgbouncer=true`)
- `DIRECT_URL`: used only by migrations (Supabase **session pooler**, port 5432)

Keep the database URLs in `.env` only. Next.js reads `.env.local` first, so a stale copy there
overrides `.env` for the app but not for Prisma.

## Checks

```bash
npm run lint
npm run typecheck
npm test            # unit tests (engine, validation)
npm run build
```

API integration tests run against a real Postgres database when `TEST_DATABASE_URL` is set. They
delete data, so never point them at production:

```bash
TEST_DATABASE_URL=postgresql://postgres@localhost:5432/fueltrack_test npm test
```
