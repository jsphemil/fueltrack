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
* Minimal neutral theme (greys, charcoal in dark mode) with one ocean-blue accent (#0077b6 light, #48cae4 dark), AA contrast; orange is kept for reserve and warnings only

### v2 Phone App

* Installable PWA with "On reserve" and "Add fuel" home-screen shortcuts
* App shell cached for offline opening
* Installed app reloads itself once when a newer version is deployed

### Reminders (shown when the app opens, once each)

* Low-fuel reminder with a user-set km threshold (once per tank)
* Document reminders: insurance, PUC, RC, licence and other expiry dates; lead times chosen in Settings (60+14, 30+7 or 7 days)
* Service reminders per item, due within 100 km or 14 days
* Mileage drop alert: Home notice and a notification when the latest 2 cycles are 15% or more below the usual mileage

### Vehicle Manager

* Service log: service items (oil, chain, air filter, brake pads, spark plug, tyres...) with km and/or month intervals, and a history of visits with cost. Replaced the single oil change reminder; existing reminders were migrated
* Issues and repairs: note problems, keep them open until a repair visit fixes them. Visits are Maintenance or Repair, with separate cost totals and a history filter
* Expenses by category (parts, insurance, tax/RC, parking, toll, wash, accessories, fine, other) and a cost of ownership on Stats with an all-in cost per km
* Service visits and expenses can be edited after saving

### Usability

* In-app guide (setup, habits, how estimates work, tips, reminders, costs)
* Customisation saved to the account: Home tiles on/off, document reminder timing, Reset to defaults

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
