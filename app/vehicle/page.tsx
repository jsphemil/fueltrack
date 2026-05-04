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
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  async function fetchVehicles(accessToken?: string) {
    if (!accessToken) {
      setVehicles([]);
      return;
    }

    const response = await fetch("/api/vehicle", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      setErrorMessage("Could not load vehicles.");
      setVehicles([]);
      return;
    }

    const result = (await response.json()) as { vehicles: Vehicle[] };
    setVehicles(result.vehicles ?? []);
  }

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

      await fetchVehicles(nextSession.access_token);
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

  async function handleDeleteVehicle(vehicleId: string) {
    if (!session?.access_token || deleteLoadingId) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this vehicle? This will also delete all associated fuel entries."
    );

    if (!confirmed) {
      return;
    }

    setDeleteLoadingId(vehicleId);
    setErrorMessage("");

    const response = await fetch(`/api/vehicle?id=${encodeURIComponent(vehicleId)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      setErrorMessage("Could not delete vehicle.");
      setDeleteLoadingId(null);
      return;
    }

    await fetchVehicles(session.access_token);
    setDeleteLoadingId(null);
  }

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
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        void handleDeleteVehicle(vehicle.id);
                      }}
                      disabled={deleteLoadingId !== null}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deleteLoadingId === vehicle.id ? "Deleting..." : "Delete"}
                    </button>
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
