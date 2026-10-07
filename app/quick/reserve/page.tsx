"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";

import { CheckIcon, CloudOffIcon } from "@/components/Icons";
import { Field, Page } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useFuel } from "@/lib/fuel-context";
import { formatTime } from "@/lib/format";
import { newId, removeQueued, updateQueued } from "@/lib/outbox";
import { cardClass, chipClass, errorTextClass, inputClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { parseReserveInput } from "@/lib/validation";

type Mark = { id: string; vehicleId: string; occurredAt: string };

// One tap, no typing: opening this page records that the active vehicle just
// went on reserve. The odometer can be added here or later at the pump.
function QuickReserve() {
  const router = useRouter();
  const params = useSearchParams();
  const existingId = params.get("id");
  const { vehicles, activeVehicle, loaded, outbox, saveEntry, refresh, setActiveVehicleId } = useFuel();
  const [mark, setMark] = useState<Mark | null>(null);
  const [odometer, setOdometer] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const logged = useRef(false);

  const existing = existingId
    ? vehicles.map((vehicle) => vehicle.openReserve).find((reserve) => reserve?.id === existingId) ?? null
    : null;
  const current: Mark | null = existing ?? mark;
  const pending = current ? outbox.some((item) => item.id === current.id) : false;
  const vehicle = vehicles.find((item) => item.id === current?.vehicleId) ?? activeVehicle;

  useEffect(() => {
    if (existingId || logged.current || !activeVehicle) return;
    const timerId = window.setTimeout(() => {
      // Checked inside the timer so a development double-mount logs only once.
      if (logged.current) return;
      logged.current = true;
      const next = { id: newId(), vehicleId: activeVehicle.id, occurredAt: new Date().toISOString() };
      setMark(next);
      void saveEntry({ ...next, kind: "RESERVE" });
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [existingId, activeVehicle, saveEntry]);

  async function undo() {
    if (!current) return;
    if (!removeQueued(current.id)) {
      const result = await apiRequest(`/api/events/${current.id}`, { method: "DELETE" });
      if (!result.ok) return setError(result.error);
    }
    await refresh();
    router.replace("/");
  }

  async function switchVehicle(vehicleId: string) {
    if (!current || vehicleId === current.vehicleId) return;
    if (!removeQueued(current.id)) {
      await apiRequest(`/api/events/${current.id}`, { method: "DELETE" });
    }
    setActiveVehicleId(vehicleId);
    const next = { id: newId(), vehicleId, occurredAt: current.occurredAt };
    setMark(next);
    await saveEntry({ ...next, kind: "RESERVE" });
  }

  async function saveOdometer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current) return;
    const body = { ...current, kind: "RESERVE", odometerKm: odometer };
    const parsed = parseReserveInput(body);
    if (!parsed.ok || parsed.value.odometer === null) {
      return setError(parsed.ok ? "Enter the odometer reading" : parsed.error);
    }
    setError("");
    if (!updateQueued(current.id, { odometerKm: odometer })) {
      const result = await apiRequest(`/api/events/${current.id}`, {
        method: "PATCH",
        body: { occurredAt: current.occurredAt, odometerKm: odometer },
      });
      if (!result.ok) return setError(result.error);
    }
    setSaved(true);
    await refresh();
  }

  if (!activeVehicle) {
    return (
      <Page narrow>
        <p className="text-sm text-muted">{loaded ? "Add a vehicle first." : "Loading..."}</p>
        {loaded ? <Link href="/onboarding" className={primaryButtonClass}>Add vehicle</Link> : null}
      </Page>
    );
  }

  if (existingId && !existing) {
    return (
      <Page narrow>
        <p className="text-sm text-muted">This reserve mark already has a reading.</p>
        <Link href="/" className={secondaryButtonClass}>Back to Home</Link>
      </Page>
    );
  }

  return (
    <Page narrow>
      <section className={`${cardClass} text-center`}>
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-reserve text-reserve-foreground">
          <CheckIcon size={40} />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-foreground">On reserve</h1>
        <p className="mt-1 text-sm text-muted">
          {vehicle?.name} · marked at {current ? formatTime(current.occurredAt) : "…"}
        </p>
        <p className={`mt-3 inline-flex items-center gap-1.5 text-xs font-medium ${pending ? "text-warning" : "text-good"}`}>
          {pending ? <CloudOffIcon size={14} /> : <CheckIcon size={14} />}
          {pending ? "Saved on this phone. Will sync when online." : "Saved"}
        </p>
      </section>

      {!existingId && vehicles.length > 1 ? (
        <div>
          <p className="mb-2 text-sm text-muted">Wrong vehicle?</p>
          <div className="flex flex-wrap gap-2">
            {vehicles.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void switchVehicle(item.id)}
                className={`${chipClass} ${item.id === current?.vehicleId ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface text-subtle"}`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <section className={cardClass}>
        {saved ? (
          <p className="text-sm font-medium text-good">Odometer saved. You&apos;re all set.</p>
        ) : (
          <form onSubmit={saveOdometer} className="space-y-3" noValidate>
            <p className="text-sm text-subtle">
              <strong>Riding?</strong> Reset your trip meter to 0 now. When you fill up, enter the trip reading and we&apos;ll work out exactly where reserve started.
            </p>
            <Field label="Or add the odometer when you stop (optional)">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={odometer}
                onChange={(event) => setOdometer(event.target.value)}
                placeholder="Odometer in km"
                className={`${inputClass} tabular`}
              />
            </Field>
            {error ? <p className={errorTextClass}>{error}</p> : null}
            <button type="submit" className={`${secondaryButtonClass} w-full`}>Save odometer</button>
          </form>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        {!existingId ? (
          <button type="button" onClick={() => void undo()} className={secondaryButtonClass}>Undo</button>
        ) : (
          <span />
        )}
        <Link href="/" className={primaryButtonClass}>Done</Link>
      </div>
    </Page>
  );
}

export default function QuickReservePage() {
  return (
    <Suspense>
      <QuickReserve />
    </Suspense>
  );
}
