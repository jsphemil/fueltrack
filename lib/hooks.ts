"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

import { apiRequest } from "@/lib/api";
import { readSelectedVehicleId, writeSelectedVehicleId } from "@/lib/selectedVehicle";
import { supabase } from "@/lib/supabase";
import type { VehicleWithStats } from "@/lib/types";

// Current Supabase session. Redirects to /login when signed out unless
// requireAuth is false.
export function useSession({ requireAuth = true }: { requireAuth?: boolean } = {}) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (requireAuth && !loading && !session) {
      router.replace("/login");
    }
  }, [requireAuth, loading, session, router]);

  return { session, loading, userId: session?.user.id ?? null };
}

// The user's vehicles with statistics, plus the active vehicle shared across pages.
export function useVehicles(userId: string | null) {
  const [vehicles, setVehicles] = useState<VehicleWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVehicleId, setSelectedVehicleIdState] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");

    const result = await apiRequest<{ vehicles: VehicleWithStats[] }>("/api/vehicle");
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const nextVehicles = result.data.vehicles ?? [];
    setVehicles(nextVehicles);
    setSelectedVehicleIdState((current) => {
      const preferred = current ?? readSelectedVehicleId();
      if (preferred && nextVehicles.some((vehicle) => vehicle.id === preferred)) {
        return preferred;
      }
      return nextVehicles[0]?.id ?? null;
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void reload();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [userId, reload]);

  const setSelectedVehicleId = useCallback((vehicleId: string | null) => {
    setSelectedVehicleIdState(vehicleId);
    writeSelectedVehicleId(vehicleId);
  }, []);

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null;

  return {
    vehicles,
    loading,
    error,
    selectedVehicleId,
    selectedVehicle,
    setSelectedVehicleId,
    reload,
  };
}
