# FuelTrack

FuelTrack is a web app to track motorcycle fuel usage, mileage, range and spend using the reserve-to-reserve method.

## Features

* Email and password login
* Multiple vehicles per user
* Fuel entry tracking with fill date (add, edit, delete)
* Reserve-to-reserve mileage calculation
* Range and next-reserve prediction
* Monthly analytics, charts and calendar view

## How mileage is calculated

Mark a fill as **Filled at reserve** when the tank had dropped to reserve before filling.
A *cycle* runs from one reserve fill to the next reserve fill:

* distance = odometer at the closing reserve fill − odometer at the opening reserve fill
* litres = all fuel added from the opening reserve fill up to (not including) the closing one
* mileage = distance ÷ litres

Partial top-ups between reserve fills are therefore counted correctly. Average mileage is
total cycle distance ÷ total cycle litres. Range is average mileage × litres added since the
last reserve fill. All calculations live in `lib/mileage.ts` and are shared by the API and UI.

## Tech Stack

* Next.js (App Router) + React
* Tailwind CSS
* Supabase (Auth)
* Postgres + Prisma
* Recharts
* Vercel

## Setup

```bash
npm install
cp .env.example .env.local   # fill in your values
```

Prisma reads `DATABASE_URL` from `.env` (see `prisma.config.ts`), so put it there as well.

Apply database migrations:

```bash
npx prisma migrate deploy
```

If your database was created before the baseline migration existed (tables already present),
mark the baseline as applied once before deploying:

```bash
npx prisma migrate resolve --applied 20260101000000_init
npx prisma migrate deploy
```

Run the app:

```bash
npm run dev
```

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
