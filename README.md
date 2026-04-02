# FuelTrack

FuelTrack is a web app to track motorcycle fuel usage, mileage, and range using a reserve-to-reserve method.

## Features

* Email login (magic link)
* Fuel entry tracking
* Mileage calculation
* Range estimation

## Tech Stack

* Next.js
* Tailwind CSS
* Supabase (Auth + Database)
* Prisma
* Vercel

## Setup

```bash
npm install
npm run dev
```

Create a `.env.local` file with:

```
NEXT_PUBLIC_SUPABASE_URL=https://beckwmljmonqpuepmtka.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlY2t3bWxqbW9ucXB1ZXBtdGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjI3OTYsImV4cCI6MjA5MDY5ODc5Nn0.CjHAWVZAaW5yLmXpa6_B9ZHYQ-QNHpOD7tUnR9Nkx-g
```
