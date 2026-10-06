// Remembers the active vehicle across pages (per browser).
const STORAGE_KEY = "fueltrack:selectedVehicleId";

export function readSelectedVehicleId() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeSelectedVehicleId(vehicleId: string | null) {
  try {
    if (vehicleId) {
      window.localStorage.setItem(STORAGE_KEY, vehicleId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage unavailable (private mode); selection just won't persist.
  }
}
