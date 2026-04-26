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
      <h1 className="text-xl font-semibold">Vehicles</h1>

      {!session ? <p className="mt-4">Please log in to view your vehicles.</p> : null}

      {loading ? <p className="mt-4">Loading vehicles...</p> : null}

      {errorMessage ? <p className="mt-4">{errorMessage}</p> : null}

      {!loading && !errorMessage && session ? (
        vehicles.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {vehicles.map((vehicle) => (
              <li key={vehicle.id}>
                <p>Vehicle name: {vehicle.name}</p>
                <p>Type: {vehicle.vehicleType || "Not specified"}</p>
                <p>Initial odometer: {vehicle.initial_odometer}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4">No vehicles found.</p>
        )
      ) : null}

      <Link href="/" className="mt-6 inline-block">
        Back to Dashboard
      </Link>
    </main>
  );
}
