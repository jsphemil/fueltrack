# FuelTrack Roadmap

## Completed

### Core Features

* Authentication (email/password)
* Vehicle creation and selection
* Fuel entry CRUD
* Odometer validation
* Correct mileage calculation
* Range prediction
* Next refuel prediction
* Dashboard metrics
* Separate history page
* Vehicle-specific history
* Navigation system (basic, layout-safe implementation)
* Delete vehicle option
* Hide navigation bar on login/signup page
* Add confirmation before deleting a vehicle
* Add confirmation before resetting account
* Validate first fuel entry against initial vehicle odometer
* Dedicated vehicle page navigation
* Add Account page navigation
* Create Account page (/account)
* Create a dedicated /vehicle page listing all user vehicles
* Capture vehicle type during vehicle creation
* Display vehicle type in vehicle page
* Add vehicle-level statistics:

  * average mileage
  * last odometer reading
  * total fuel spend
* Convert vehicle list into card-based UI with vehicle stats
* Improve vehicle card readability and layout
* Improve dashboard layout with card-based metrics
* Monthly fuel spend tracking
* Monthly analytics summary (spend, distance, mileage)
* Monthly spend trend chart
* Calendar-based entry view
* Add vehicle-wise average mileage chart
* Move "Add Vehicle" to Account page
* Move "Reset Account" to Account page
* Provide vehicle deletion from Account page vehicle list
* Add vehicle edit option from Account page vehicle list
* Provide vehicle deletion option in each vehicle card

---

### Application Structure

* Separate Dashboard and Account responsibilities
* Move management actions out of dashboard
* Separate Add Entry into dedicated page

---

### Profile System (Basic)

* User profile table (name)
* First-time profile capture on login
* Profile page (view/edit)
* Show user name in app header (fallback to email)

---

### Current UI State

* Dashboard layout with metric cards and analytics section
* Dashboard limited to:

  * vehicle selection
  * vehicle-specific metrics
  * last 3 entries
  * monthly analytics summary
  * monthly spend chart
* Entry page for fuel input
* History page for full entry list
* Account page for vehicle and profile management
* Vehicle page with card-based layout and stats
* Calendar page for date-based entry exploration
* Implement responsive layout for desktop screens across dashboard, entry, history, vehicle, and account pages

---

## Planned

### Dashboard Improvements

* Extend dashboard with additional analytics insights

---

### UI / UX Improvements


---

### Vehicle Management Page

* Support vehicle selection from this page

---

### User Profile System (Enhancements)

* Improve first-time profile setup UX
* Profile validation and persistence enhancements

---

### Future Enhancements

* Multi-vehicle analytics comparison
* Additional charts:

  * mileage trend over time
  * consumption patterns
* Theme customization (dark/light)
