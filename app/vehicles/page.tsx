"use client";

import { useState } from "react";

import { PlusIcon } from "@/components/Icons";
import { Notice, Page, PageHeader } from "@/components/ui";
import VehicleForm from "@/components/VehicleForm";
import { apiRequest } from "@/lib/api";
import { useFuel } from "@/lib/fuel-context";
import { formatKm, formatKmPerL, formatLitres, formatNumber } from "@/lib/format";
import type { VehicleSummary } from "@/lib/types";
import { cardClass, primaryButtonClass, secondaryButtonClass, smallButtonClass } from "@/lib/ui";

function MiniGauge({ vehicle }: { vehicle: VehicleSummary }) {
  const { gauge, rangeScaleKm } = vehicle;
  const onReserve = gauge.status === "on-reserve";
  const fraction = onReserve ? 0.05 : gauge.kmToReserve !== null && rangeScaleKm ? Math.min(1, gauge.kmToReserve / rangeScaleKm) : null;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
      {fraction !== null ? (
        <div className={`h-full rounded-full ${onReserve || fraction < 0.15 ? "bg-reserve" : "bg-primary"}`} style={{ width: `${Math.max(4, fraction * 100)}%` }} />
      ) : null}
    </div>
  );
}

export default function VehiclesPage() {
  const { allVehicles, activeVehicle, setActiveVehicleId, refresh } = useFuel();
  const [mode, setMode] = useState<{ type: "add" } | { type: "edit"; id: string } | null>(null);
  const [error, setError] = useState("");

  async function patch(vehicle: VehicleSummary, body: Record<string, unknown>) {
    const result = await apiRequest(`/api/vehicles/${vehicle.id}`, { method: "PATCH", body });
    if (!result.ok) return setError(result.error);
    setError("");
    await refresh();
  }

  async function remove(vehicle: VehicleSummary) {
    if (!window.confirm(`Delete ${vehicle.name} and all of its entries? This can't be undone.`)) return;
    const result = await apiRequest(`/api/vehicles/${vehicle.id}`, { method: "DELETE" });
    if (!result.ok) return setError(result.error);
    await refresh();
  }

  return (
    <Page>
      <PageHeader
        title="Vehicles"
        actions={
          mode?.type !== "add" ? (
            <button type="button" onClick={() => setMode({ type: "add" })} className={primaryButtonClass}>
              <PlusIcon size={18} /> Add vehicle
            </button>
          ) : null
        }
      />
      {error ? <Notice tone="danger">{error}</Notice> : null}

      {mode?.type === "add" ? (
        <section className={cardClass}>
          <h2 className="mb-4 text-lg font-semibold text-foreground">New vehicle</h2>
          <VehicleForm
            onSaved={(vehicle) => {
              setActiveVehicleId(vehicle.id);
              setMode(null);
              void refresh();
            }}
            onCancel={() => setMode(null)}
          />
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {allVehicles.map((vehicle) => {
          const isActive = vehicle.id === activeVehicle?.id;
          if (mode?.type === "edit" && mode.id === vehicle.id) {
            return (
              <section key={vehicle.id} className={cardClass}>
                <h2 className="mb-4 text-lg font-semibold text-foreground">Edit {vehicle.name}</h2>
                <VehicleForm vehicle={vehicle} onSaved={() => { setMode(null); void refresh(); }} onCancel={() => setMode(null)} />
              </section>
            );
          }
          return (
            <section key={vehicle.id} className={`${cardClass} ${isActive ? "ring-2 ring-primary" : ""} ${vehicle.archived ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{vehicle.name}</h2>
                  <p className="text-sm text-muted">{vehicle.kind}{vehicle.archived ? " · Archived" : ""}</p>
                </div>
                {isActive ? <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Active</span> : null}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">To reserve</span>
                  <span className="tabular font-semibold text-foreground">
                    {vehicle.gauge.status === "on-reserve" ? "On reserve" : vehicle.gauge.kmToReserve !== null ? `≈ ${formatNumber(vehicle.gauge.kmToReserve, 0)} km` : "Learning"}
                  </span>
                </div>
                <MiniGauge vehicle={vehicle} />
              </div>

              <dl className="tabular mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-muted">Mileage</dt><dd className="font-medium text-foreground">{formatKmPerL(vehicle.gauge.efficiency)}</dd></div>
                <div><dt className="text-xs text-muted">Odometer</dt><dd className="font-medium text-foreground">{formatKm(vehicle.gauge.odometer.odometer)}</dd></div>
                <div><dt className="text-xs text-muted">Tank</dt><dd className="font-medium text-foreground">{vehicle.tankCapacityMl !== null ? formatLitres(vehicle.tankCapacityMl, 1) : "Not set"}</dd></div>
                <div><dt className="text-xs text-muted">Reserve</dt><dd className="font-medium text-foreground">{vehicle.reserveMl !== null ? formatLitres(vehicle.reserveMl, 1) : "Not set"}</dd></div>
              </dl>

              <div className="mt-5 flex flex-wrap gap-2">
                {!isActive && !vehicle.archived ? (
                  <button type="button" onClick={() => setActiveVehicleId(vehicle.id)} className={`${primaryButtonClass} ${smallButtonClass}`}>Set active</button>
                ) : null}
                <button type="button" onClick={() => setMode({ type: "edit", id: vehicle.id })} className={`${secondaryButtonClass} ${smallButtonClass}`}>Edit</button>
                <button type="button" onClick={() => void patch(vehicle, { archived: !vehicle.archived })} className={`${secondaryButtonClass} ${smallButtonClass}`}>
                  {vehicle.archived ? "Restore" : "Archive"}
                </button>
                <button type="button" onClick={() => void remove(vehicle)} className={`${secondaryButtonClass} ${smallButtonClass} text-danger!`}>Delete</button>
              </div>
            </section>
          );
        })}
      </div>
    </Page>
  );
}
