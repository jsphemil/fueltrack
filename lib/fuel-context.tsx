"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import { apiRequest } from "@/lib/api";
import { isLowFuel, isServiceDue } from "@/lib/engine";
import { formatServiceDue } from "@/lib/format";
import { flushOutbox, getOutbox, getServerOutbox, queueEvent, subscribeOutbox, type OutboxItem } from "@/lib/outbox";
import type { Me, VehicleSummary } from "@/lib/types";

const ACTIVE_VEHICLE_KEY = "fueltrack:activeVehicleId";
// Last loaded data, so the app (and the reserve tap) works when opened offline.
const CACHE_KEY = "fueltrack:cache";
// "low:<vehicleId>" → last fill id and "service:<vehicleId>" → last service
// odometer already reminded about: once per tank and once per service.
const LOW_FUEL_KEY = "fueltrack:lowFuelNotified";

type FuelContextValue = {
  me: Me | null;
  vehicles: VehicleSummary[]; // not archived
  allVehicles: VehicleSummary[];
  activeVehicle: VehicleSummary | null;
  setActiveVehicleId: (id: string) => void;
  loading: boolean;
  loaded: boolean; // the server answered at least once (not just cached data)
  error: string;
  refresh: () => Promise<void>;
  outbox: OutboxItem[];
  // Saves an entry through the offline outbox and refreshes once it syncs.
  saveEntry: (body: Record<string, unknown> & { id: string }) => Promise<void>;
  sync: () => Promise<void>;
};

const FuelContext = createContext<FuelContextValue | null>(null);

function readCache(): { me: Me | null; vehicles: VehicleSummary[] } | null {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "null");
    return parsed && typeof parsed === "object" ? (parsed as { me: Me | null; vehicles: VehicleSummary[] }) : null;
  } catch {
    return null;
  }
}

function writeCache(me: Me | null, vehicles: VehicleSummary[]) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ me, vehicles }));
  } catch {
    // Cache is optional.
  }
}

export function clearFuelCache() {
  try {
    window.localStorage.removeItem(CACHE_KEY);
    window.localStorage.removeItem(ACTIVE_VEHICLE_KEY);
  } catch {
    // Nothing to clear.
  }
}

// Shows a phone notification for each vehicle that is newly low on fuel or
// due an oil change. Runs when the app loads data; it can't fire while the
// app is closed. Permission is asked for in Settings (low-fuel reminder).
async function notifyReminders(vehicles: VehicleSummary[], thresholdKm: number | null) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  let notified: Record<string, string>;
  try {
    notified = JSON.parse(window.localStorage.getItem(LOW_FUEL_KEY) ?? "{}") as Record<string, string>;
  } catch {
    notified = {};
  }
  const show = async (key: string, id: string, title: string, body: string) => {
    if (notified[key] === id) return;
    try {
      // Android only shows notifications through the service worker.
      const options = { body, icon: "/icon/192", tag: key };
      const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
      if (registration) await registration.showNotification(title, options);
      else new Notification(title, options);
      notified[key] = id;
    } catch {
      // Notifications are optional.
    }
  };
  for (const vehicle of vehicles) {
    if (isLowFuel(vehicle.gauge, thresholdKm)) {
      await show(`low:${vehicle.id}`, vehicle.lastFill?.id ?? "", `${vehicle.name}: low on fuel`, `About ${vehicle.gauge.kmToReserve} km to reserve. Fill up soon.`);
    }
    if (isServiceDue(vehicle.serviceDueKm)) {
      const serviceId = String(vehicle.lastServiceOdometer ?? vehicle.startOdometer);
      await show(`service:${vehicle.id}`, serviceId, `${vehicle.name}: service due`, `${formatServiceDue(vehicle.serviceDueKm as number)}.`);
    }
  }
  try {
    window.localStorage.setItem(LOW_FUEL_KEY, JSON.stringify(notified));
  } catch {
    // Worst case the reminder repeats.
  }
}

function readActiveVehicleId() {
  try {
    return window.localStorage.getItem(ACTIVE_VEHICLE_KEY);
  } catch {
    return null;
  }
}

export function FuelProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [allVehicles, setAllVehicles] = useState<VehicleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [activeVehicleId, setActiveVehicleIdState] = useState<string | null>(null);
  const outbox = useSyncExternalStore(subscribeOutbox, getOutbox, getServerOutbox);

  const refresh = useCallback(async () => {
    const [meResult, vehiclesResult] = await Promise.all([
      apiRequest<{ user: Me }>("/api/me"),
      apiRequest<{ vehicles: VehicleSummary[] }>("/api/vehicles"),
    ]);

    if (meResult.ok) setMe(meResult.data.user);
    if (vehiclesResult.ok) {
      setAllVehicles(vehiclesResult.data.vehicles);
      setLoaded(true);
      setError("");
      writeCache(meResult.ok ? meResult.data.user : null, vehiclesResult.data.vehicles);
    } else if (vehiclesResult.status !== 0) {
      setError(vehiclesResult.error);
    } else {
      setError("You're offline. Showing the last loaded data.");
    }
    setLoading(false);
  }, []);

  const sync = useCallback(async () => {
    const saved = await flushOutbox();
    if (saved > 0) await refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const timerId = window.setTimeout(() => {
      setActiveVehicleIdState(readActiveVehicleId());
      const cached = readCache();
      if (cached) {
        setMe(cached.me);
        setAllVehicles(cached.vehicles);
        setLoading(false);
      }
      void refresh().then(sync);
    }, 0);

    const onOnline = () => void sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync().then(refresh);
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, refresh, sync]);

  const lowFuelKm = me?.lowFuelKm ?? null;
  useEffect(() => {
    if (loaded) void notifyReminders(allVehicles.filter((vehicle) => !vehicle.archived), lowFuelKm);
  }, [loaded, allVehicles, lowFuelKm]);

  const setActiveVehicleId = useCallback((id: string) => {
    setActiveVehicleIdState(id);
    try {
      window.localStorage.setItem(ACTIVE_VEHICLE_KEY, id);
    } catch {
      // Selection just won't persist.
    }
  }, []);

  const saveEntry = useCallback(
    async (body: Record<string, unknown> & { id: string }) => {
      queueEvent(body);
      await sync();
    },
    [sync]
  );

  const value = useMemo<FuelContextValue>(() => {
    const vehicles = allVehicles.filter((vehicle) => !vehicle.archived);
    const activeVehicle = vehicles.find((vehicle) => vehicle.id === activeVehicleId) ?? vehicles[0] ?? null;
    return { me, vehicles, allVehicles, activeVehicle, setActiveVehicleId, loading, loaded, error, refresh, outbox, saveEntry, sync };
  }, [me, allVehicles, activeVehicleId, setActiveVehicleId, loading, loaded, error, refresh, outbox, saveEntry, sync]);

  return <FuelContext.Provider value={value}>{children}</FuelContext.Provider>;
}

export function useFuel() {
  const value = useContext(FuelContext);
  if (!value) throw new Error("useFuel must be used inside FuelProvider");
  return value;
}
