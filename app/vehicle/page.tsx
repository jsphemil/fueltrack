"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

type Vehicle = {
  id: string;
  name: string;
  vehicleType?: string | null;
  initial_odometer: number;
  lastOdometer: number;
  totalFuelSpend: number;
  averageMileage: number | null;
};

export default function VehiclePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadVehicles(nextSession: Session | null) {
      if (!nextSession?.access_token) {
        if (isMounted) {
          setVehicles([]);
          setLoading(false);
        }
        return;
      }

      const response = await fetch("/api/vehicle", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${nextSession.access_token}`,
        },
      });

      if (!isMounted) {
        return;
      }

      if (!response.ok) {
        setErrorMessage("Could not load vehicles.");
        setVehicles([]);
        setLoading(false);
        return;
      }

      const result = (await response.json()) as { vehicles: Vehicle[] };
      setVehicles(result.vehicles ?? []);
      setLoading(false);
    }

    async function loadSessionAndVehicles() {
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
      await loadVehicles(data.session ?? null);
    }

    void loadSessionAndVehicles();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(true);
      setErrorMessage("");
      void loadVehicles(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="px-4 py-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-xl font-semibold text-zinc-900">Vehicles</h1>

        {!session ? (
          <p className="mt-4 text-sm text-zinc-600">Please log in to view your vehicles.</p>
        ) : null}

        {loading ? <p className="mt-4 text-sm text-zinc-600">Loading vehicles...</p> : null}

        {errorMessage ? (
          <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p>
        ) : null}

        {!loading && !errorMessage && session ? (
          vehicles.length > 0 ? (
            <ul className="mt-4 space-y-6">
              {vehicles.map((vehicle) => (
                <li key={vehicle.id} className="rounded-lg bg-white p-6 shadow-md">
                  <p className="text-xl font-bold text-zinc-900">{vehicle.name}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-zinc-500">Type</p>
                      <p className="text-base font-medium text-zinc-900">
                        {vehicle.vehicleType || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Initial odometer</p>
                      <p className="text-base font-medium text-zinc-900">
                        {vehicle.initial_odometer}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Last odometer</p>
                      <p className="text-base font-medium text-zinc-900">
                        {vehicle.lastOdometer}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Total fuel spend</p>
                      <p className="text-base font-medium text-zinc-900">
                        {vehicle.totalFuelSpend.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Average mileage</p>
                      <p className="text-base font-medium text-zinc-900">
                        {vehicle.averageMileage !== null
                          ? vehicle.averageMileage.toFixed(2)
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-zinc-600">No vehicles found.</p>
          )
        ) : null}

        <Link href="/" className="mt-6 inline-block text-sm font-medium text-zinc-700">
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
