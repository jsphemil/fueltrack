"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { FuelIcon, OdometerIcon, ReserveIcon } from "@/components/Icons";
import { Notice, Page, PageHeader, SyncStatus, VehicleChips } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useFuel } from "@/lib/fuel-context";
import { formatDateTime, formatKm, formatKmPerL, formatLitres, formatMoney, toInputNumber } from "@/lib/format";
import type { FuelEvent, TimelineCycle } from "@/lib/types";
import { cardClass, errorTextClass, inputClass, mutedTextClass, primaryButtonClass, secondaryButtonClass, smallButtonClass } from "@/lib/ui";
import { STARTING_POINT_LABEL } from "@/lib/labels";

const KIND_META = {
  FILL: { icon: FuelIcon, label: "Fuel", tone: "bg-primary text-primary-foreground" },
  RESERVE: { icon: ReserveIcon, label: "Reserve", tone: "bg-reserve text-reserve-foreground" },
  ODOMETER: { icon: OdometerIcon, label: "Odometer", tone: "bg-surface-muted text-subtle" },
} as const;

const CYCLE_TYPES: Record<TimelineCycle["type"], string> = {
  RR: "Reserve → reserve",
  FF: "Full → full",
  RF: "Reserve → full",
  FR: "Full → reserve",
};

function CycleBand({ cycle }: { cycle: TimelineCycle }) {
  const ok = cycle.status === "ok";
  const message =
    cycle.status === "needs-tank-info"
      ? "Add tank capacity and reserve to measure this cycle"
      : cycle.status === "implausible"
        ? "Result looks wrong (check odometer and litres), not used"
        : cycle.status === "invalid"
          ? "No fuel or distance recorded, not used"
          : null;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-2.5 text-sm ${ok ? "bg-good/10" : "bg-surface-muted"}`}>
      <span className="font-medium text-subtle">{CYCLE_TYPES[cycle.type]}</span>
      {ok ? (
        <span className="tabular font-semibold text-foreground">
          {formatKm(cycle.distance)} · {formatLitres(cycle.burnedMl, 2)} · <span className="text-good">{formatKmPerL(cycle.kmPerL)}</span>
          {cycle.approx ? <span className="font-normal text-muted"> (approx.)</span> : null}
        </span>
      ) : (
        <span className="text-muted">{message}</span>
      )}
    </div>
  );
}

function EventRow({ event, onChanged }: { event: FuelEvent; onChanged: () => void }) {
  const meta = KIND_META[event.kind];
  const Icon = meta.icon;
  const isStart = event.note === STARTING_POINT_LABEL;
  const needsReading = event.kind === "RESERVE" && event.odometer === null;
  const [editing, setEditing] = useState(needsReading);
  const [value, setValue] = useState(toInputNumber(event.odometer, 10, 1));
  const [error, setError] = useState("");

  const title =
    event.kind === "FILL"
      ? isStart
        ? "Full tank (starting point)"
        : `${formatLitres(event.volumeMl)} · ${formatMoney(event.amountPaise)}`
      : event.kind === "RESERVE"
        ? isStart ? "On reserve (starting point)" : "Went on reserve"
        : "Odometer reading";

  async function saveReading(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const result = await apiRequest(`/api/events/${event.id}`, {
      method: "PATCH",
      body: { occurredAt: event.occurredAt, odometerKm: value },
    });
    if (!result.ok) return setError(result.error);
    setError("");
    setEditing(false);
    onChanged();
  }

  async function remove() {
    if (!window.confirm(`Delete this ${meta.label.toLowerCase()} entry?`)) return;
    const result = await apiRequest(`/api/events/${event.id}`, { method: "DELETE" });
    if (!result.ok) return setError(result.error);
    onChanged();
  }

  return (
    <div className="flex gap-3 py-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${meta.tone}`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="tabular font-semibold text-foreground">{title}</p>
            <p className="tabular text-sm text-muted">
              {formatDateTime(event.occurredAt)}
              {event.odometer !== null ? ` · ${event.odometerApprox ? "≈ " : ""}${formatKm(event.odometer, 1)}` : ""}
              {event.kind === "FILL" && event.pricePaise ? ` · ${formatMoney(event.pricePaise)}/L` : ""}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {event.fullTank && !isStart ? <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-subtle">Full tank</span> : null}
              {needsReading ? <span className="rounded-full bg-reserve/15 px-2 py-0.5 text-xs font-semibold text-reserve">Needs odometer</span> : null}
              {event.odometerApprox ? <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted">Approximate reading</span> : null}
              {event.note && !isStart ? <span className="text-xs text-muted">{event.note}</span> : null}
            </div>
          </div>
          {!editing ? (
            <div className="flex gap-2">
              {event.kind === "FILL" && !isStart ? (
                <Link href={`/fill?edit=${event.id}&vehicle=${event.vehicleId}`} className={`${secondaryButtonClass} ${smallButtonClass}`}>Edit</Link>
              ) : event.kind !== "FILL" ? (
                <button type="button" onClick={() => setEditing(true)} className={`${secondaryButtonClass} ${smallButtonClass}`}>Edit</button>
              ) : null}
              <button type="button" onClick={() => void remove()} className={`${secondaryButtonClass} ${smallButtonClass} text-danger!`}>Delete</button>
            </div>
          ) : null}
        </div>
        {editing ? (
          <form onSubmit={saveReading} className="mt-3 flex gap-2" noValidate>
            <input type="number" inputMode="decimal" min="0" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Odometer in km" className={`${inputClass} h-10! tabular`} aria-label="Odometer in km" />
            <button type="submit" className={`${primaryButtonClass} h-10!`}>Save</button>
            {!needsReading ? <button type="button" onClick={() => setEditing(false)} className={`${secondaryButtonClass} h-10!`}>Cancel</button> : null}
          </form>
        ) : null}
        {error ? <p className={`mt-1 ${errorTextClass}`}>{error}</p> : null}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { activeVehicle, refresh } = useFuel();
  const [events, setEvents] = useState<FuelEvent[]>([]);
  const [cycles, setCycles] = useState<TimelineCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const vehicleId = activeVehicle?.id ?? null;

  const load = useCallback(async (id: string) => {
    const result = await apiRequest<{ events: FuelEvent[]; cycles: TimelineCycle[] }>(`/api/vehicles/${id}/events`);
    if (result.ok) {
      setEvents(result.data.events);
      setCycles(result.data.cycles);
      setError("");
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!vehicleId) return;
    const timerId = window.setTimeout(() => void load(vehicleId), 0);
    return () => window.clearTimeout(timerId);
  }, [vehicleId, load, activeVehicle?.eventCount]);

  const cycleByEnd = useMemo(() => new Map(cycles.map((cycle) => [cycle.endId, cycle])), [cycles]);

  function changed() {
    if (vehicleId) void load(vehicleId);
    void refresh();
  }

  return (
    <Page>
      <PageHeader title="History" subtitle={activeVehicle ? `${activeVehicle.name} · newest first` : undefined} />
      <VehicleChips />
      <SyncStatus />
      {error ? <Notice tone="danger">{error}</Notice> : null}

      <section className={cardClass}>
        {loading && events.length === 0 ? (
          <p className={mutedTextClass}>Loading...</p>
        ) : events.length === 0 ? (
          <p className={mutedTextClass}>Nothing logged yet. Tap On reserve or Add fuel to start.</p>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((event) => {
              const cycle = cycleByEnd.get(event.id);
              return (
                <li key={event.id}>
                  {cycle ? <div className="pt-3"><CycleBand cycle={cycle} /></div> : null}
                  <EventRow event={event} onChanged={changed} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Page>
  );
}
