"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import Gauge from "@/components/Gauge";
import { OdometerIcon } from "@/components/Icons";
import { Notice, Page, StatTile, SyncStatus, VehicleChips } from "@/components/ui";
import { useFuel } from "@/lib/fuel-context";
import { formatDateTime, formatKm, formatKmPerL, formatLitres, formatMoney, formatNumber, formatRelative } from "@/lib/format";
import { newId } from "@/lib/outbox";
import type { VehicleSummary } from "@/lib/types";
import { cardClass, errorTextClass, inputClass, primaryButtonClass, secondaryButtonClass, smallButtonClass } from "@/lib/ui";
import { parseOdometerInput } from "@/lib/validation";

const confidenceLabel = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

function GaugeCard({ vehicle }: { vehicle: VehicleSummary }) {
  const { gauge, rangeScaleKm } = vehicle;
  const onReserve = gauge.status === "on-reserve";
  const fraction =
    gauge.fillPercent !== null && vehicle.reserveMl !== null && vehicle.tankCapacityMl !== null
      ? (gauge.fuelAboveReserveMl ?? 0) / (vehicle.tankCapacityMl - vehicle.reserveMl)
      : gauge.kmToReserve !== null && rangeScaleKm
        ? gauge.kmToReserve / rangeScaleKm
        : null;

  let headline: string;
  let caption: string;
  if (onReserve) {
    headline = "On reserve";
    caption =
      gauge.reserveKmLeft !== null ? `About ${formatNumber(gauge.reserveKmLeft, 0)} km left on reserve. Fill up soon.` : "Fill up soon.";
  } else if (gauge.status === "ok" && gauge.kmToReserve !== null) {
    headline = `≈ ${formatNumber(gauge.kmToReserve, 0)} km`;
    caption = gauge.reserveAtOdometer !== null ? `to reserve · expected near ${formatKm(gauge.reserveAtOdometer)}` : "to reserve";
  } else if (gauge.status === "needs-tank-info") {
    headline = "Full tank";
    caption = "Add tank capacity and reserve in Vehicles to estimate range from a full tank, or mark reserve next time.";
  } else {
    headline = "Learning";
    caption = "Tap On reserve each time the bike sputters. After two reserve marks we'll show your range.";
  }

  return (
    <section className={`${cardClass} flex flex-col items-center text-center`}>
      <Gauge fraction={fraction} onReserve={onReserve} />
      <p className={`tabular -mt-2 text-4xl font-bold tracking-tight ${onReserve ? "text-reserve" : "text-foreground"}`}>{headline}</p>
      <p className="mt-1 max-w-xs text-sm text-muted">{caption}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
        {gauge.efficiency !== null ? (
          <span className="rounded-full bg-surface-muted px-3 py-1 font-medium text-subtle">{formatKmPerL(gauge.efficiency)}</span>
        ) : null}
        {gauge.status === "ok" || onReserve ? (
          <span className="rounded-full bg-surface-muted px-3 py-1 font-medium text-subtle">{confidenceLabel[gauge.confidence]}</span>
        ) : null}
        {gauge.fillPercent !== null ? (
          <span className="rounded-full bg-surface-muted px-3 py-1 font-medium text-subtle">~{gauge.fillPercent}% tank</span>
        ) : null}
      </div>
    </section>
  );
}

function OdometerCard({ vehicle }: { vehicle: VehicleSummary }) {
  const { saveEntry } = useFuel();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const { odometer } = vehicle.gauge;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = { id: newId(), kind: "ODOMETER", vehicleId: vehicle.id, occurredAt: new Date().toISOString(), odometerKm: value };
    const parsed = parseOdometerInput(body);
    if (!parsed.ok) return setError(parsed.error);
    if (parsed.value.odometer < odometer.odometer && !odometer.estimated) {
      return setError(`That's below the last reading (${formatKm(odometer.odometer, 1)}).`);
    }
    setError("");
    setEditing(false);
    setValue("");
    await saveEntry(body);
  }

  return (
    <section className={cardClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Odometer</p>
          <p className="tabular mt-1 text-xl font-semibold text-foreground">{formatKm(odometer.odometer)}</p>
          <p className="text-xs text-muted">
            {odometer.estimated
              ? `Estimated from your average · last reading ${odometer.lastReadingAt ? formatRelative(odometer.lastReadingAt) : ""}`
              : odometer.lastReadingAt
                ? `Read ${formatRelative(odometer.lastReadingAt)}`
                : "Starting reading"}
          </p>
        </div>
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)} className={`${secondaryButtonClass} ${smallButtonClass}`}>
            <OdometerIcon size={16} /> Update
          </button>
        ) : null}
      </div>
      {editing ? (
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2" noValidate>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={`e.g. ${Math.round(odometer.odometer / 10)}`}
            className={`${inputClass} tabular`}
            aria-label="Current odometer in km"
          />
          <button type="submit" className={primaryButtonClass}>Save</button>
        </form>
      ) : null}
      {error ? <p className={`mt-2 ${errorTextClass}`}>{error}</p> : null}
    </section>
  );
}

export default function HomePage() {
  const { me, activeVehicle, loading, error } = useFuel();

  if (loading && !activeVehicle) {
    return (
      <Page>
        <p className="text-sm text-muted">Loading...</p>
      </Page>
    );
  }

  if (!activeVehicle) {
    return (
      <Page>
        {error ? <Notice tone="danger">{error}</Notice> : null}
      </Page>
    );
  }

  const { gauge, lastFill, openReserve } = activeVehicle;
  const greeting = me?.name ? `Hi ${me.name.split(" ")[0]}` : "Hi";

  return (
    <Page>
      <div>
        <p className="text-sm text-muted">{greeting}</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{activeVehicle.name}</h1>
      </div>
      <VehicleChips />
      <SyncStatus />
      {error ? <Notice tone="info">{error}</Notice> : null}

      {openReserve ? (
        <Notice
          tone="reserve"
          action={
            <Link href={`/quick/reserve?id=${openReserve.id}`} className="text-sm font-semibold text-foreground underline">
              Add reading
            </Link>
          }
        >
          Reserve marked {formatRelative(openReserve.occurredAt)}. Add the odometer reading now, or the trip-meter reading when you fill up.
        </Notice>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <GaugeCard vehicle={activeVehicle} />
        <div className="grid content-start gap-5">
          <OdometerCard vehicle={activeVehicle} />
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label="Last fill"
              value={lastFill ? formatLitres(lastFill.volumeMl, 1) : "—"}
              hint={lastFill ? `${formatMoney(lastFill.amountPaise, true)} · ${formatRelative(lastFill.occurredAt)}` : "No fills yet"}
            />
            <StatTile
              label="On reserve"
              value={gauge.reserveRangeKm !== null ? `≈ ${formatNumber(gauge.reserveRangeKm, 0)} km` : "—"}
              hint={gauge.reserveRangeKm !== null ? "Range once you switch" : "Add reserve litres"}
            />
            <StatTile
              label="Recent mileage"
              value={formatKmPerL(gauge.efficiency)}
              hint={gauge.validCycles > 0 ? `${gauge.validCycles} reserve cycle${gauge.validCycles === 1 ? "" : "s"}` : "Needs 2 reserve marks"}
            />
            <StatTile label="Lifetime" value={formatKmPerL(gauge.lifetimeEfficiency)} hint="Distance-weighted" />
          </div>
          {lastFill ? (
            <p className="text-xs text-muted">Last fill {formatDateTime(lastFill.occurredAt)} at {formatKm(lastFill.odometer)}.</p>
          ) : null}
        </div>
      </div>
    </Page>
  );
}
