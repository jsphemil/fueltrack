"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import FuelEntryForm from "@/components/FuelEntryForm";
import VehicleForm from "@/components/VehicleForm";

type FuelEntry = {
  id: string;
  odometer: number;
  fuel_volume: number;
  is_reserve: boolean;
  created_at: string;
};

type Vehicle = {
  id: string;
  name: string;
};

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState("");
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState("");

  const mileageStats = useMemo(() => {
    const orderedEntries = [...entries].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const calculations: number[] = [];

    for (let index = 1; index < orderedEntries.length; index += 1) {
      const previous = orderedEntries[index - 1];
      const current = orderedEntries[index];

      if (!previous.is_reserve || !current.is_reserve) {
        continue;
      }

      const distance = current.odometer - previous.odometer;
      if (distance < 20) {
        continue;
      }

      const fuelUsed = previous.fuel_volume;
      if (fuelUsed <= 0) {
        continue;
      }

      calculations.push(distance / fuelUsed);
    }

    if (calculations.length === 0) {
      return null;
    }

    const lastMileage = calculations[calculations.length - 1];
    const averageMileage =
      calculations.reduce((sum, value) => sum + value, 0) / calculations.length;

    return { lastMileage, averageMileage };
  }, [entries]);

  const rangeAndInsight = useMemo(() => {
    if (!mileageStats || entries.length === 0) {
      return null;
    }

    const latestEntry = entries[0];
    const estimatedRange = latestEntry.fuel_volume * mileageStats.averageMileage;
    const nextRefuelOdometer = latestEntry.odometer + estimatedRange;

    let insight = "Mileage stable";
    if (mileageStats.lastMileage < mileageStats.averageMileage) {
      insight = "Mileage decreased";
    } else if (mileageStats.lastMileage > mileageStats.averageMileage) {
      insight = "Mileage improved";
    }

    return { estimatedRange, nextRefuelOdometer, insight };
  }, [entries, mileageStats]);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicles]
  );

  const fetchEntries = useCallback(async (accessToken?: string) => {
    if (!accessToken) {
      setEntries([]);
      return;
    }

    setEntriesLoading(true);
    setEntriesError("");

    const headers: HeadersInit = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch("/api/fuel-entry", {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      setEntriesError("Could not load fuel entries.");
      setEntriesLoading(false);
      return;
    }

    const result = (await response.json()) as { entries: FuelEntry[] };
    setEntries(result.entries ?? []);
    setEntriesLoading(false);
  }, []);

  const fetchVehicles = useCallback(async (accessToken?: string) => {
    if (!accessToken) {
      setVehicles([]);
      setSelectedVehicleId(null);
      return;
    }

    setVehiclesLoading(true);
    setVehiclesError("");

    const response = await fetch("/api/vehicle", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      setVehiclesError("Could not load vehicles.");
      setVehiclesLoading(false);
      return;
    }

    const result = (await response.json()) as { vehicles: Vehicle[] };
    const nextVehicles = result.vehicles ?? [];
    setVehicles(nextVehicles);
    setSelectedVehicleId((currentValue) => {
      if (nextVehicles.length === 0) {
        return null;
      }

      if (currentValue && nextVehicles.some((vehicle) => vehicle.id === currentValue)) {
        return currentValue;
      }

      return nextVehicles[0].id;
    });
    setVehiclesLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setSession(data.session);
      setLoading(false);
      if (data.session) {
        void fetchEntries(data.session.access_token);
        void fetchVehicles(data.session.access_token);
      } else {
        setEntries([]);
        setVehicles([]);
        setSelectedVehicleId(null);
      }
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      if (nextSession) {
        void fetchEntries(nextSession.access_token);
        void fetchVehicles(nextSession.access_token);
      } else {
        setEntries([]);
        setVehicles([]);
        setSelectedVehicleId(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchEntries, fetchVehicles]);

  async function handleSignOut() {
    setErrorMessage("");
    const { error } = await supabase.auth.signOut();
    if (error) {
      setErrorMessage(error.message);
    }
  }

  const isAuthenticated = Boolean(session);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <section className="mx-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">FuelTrack</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Track your fuel usage once you sign in with Email and Password.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-zinc-700">Checking session...</p>
        ) : isAuthenticated ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-zinc-700">
              Signed in as{" "}
              <span className="font-medium text-zinc-900">
                {session?.user.email}
              </span>
              .
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              className="h-11 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Go to Login
            </Link>
          </div>
        )}

        {errorMessage ? (
          <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p>
        ) : null}

        {isAuthenticated ? (
          <section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-zinc-900">Vehicle</h2>

            {vehiclesLoading ? (
              <p className="mt-3 text-sm text-zinc-600">Loading vehicles...</p>
            ) : vehiclesError ? (
              <p className="mt-3 text-sm font-medium text-red-600">{vehiclesError}</p>
            ) : vehicles.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-600">No vehicles available yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-zinc-700">
                    Select Vehicle
                  </span>
                  <select
                    value={selectedVehicleId ?? ""}
                    onChange={(event) => setSelectedVehicleId(event.target.value)}
                    className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
                  >
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-sm text-zinc-700">
                  Selected vehicle:{" "}
                  <span className="font-medium text-zinc-900">
                    {selectedVehicle?.name}
                  </span>
                </p>
              </div>
            )}
          </section>
        ) : null}

        {isAuthenticated ? (
          <VehicleForm />
        ) : null}

        {isAuthenticated ? (
          <FuelEntryForm onSaved={() => fetchEntries(session?.access_token)} />
        ) : null}

        {isAuthenticated ? (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-900">Mileage</h2>

            {mileageStats ? (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm text-zinc-700">
                  Last mileage:{" "}
                  <span className="font-medium text-zinc-900">
                    {mileageStats.lastMileage.toFixed(1)} km/l
                  </span>
                </p>
                <p className="mt-1 text-sm text-zinc-700">
                  Average mileage:{" "}
                  <span className="font-medium text-zinc-900">
                    {mileageStats.averageMileage.toFixed(1)} km/l
                  </span>
                </p>
                {rangeAndInsight ? (
                  <>
                    <p className="mt-1 text-sm text-zinc-700">
                      Estimated Range:{" "}
                      <span className="font-medium text-zinc-900">
                        {rangeAndInsight.estimatedRange.toFixed(1)} km
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-zinc-700">
                      Refuel by:{" "}
                      <span className="font-medium text-zinc-900">
                        {Math.round(
                          rangeAndInsight.nextRefuelOdometer
                        ).toLocaleString()}{" "}
                        km
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-zinc-700">
                      Insight:{" "}
                      <span className="font-medium text-zinc-900">
                        {rangeAndInsight.insight}
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-zinc-600">
                    Not enough data to estimate range
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-600">
                Not enough data to calculate mileage
              </p>
            )}

            <h2 className="mt-8 text-lg font-semibold text-zinc-900">
              Fuel Entries
            </h2>

            {entriesLoading ? (
              <p className="mt-3 text-sm text-zinc-600">Loading entries...</p>
            ) : entriesError ? (
              <p className="mt-3 text-sm font-medium text-red-600">
                {entriesError}
              </p>
            ) : entries.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-600">No fuel entries yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {entries.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <p className="text-sm text-zinc-700">
                      Odometer:{" "}
                      <span className="font-medium text-zinc-900">
                        {entry.odometer}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-zinc-700">
                      Fuel Volume:{" "}
                      <span className="font-medium text-zinc-900">
                        {entry.fuel_volume.toFixed(2)} L
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-zinc-700">
                      Filled at reserve:{" "}
                      <span className="font-medium text-zinc-900">
                        {entry.is_reserve ? "Yes" : "No"}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-zinc-700">
                      Created at:{" "}
                      <span className="font-medium text-zinc-900">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </section>
    </main>
  );
}
