"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type FuelEntry = {
  id: string;
  odometer: number;
  fuel_price: number;
  amount_paid: number;
  fuel_volume: number;
  is_reserve: boolean;
  vehicleId: string | null;
  created_at: string;
};

type Vehicle = {
  id: string;
  name: string;
};

export default function HistoryPage() {
  const searchParams = useSearchParams();
  const initialVehicleId = searchParams.get("vehicleId");
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    initialVehicleId
  );
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState("");
  const [entries, setEntries] = useState<FuelEntry[]>([]);

  async function fetchEntries(accessToken?: string, vehicleId?: string | null) {
    if (!accessToken) {
      setEntries([]);
      return;
    }

    setEntriesLoading(true);
    setEntriesError("");

    const query = vehicleId ? `?vehicleId=${encodeURIComponent(vehicleId)}` : "";
    const response = await fetch(`/api/fuel-entry${query}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      setEntriesError("Could not load fuel history.");
      setEntriesLoading(false);
      return;
    }

    const result = (await response.json()) as { entries: FuelEntry[] };
    setEntries(result.entries ?? []);
    setEntriesLoading(false);
  }

  async function fetchVehicles(accessToken?: string) {
    if (!accessToken) {
      setVehicles([]);
      setSelectedVehicleId(null);
      setEntries([]);
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
        setEntries([]);
        return null;
      }

      if (currentValue && nextVehicles.some((vehicle) => vehicle.id === currentValue)) {
        return currentValue;
      }

      return nextVehicles[0].id;
    });
    setVehiclesLoading(false);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setSession(data.session);
      setLoading(false);
      if (data.session) {
        void fetchVehicles(data.session.access_token);
      }
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      if (nextSession) {
        void fetchVehicles(nextSession.access_token);
      } else {
        setVehicles([]);
        setSelectedVehicleId(null);
        setEntries([]);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.access_token || !selectedVehicleId) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void fetchEntries(session.access_token, selectedVehicleId);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [selectedVehicleId, session?.access_token]);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <section className="mx-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">Fuel History</h1>
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
          >
            Back to Dashboard
          </Link>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-zinc-600">Checking session...</p>
        ) : !session ? (
          <div className="mt-4">
            <p className="text-sm text-zinc-700">Please login to view history.</p>
            <Link
              href="/login"
              className="mt-3 inline-flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Go to Login
            </Link>
          </div>
        ) : vehiclesLoading ? (
          <p className="mt-4 text-sm text-zinc-600">Loading vehicles...</p>
        ) : vehiclesError ? (
          <p className="mt-4 text-sm font-medium text-red-600">{vehiclesError}</p>
        ) : vehicles.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">No vehicles available yet.</p>
        ) : entriesLoading ? (
          <>
            <div className="mt-4">
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
            </div>
            <p className="mt-4 text-sm text-zinc-600">Loading entries...</p>
          </>
        ) : entriesError ? (
          <>
            <div className="mt-4">
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
            </div>
            <p className="mt-4 text-sm font-medium text-red-600">{entriesError}</p>
          </>
        ) : entries.length === 0 ? (
          <>
            <div className="mt-4">
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
            </div>
            <p className="mt-4 text-sm text-zinc-600">No fuel entries yet.</p>
          </>
        ) : (
          <>
            <div className="mt-4">
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
            </div>
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
                    Fuel Price:{" "}
                    <span className="font-medium text-zinc-900">
                      {entry.fuel_price.toFixed(2)}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-zinc-700">
                    Amount Paid:{" "}
                    <span className="font-medium text-zinc-900">
                      {entry.amount_paid.toFixed(2)}
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
          </>
        )}
      </section>
    </main>
  );
}
