"use client";

import type { ReactNode } from "react";

import { useFuel } from "@/lib/fuel-context";
import { removeQueued } from "@/lib/outbox";
import { chipClass, hintClass, labelClass } from "@/lib/ui";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Page({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className={`mx-auto w-full ${narrow ? "max-w-xl" : "max-w-5xl"} space-y-5 px-4 pt-6 sm:px-6 sm:pt-10`}>
      {children}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? <span className={hintClass}>{hint}</span> : null}
    </label>
  );
}

const noticeTones = {
  info: "border-border bg-surface text-subtle",
  reserve: "border-reserve/40 bg-reserve/10 text-foreground",
  danger: "border-danger/40 bg-danger/10 text-foreground",
  good: "border-good/40 bg-good/10 text-foreground",
};

export function Notice({
  tone = "info",
  children,
  action,
}: {
  tone?: keyof typeof noticeTones;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${noticeTones[tone]}`}>
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="tabular mt-1 text-xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

// Switches the active vehicle; hidden when there's only one.
export function VehicleChips() {
  const { vehicles, activeVehicle, setActiveVehicleId } = useFuel();
  if (vehicles.length < 2) return null;

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Vehicle">
      {vehicles.map((vehicle) => {
        const active = vehicle.id === activeVehicle?.id;
        return (
          <button
            key={vehicle.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setActiveVehicleId(vehicle.id)}
            className={`${chipClass} shrink-0 ${
              active ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface text-subtle"
            }`}
          >
            {vehicle.name}
          </button>
        );
      })}
    </div>
  );
}

// Offline queue status: pending entries and any the server rejected.
export function SyncStatus() {
  const { outbox, sync } = useFuel();
  if (outbox.length === 0) return null;
  const failed = outbox.filter((item) => item.error);
  const pending = outbox.length - failed.length;

  return (
    <div className="space-y-2">
      {pending > 0 ? (
        <Notice
          tone="info"
          action={
            <button type="button" onClick={() => void sync()} className="text-sm font-semibold text-foreground underline">
              Retry now
            </button>
          }
        >
          {pending} {pending === 1 ? "entry is" : "entries are"} saved on this phone and will sync when you&apos;re online.
        </Notice>
      ) : null}
      {failed.map((item) => (
        <FailedEntry key={item.id} id={item.id} kind={String(item.body.kind)} error={item.error ?? ""} />
      ))}
    </div>
  );
}

function FailedEntry({ id, kind, error }: { id: string; kind: string; error: string }) {
  return (
    <Notice
      tone="danger"
      action={
        <button
          type="button"
          onClick={() => removeQueued(id)}
          className="text-sm font-semibold text-danger underline"
        >
          Discard
        </button>
      }
    >
      Couldn&apos;t save a {kind.toLowerCase()} entry: {error}
    </Notice>
  );
}
