# FuelTrack Roadmap

FuelTrack v2 is a fuel tracker for vehicles **without a fuel gauge**. It estimates how far you can
ride before you hit reserve, from reserve moments, fills and odometer readings.

## Completed

### v1 (superseded by v2)

* Email/password login, vehicles, fuel entries, dashboard, history, calendar, account
* Reserve-to-reserve mileage, validation, fill date, row level security, unit tests

---

### v2 Foundation

* Fresh database schema: single event log (fill, reserve, odometer) with exact integer units
* Optional tank capacity and reserve volume per vehicle

### v2 Calculation Engine

* Cycles between known tank levels (reserve → reserve, full → full, mixed when tank info is set)
* Virtual fuel gauge: km to reserve, reserve expected at, reserve range, confidence
* Odometer projection from average km per day
* Stats: cost per km, spend and litres per month, km per day, efficiency trend

### v2 API

* Profile, vehicles, events (idempotent create), stats and CSV export endpoints

### v2 Design

* Mobile-first app shell with bottom navigation and thumb-reach action bar
* Onboarding with initial fuel state
* Home gauge, add fuel, one-tap reserve with odometer filled later (trip meter supported)
* Offline reserve tap with sync when back online
* History grouped by cycle, stats, vehicles, settings
* Minimal neutral theme with one ocean-blue accent (#0077b6), light and dark, AA contrast

### v2 Phone App

* Installable PWA with "On reserve" and "Add fuel" home-screen shortcuts
* App shell cached for offline opening
* Installed app reloads itself once when a newer version is deployed

### Reminders

* Low-fuel reminder notifications (user-set km threshold, shown when the app opens, once per tank)
* Service reminders: oil change interval per vehicle, due/overdue notice on Home and a notification within 100 km
* Document reminders: insurance, PUC, RC, licence expiry dates with reminders 30 and 7 days before
* Service log: several service items (oil, chain, air filter, brake pads, spark plug, tyres) with km/time intervals and a history of services with cost (replaces the single oil change reminder)
* Issues and repairs: note problems as they appear, keep them open until a repair visit fixes them; visits are Maintenance or Repair with separate cost totals
* Service visits and expenses can be edited after saving
* Mileage drop alert: Home notice and a notification when the latest 2 cycles are 15% or more below the usual mileage
* In-app guide (how it works, setup, habits, tips, reminders) and per-phone customisation: Home tiles on/off, document reminder lead times
* All expenses: repairs, parts, insurance, parking, tolls, washes by category; total cost of ownership and true cost per km

---

## In Progress

_Nothing in progress._

---

## Planned

### Vehicle Manager

* Yearly summary (km, spend, mileage) and CSV import to restore a backup

### Usability

* Default fill entry: choose whether Add fuel starts from amount or litres

### AI (free, on-device)

* Photo to entry: read pump display / receipt and odometer from a photo with Transformers.js (Hugging Face models running in the app), always confirmed by the user

### Android

* Android app: start by packaging the PWA for the Play Store (Trusted Web Activity); native app later if needed
