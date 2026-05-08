"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import FuelEntryForm from "@/components/FuelEntryForm";
import { supabase } from "@/lib/supabase";

type Vehicle = {
  id: string;
  name: string;
};

export default function EntryPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState("");

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
        void fetchVehicles(data.session.access_token);
      } else {
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
        void fetchVehicles(nextSession.access_token);
      } else {
        setVehicles([]);
        setSelectedVehicleId(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchVehicles]);

  const isAuthenticated = Boolean(session);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <section className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-6 shadow-sm lg:p-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Add Fuel Entry</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Select your vehicle and add a new fuel entry.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-zinc-700">Checking session...</p>
        ) : !isAuthenticated ? (
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Go to Login
            </Link>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p>
        ) : null}

        {isAuthenticated ? (
          <section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-zinc-900">Vehicle Selection</h2>

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
              </div>
            )}
          </section>
        ) : null}

        {isAuthenticated ? <FuelEntryForm vehicleId={selectedVehicleId} /> : null}
      </section>
    </main>
  );
}
