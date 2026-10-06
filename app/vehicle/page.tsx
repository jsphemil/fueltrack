"use client";

import Link from "next/link";
import { useState } from "react";

import PageShell from "@/components/PageShell";
import { apiRequest } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useSession, useVehicles } from "@/lib/hooks";
import type { VehicleWithStats } from "@/lib/types";
import {
  cardClass,
  dangerButtonClass,
  errorTextClass,
  mutedTextClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";

const smallButton = "h-8! px-3! text-xs!";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export default function VehiclePage() {
  const { loading: sessionLoading, userId } = useSession();
  const { vehicles, loading, error, selectedVehicleId, setSelectedVehicleId, reload } = useVehicles(userId);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function handleDeleteVehicle(vehicle: VehicleWithStats) {
    const confirmed = window.confirm(
      `Delete "${vehicle.name}"? This also deletes all of its fuel entries.`
    );
    if (!confirmed) {
      return;
    }

    setDeleteLoadingId(vehicle.id);
    setDeleteError("");
    const result = await apiRequest(`/api/vehicle?id=${encodeURIComponent(vehicle.id)}`, {
      method: "DELETE",
    });
    setDeleteLoadingId(null);

    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }

    await reload();
  }

  return (
    <PageShell
      title="Vehicles"
      description="Statistics for each of your vehicles."
      loading={sessionLoading || !userId}
      actions={
        <Link href="/account#add-vehicle" className={secondaryButtonClass}>
          Add or edit vehicles
        </Link>
      }
    >
      {error ? <p className={errorTextClass}>{error}</p> : null}
      {deleteError ? <p className={errorTextClass}>{deleteError}</p> : null}

      {loading && vehicles.length === 0 ? (
        <p className={mutedTextClass}>Loading vehicles...</p>
      ) : vehicles.length === 0 && !error ? (
        <section className={cardClass}>
          <p className={mutedTextClass}>No vehicles yet.</p>
          <Link href="/account#add-vehicle" className={`mt-3 ${primaryButtonClass}`}>
            Add vehicle
          </Link>
        </section>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {vehicles.map((vehicle) => {
            const isActive = vehicle.id === selectedVehicleId;

            return (
              <li key={vehicle.id} className={`${cardClass} ${isActive ? "ring-2 ring-primary" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{vehicle.name}</p>
                    <p className={mutedTextClass}>{vehicle.vehicleType}</p>
                  </div>
                  {isActive ? (
                    <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                      Active
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Stat
                    label="Average mileage"
                    value={vehicle.averageMileage !== null ? `${formatNumber(vehicle.averageMileage)} km/l` : "—"}
                  />
                  <Stat
                    label="Cost per km"
                    value={vehicle.costPerKm !== null ? formatCurrency(vehicle.costPerKm) : "—"}
                  />
                  <Stat label="Total spend" value={formatCurrency(vehicle.totalSpend)} />
                  <Stat label="Initial odometer" value={`${formatNumber(vehicle.initial_odometer, 0)} km`} />
                  <Stat label="Last odometer" value={`${formatNumber(vehicle.lastOdometer, 0)} km`} />
                  <Stat label="Fills" value={String(vehicle.entryCount)} />
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  {!isActive ? (
                    <button
                      type="button"
                      onClick={() => setSelectedVehicleId(vehicle.id)}
                      className={`${secondaryButtonClass} ${smallButton}`}
                    >
                      Set active
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleDeleteVehicle(vehicle)}
                    disabled={deleteLoadingId !== null}
                    className={`${dangerButtonClass} ${smallButton}`}
                  >
                    {deleteLoadingId === vehicle.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
