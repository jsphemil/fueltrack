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

### v2 Phone App

* Installable PWA with "On reserve" and "Add fuel" home-screen shortcuts
* App shell cached for offline opening

### Reminders

* Low-fuel reminder notifications (user-set km threshold, shown when the app opens, once per tank)
* Service reminders: oil change interval per vehicle, due/overdue notice on Home and a notification within 100 km

---

## In Progress

_Nothing in progress._

---

## Planned

_Nothing planned._
