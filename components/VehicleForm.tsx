"use client";

import { FormEvent, useState } from "react";

import { Field } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { toInputNumber } from "@/lib/format";
import { newId } from "@/lib/outbox";
import type { Vehicle, VehicleSummary } from "@/lib/types";
import { chipClass, errorTextClass, inputClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { parseVehicleInput, VEHICLE_KINDS, VEHICLE_NAME_MAX_LENGTH } from "@/lib/validation";

type InitialState = "full" | "reserve" | "unknown";

const INITIAL_STATES: Array<{ value: InitialState; title: string; detail: string }> = [
  { value: "full", title: "Just filled a full tank", detail: "Best if you know your tank size." },
  { value: "reserve", title: "On reserve right now", detail: "Most accurate. Fill up and log it next." },
  { value: "unknown", title: "Not sure", detail: "Estimates start after your next reserve." },
];

type VehicleFormProps = {
  vehicle?: Vehicle; // edit when set
  submitLabel?: string;
  onSaved: (vehicle: VehicleSummary) => void;
  onCancel?: () => void;
};

export default function VehicleForm({ vehicle, submitLabel, onSaved, onCancel }: VehicleFormProps) {
  const isEditing = Boolean(vehicle);
  const [name, setName] = useState(vehicle?.name ?? "");
  const [kind, setKind] = useState<string>(vehicle?.kind ?? "Motorcycle");
  const [odometer, setOdometer] = useState(toInputNumber(vehicle?.startOdometer, 10, 1));
  const [tankCapacity, setTankCapacity] = useState(toInputNumber(vehicle?.tankCapacityMl, 1000, 2));
  const [reserve, setReserve] = useState(toInputNumber(vehicle?.reserveMl, 1000, 2));
  const [showTank, setShowTank] = useState(Boolean(vehicle?.tankCapacityMl || vehicle?.reserveMl));
  const [initialState, setInitialState] = useState<InitialState>("reserve");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = {
      name,
      kind,
      startOdometerKm: odometer,
      tankCapacityL: showTank ? tankCapacity : "",
      reserveL: showTank ? reserve : "",
    };
    const parsed = parseVehicleInput(body);
    if (!parsed.ok) return setError(parsed.error);

    setSaving(true);
    setError("");
    const result = await apiRequest<{ vehicle: VehicleSummary }>(isEditing ? `/api/vehicles/${vehicle?.id}` : "/api/vehicles", {
      method: isEditing ? "PATCH" : "POST",
      body: isEditing ? body : { ...body, initialState, initialEventId: newId() },
    });
    setSaving(false);

    if (!result.ok) return setError(result.error);
    onSaved(result.data.vehicle);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <Field label="Vehicle name">
        <input
          value={name}
          maxLength={VEHICLE_NAME_MAX_LENGTH}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Splendor Plus"
          className={inputClass}
        />
      </Field>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-subtle">Type</span>
        <div className="flex flex-wrap gap-2">
          {VEHICLE_KINDS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setKind(option)}
              aria-pressed={kind === option}
              className={`${chipClass} ${kind === option ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface text-subtle"}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <Field label={isEditing ? "Starting odometer (km)" : "Current odometer (km)"}>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          value={odometer}
          onChange={(event) => setOdometer(event.target.value)}
          placeholder="e.g. 12450"
          className={`${inputClass} tabular`}
        />
      </Field>

      {showTank ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tank capacity (L)" hint="From the owner's manual">
            <input type="number" inputMode="decimal" min="0" step="0.1" value={tankCapacity} onChange={(event) => setTankCapacity(event.target.value)} placeholder="e.g. 9.8" className={`${inputClass} tabular`} />
          </Field>
          <Field label="Reserve (L)" hint="Fuel left when you switch">
            <input type="number" inputMode="decimal" min="0" step="0.1" value={reserve} onChange={(event) => setReserve(event.target.value)} placeholder="e.g. 1.4" className={`${inputClass} tabular`} />
          </Field>
        </div>
      ) : (
        <button type="button" onClick={() => setShowTank(true)} className="text-left text-sm font-medium text-subtle underline">
          Add tank capacity and reserve (optional, unlocks fuel level and km on reserve)
        </button>
      )}

      {!isEditing ? (
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-subtle">Fuel right now</legend>
          <div className="grid gap-2">
            {INITIAL_STATES.map((state) => (
              <label
                key={state.value}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                  initialState === state.value ? "border-primary bg-surface-muted" : "border-border-strong bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name="initial-state"
                  value={state.value}
                  checked={initialState === state.value}
                  onChange={() => setInitialState(state.value)}
                  className="mt-1 accent-current"
                />
                <span>
                  <span className="block text-sm font-semibold text-foreground">{state.title}</span>
                  <span className="block text-xs text-muted">{state.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {error ? <p className={errorTextClass}>{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className={`${primaryButtonClass} flex-1`}>
          {saving ? "Saving..." : submitLabel ?? (isEditing ? "Save changes" : "Add vehicle")}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} disabled={saving} className={secondaryButtonClass}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
