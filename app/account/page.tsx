"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import VehicleForm from "@/components/VehicleForm";

type Vehicle = {
  id: string;
  name: string;
};

export default function AccountPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  async function fetchVehicles(accessToken?: string) {
    if (!accessToken) {
      setVehicles([]);
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
    setVehicles(result.vehicles ?? []);
    setVehiclesLoading(false);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadSessionAndData() {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setSession(data.session);
      setLoading(false);

      if (data.session?.access_token) {
        void fetchVehicles(data.session.access_token);
      }
    }

    void loadSessionAndData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      setResetError("");

      if (nextSession?.access_token) {
        void fetchVehicles(nextSession.access_token);
      } else {
        setVehicles([]);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleResetAccount() {
    if (!session?.access_token || resetLoading) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to reset your account? This will delete all vehicles and fuel entries."
    );

    if (!confirmed) {
      return;
    }

    setResetLoading(true);
    setResetError("");

    const response = await fetch("/api/account/reset", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      setResetError("Could not reset account.");
      setResetLoading(false);
      return;
    }

    await fetchVehicles(session.access_token);
    setResetLoading(false);
  }

  async function handleDeleteVehicle(vehicleId: string, vehicleName: string) {
    if (!session?.access_token || deleteLoadingId) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${vehicleName}"? This will delete all its fuel entries.`
    );

    if (!confirmed) {
      return;
    }

    setDeleteLoadingId(vehicleId);
    setDeleteError("");

    const response = await fetch(`/api/vehicle?id=${encodeURIComponent(vehicleId)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      setDeleteError("Could not delete vehicle.");
      setDeleteLoadingId(null);
      return;
    }

    await fetchVehicles(session.access_token);
    setDeleteLoadingId(null);
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <section className="mx-auto w-full max-w-4xl rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Account</h1>

        {loading ? (
          <p className="mt-4 text-sm text-zinc-600">Checking session...</p>
        ) : !session ? (
          <div className="mt-4">
            <p className="text-sm text-zinc-700">Please log in to view your account.</p>
            <Link
              href="/login"
              className="mt-3 inline-flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <h2 className="text-lg font-semibold text-zinc-900">User Info</h2>
              <p className="mt-2 text-sm text-zinc-700">
                Email: <span className="font-medium text-zinc-900">{session.user.email}</span>
              </p>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <h2 className="text-lg font-semibold text-zinc-900">Vehicle List</h2>
              {vehiclesLoading ? (
                <p className="mt-2 text-sm text-zinc-600">Loading vehicles...</p>
              ) : vehiclesError ? (
                <p className="mt-2 text-sm font-medium text-red-600">{vehiclesError}</p>
              ) : vehicles.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-600">No vehicles added yet.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm text-zinc-700">
                  {vehicles.map((vehicle) => (
                    <li key={vehicle.id} className="flex items-center justify-between gap-3">
                      <span>{vehicle.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          void handleDeleteVehicle(vehicle.id, vehicle.name);
                        }}
                        disabled={deleteLoadingId !== null}
                        className="inline-flex h-8 items-center rounded-lg border border-red-300 bg-white px-3 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deleteLoadingId === vehicle.id ? "Deleting..." : "Delete"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {deleteError ? (
                <p className="mt-2 text-sm font-medium text-red-600">{deleteError}</p>
              ) : null}
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <h2 className="text-lg font-semibold text-zinc-900">Actions</h2>
              <div className="mt-3 flex flex-wrap gap-3">
                <VehicleForm />
                <button
                  type="button"
                  onClick={() => {
                    void handleResetAccount();
                  }}
                  disabled={resetLoading}
                  className="inline-flex h-10 items-center rounded-lg border border-red-300 bg-white px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resetLoading ? "Resetting..." : "Reset Account"}
                </button>
              </div>
              {resetError ? (
                <p className="mt-2 text-sm font-medium text-red-600">{resetError}</p>
              ) : null}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
