"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import FuelEntryForm from "@/components/FuelEntryForm";
import PageShell from "@/components/PageShell";
import VehicleSelect from "@/components/VehicleSelect";
import { apiRequest } from "@/lib/api";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { useSession, useVehicles } from "@/lib/hooks";
import { calculateCycles } from "@/lib/mileage";
import type { FuelEntry } from "@/lib/types";
import {
  cardClass,
  dangerButtonClass,
  errorTextClass,
  mutedTextClass,
  secondaryButtonClass,
} from "@/lib/ui";

const smallButton = "h-8! px-3! text-xs!";

export default function HistoryPage() {
  const { loading: sessionLoading, userId } = useSession();
  const {
    vehicles,
    loading: vehiclesLoading,
    error: vehiclesError,
    selectedVehicleId,
    setSelectedVehicleId,
    reload: reloadVehicles,
  } = useVehicles(userId);
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const loadEntries = useCallback(async (vehicleId: string) => {
    setEntriesLoading(true);
    setEntriesError("");
    const result = await apiRequest<{ entries: FuelEntry[] }>(
      `/api/fuel-entry?vehicleId=${encodeURIComponent(vehicleId)}`
    );
    if (result.ok) {
      setEntries(result.data.entries ?? []);
    } else {
      setEntriesError(result.error);
    }
    setEntriesLoading(false);
  }, []);

  useEffect(() => {
    if (!userId || !selectedVehicleId) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setEditingEntryId(null);
      void loadEntries(selectedVehicleId);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [userId, selectedVehicleId, loadEntries]);

  // Mileage of the reserve-to-reserve cycle that each closing fill completes.
  const cycleMileageByEntryId = useMemo(() => {
    const map = new Map<string, number>();
    for (const cycle of calculateCycles(entries)) {
      map.set(cycle.endEntry.id, cycle.mileage);
    }
    return map;
  }, [entries]);

  async function refreshAfterChange() {
    if (selectedVehicleId) {
      await loadEntries(selectedVehicleId);
    }
    void reloadVehicles();
  }

  async function handleDelete(entry: FuelEntry) {
    const confirmed = window.confirm(
      `Delete the fill from ${formatDateTime(entry.filled_at)} at ${formatNumber(entry.odometer)} km?`
    );
    if (!confirmed) {
      return;
    }

    setDeletingEntryId(entry.id);
    setEntriesError("");
    const result = await apiRequest(`/api/fuel-entry?id=${encodeURIComponent(entry.id)}`, {
      method: "DELETE",
    });
    setDeletingEntryId(null);

    if (!result.ok) {
      setEntriesError(result.error);
      return;
    }

    if (editingEntryId === entry.id) {
      setEditingEntryId(null);
    }
    await refreshAfterChange();
  }

  return (
    <PageShell
      title="Fuel history"
      description="All fills for the selected vehicle. Edit or delete any entry."
      loading={sessionLoading || !userId}
    >
      <section className={cardClass}>
        <VehicleSelect
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onChange={setSelectedVehicleId}
          loading={vehiclesLoading}
          error={vehiclesError}
        />
      </section>

      {selectedVehicleId ? (
        <section className={cardClass}>
          {entriesError ? <p className={`mb-3 ${errorTextClass}`}>{entriesError}</p> : null}

          {entriesLoading && entries.length === 0 ? (
            <p className={mutedTextClass}>Loading entries...</p>
          ) : entries.length === 0 ? (
            <p className={mutedTextClass}>No fuel entries yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {entries.map((entry) => {
                const cycleMileage = cycleMileageByEntryId.get(entry.id);

                return (
                  <li key={entry.id} className="py-4 first:pt-0 last:pb-0">
                    {editingEntryId === entry.id ? (
                      <FuelEntryForm
                        vehicleId={selectedVehicleId}
                        entry={entry}
                        onSaved={() => {
                          setEditingEntryId(null);
                          void refreshAfterChange();
                        }}
                        onCancel={() => setEditingEntryId(null)}
                      />
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                            {formatDateTime(entry.filled_at)}
                            {entry.is_reserve ? (
                              <span className="rounded-full border border-border-strong px-2 py-0.5 text-xs font-medium text-subtle">
                                Reserve
                              </span>
                            ) : null}
                            {cycleMileage !== undefined ? (
                              <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                                {formatNumber(cycleMileage)} km/l
                              </span>
                            ) : null}
                          </p>
                          <p className={mutedTextClass}>
                            {formatNumber(entry.odometer)} km · {formatNumber(entry.fuel_volume, 2)} L @{" "}
                            {formatCurrency(entry.fuel_price)}/L · {formatCurrency(entry.amount_paid)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingEntryId(entry.id)}
                            disabled={deletingEntryId !== null}
                            className={`${secondaryButtonClass} ${smallButton}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(entry)}
                            disabled={deletingEntryId !== null}
                            className={`${dangerButtonClass} ${smallButton}`}
                          >
                            {deletingEntryId === entry.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </PageShell>
  );
}
