"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";

import { Field, Page, PageHeader } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useFuel } from "@/lib/fuel-context";
import { formatKm, formatLitres, formatMoney, formatRelative, formatTime, toDateTimeLocalValue, toInputNumber } from "@/lib/format";
import { newId, queueEvent } from "@/lib/outbox";
import type { FuelEvent, TimelineCycle } from "@/lib/types";
import { amountFromVolume, litresToMl, priceFromAmount, rupeesToPaise, volumeFromAmount } from "@/lib/units";
import { cardClass, dangerButtonClass, errorTextClass, inputClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { parseFillInput } from "@/lib/validation";

function Toggle({ checked, onChange, title, detail }: { checked: boolean; onChange: (value: boolean) => void; title: string; detail: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border-strong bg-surface p-4">
      <span>
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted">{detail}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full bg-border-strong transition peer-checked:bg-primary after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-surface after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

function FillForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("edit");
  const { vehicles, activeVehicle, saveEntry, refresh } = useFuel();
  const vehicle = vehicles.find((item) => item.id === params.get("vehicle")) ?? activeVehicle;

  const [editing, setEditing] = useState<FuelEvent | null>(null);
  // The date field only has minute precision, so the exact time is used unless
  // the rider changes it (keeps a fill after a reserve tap in the same minute).
  const [occurredAt, setOccurredAt] = useState(() => toDateTimeLocalValue(new Date()));
  const [timeEdited, setTimeEdited] = useState(false);
  const [odometer, setOdometer] = useState("");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [litres, setLitres] = useState("");
  const [fullTank, setFullTank] = useState(false);
  const [onReserve, setOnReserve] = useState(false);
  const [trip, setTrip] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Prefill the last price; in edit mode load the entry.
  useEffect(() => {
    if (!vehicle) return;
    const timerId = window.setTimeout(() => {
      if (!editId) {
        setPrice((current) => current || toInputNumber(vehicle.lastPrice, 100, 2));
        return;
      }
      void apiRequest<{ events: FuelEvent[]; cycles: TimelineCycle[] }>(`/api/vehicles/${vehicle.id}/events`).then((result) => {
        const event = result.ok ? result.data.events.find((item) => item.id === editId && item.kind === "FILL") : null;
        if (!event) return setError("Couldn't load this fill.");
        setEditing(event);
        setOccurredAt(toDateTimeLocalValue(event.occurredAt));
        setOdometer(toInputNumber(event.odometer, 10, 1));
        setAmount(toInputNumber(event.amountPaise, 100, 2));
        setPrice(toInputNumber(event.pricePaise, 100, 2));
        setLitres(toInputNumber(event.volumeMl, 1000, 3));
        setFullTank(event.fullTank);
        setNote(event.note ?? "");
      });
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [vehicle, editId]);

  // Preview of the value that will be calculated from the other two.
  const preview = useMemo(() => {
    const a = Number(amount), p = Number(price), l = Number(litres);
    if (amount && price && !litres && a > 0 && p > 0) return `= ${formatLitres(volumeFromAmount(rupeesToPaise(a), rupeesToPaise(p)))}`;
    if (litres && price && !amount && l > 0 && p > 0) return `= ${formatMoney(amountFromVolume(litresToMl(l), rupeesToPaise(p)))}`;
    if (amount && litres && !price && a > 0 && l > 0) return `= ${formatMoney(priceFromAmount(rupeesToPaise(a), litresToMl(l)))} per litre`;
    return null;
  }, [amount, price, litres]);

  if (!vehicle) {
    return (
      <Page narrow>
        <p className="text-sm text-muted">Loading...</p>
      </Page>
    );
  }

  const openReserve = editId ? null : vehicle.openReserve;
  const askTrip = Boolean(openReserve) || onReserve;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vehicle) return;
    const when = timeEdited ? new Date(occurredAt) : editing ? new Date(editing.occurredAt) : new Date();
    const body = {
      id: editing?.id ?? newId(),
      kind: "FILL",
      vehicleId: vehicle.id,
      occurredAt: Number.isNaN(when.getTime()) ? "invalid" : when.toISOString(),
      odometerKm: odometer,
      amount,
      price,
      litres,
      fullTank,
      note,
      reserveTripKm: askTrip ? trip : "",
    };
    const parsed = parseFillInput(body);
    if (!parsed.ok) return setError(parsed.error);
    setError("");

    if (editing) {
      setSaving(true);
      const result = await apiRequest(`/api/events/${editing.id}`, { method: "PATCH", body });
      setSaving(false);
      if (!result.ok) return setError(result.error);
      await refresh();
      router.push("/history");
      return;
    }

    // Didn't tap On reserve on the way: record the reserve mark just before this fill.
    if (onReserve && !openReserve) {
      queueEvent({ id: newId(), kind: "RESERVE", vehicleId: vehicle.id, occurredAt: new Date(when.getTime() - 60_000).toISOString() });
    }
    setSaving(true);
    await saveEntry(body);
    setSaving(false);
    router.push("/");
  }

  async function handleDelete() {
    if (!editing || !window.confirm("Delete this fill?")) return;
    const result = await apiRequest(`/api/events/${editing.id}`, { method: "DELETE" });
    if (!result.ok) return setError(result.error);
    await refresh();
    router.push("/history");
  }

  const estimated = vehicle.gauge.odometer;

  return (
    <Page narrow>
      <PageHeader
        title={editing ? "Edit fill" : "Add fuel"}
        subtitle={vehicle.name}
        actions={<Link href={editing ? "/history" : "/"} className={secondaryButtonClass}>Cancel</Link>}
      />

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {openReserve ? (
          <section className="rounded-3xl border border-reserve/40 bg-reserve/10 p-5">
            <p className="text-sm font-semibold text-foreground">
              You marked reserve at {formatTime(openReserve.occurredAt)} ({formatRelative(openReserve.occurredAt)})
            </p>
            <div className="mt-3">
              <Field label="Trip meter reading (km)" hint="km since you reset it at reserve. Leave blank to use this fill's odometer (approximate).">
                <input type="number" inputMode="decimal" min="0" step="0.1" value={trip} onChange={(e) => setTrip(e.target.value)} placeholder="e.g. 4.2" className={`${inputClass} tabular`} />
              </Field>
            </div>
          </section>
        ) : null}

        <section className={`${cardClass} space-y-4`}>
          <Field label="Odometer (km)" hint={!editing ? `Last: ${formatKm(estimated.odometer)}${estimated.estimated ? " (estimated)" : ""}` : undefined}>
            <input type="number" inputMode="decimal" min="0" step="0.1" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder={String(Math.round(estimated.odometer / 10))} className={`${inputClass} tabular text-lg`} autoFocus={!editId} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (₹)">
              <input type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 300" className={`${inputClass} tabular`} />
            </Field>
            <Field label="Price per litre (₹)">
              <input type="number" inputMode="decimal" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 102.45" className={`${inputClass} tabular`} />
            </Field>
          </div>
          <Field label="Litres" hint="Fill any two of amount, price and litres. The third is calculated.">
            <input type="number" inputMode="decimal" min="0" step="0.01" value={litres} onChange={(e) => setLitres(e.target.value)} placeholder="Calculated" className={`${inputClass} tabular`} />
          </Field>
          {preview ? <p className="tabular text-sm font-semibold text-foreground">{preview}</p> : null}
        </section>

        <Toggle checked={fullTank} onChange={setFullTank} title="Filled to the top" detail="Full tank. Helps when you know your tank size." />
        {!openReserve && !editing ? (
          <Toggle checked={onReserve} onChange={setOnReserve} title="Bike was on reserve" detail="Switched to reserve but didn't tap On reserve." />
        ) : null}
        {onReserve && !openReserve ? (
          <Field label="Trip meter reading (km)" hint="km since you switched to reserve, if you reset the trip meter. Leave blank if unsure.">
            <input type="number" inputMode="decimal" min="0" step="0.1" value={trip} onChange={(e) => setTrip(e.target.value)} placeholder="e.g. 4.2" className={`${inputClass} tabular`} />
          </Field>
        ) : null}

        <details className="rounded-2xl border border-border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-medium text-subtle">Date, time and note</summary>
          <div className="mt-4 space-y-4">
            <Field label="Date and time">
              <input type="datetime-local" value={occurredAt} max={toDateTimeLocalValue(new Date())} onChange={(e) => { setOccurredAt(e.target.value); setTimeEdited(true); }} className={inputClass} />
            </Field>
            <Field label="Note">
              <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Indian Oil, MG Road" className={inputClass} />
            </Field>
          </div>
        </details>

        {error ? <p className={errorTextClass}>{error}</p> : null}

        <button type="submit" disabled={saving} className={`${primaryButtonClass} h-14 w-full text-base`}>
          {saving ? "Saving..." : editing ? "Save changes" : "Save fill"}
        </button>
        {editing ? (
          <button type="button" onClick={() => void handleDelete()} className={`${dangerButtonClass} w-full`}>Delete fill</button>
        ) : null}
      </form>
    </Page>
  );
}

export default function FillPage() {
  return (
    <Suspense>
      <FillForm />
    </Suspense>
  );
}
