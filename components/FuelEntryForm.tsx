"use client";

import { FormEvent, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import { formatNumber, toDateTimeLocalValue } from "@/lib/format";
import type { FuelEntry } from "@/lib/types";
import {
  errorTextClass,
  inputClass,
  labelClass,
  mutedTextClass,
  primaryButtonClass,
  secondaryButtonClass,
  successTextClass,
} from "@/lib/ui";
import { calculateFuelVolume, parseFuelEntryInput } from "@/lib/validation";

type FuelEntryFormProps = {
  vehicleId: string | null;
  // When set the form edits this entry instead of creating a new one.
  entry?: FuelEntry;
  lastOdometer?: number;
  onSaved?: (entry: FuelEntry) => void;
  onCancel?: () => void;
};

export default function FuelEntryForm({ vehicleId, entry, lastOdometer, onSaved, onCancel }: FuelEntryFormProps) {
  const isEditing = Boolean(entry);
  const [filledAt, setFilledAt] = useState(() => toDateTimeLocalValue(entry?.filled_at ?? new Date()));
  const [odometer, setOdometer] = useState(entry ? String(entry.odometer) : "");
  const [fuelPrice, setFuelPrice] = useState(entry ? String(entry.fuel_price) : "");
  const [amountPaid, setAmountPaid] = useState(entry ? String(entry.amount_paid) : "");
  const [isReserve, setIsReserve] = useState(entry?.is_reserve ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fuelVolume = useMemo(
    () => calculateFuelVolume(Number(amountPaid), Number(fuelPrice)),
    [amountPaid, fuelPrice]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const filledAtDate = new Date(filledAt);
    const payload = {
      vehicleId: vehicleId ?? "",
      odometer,
      fuel_price: fuelPrice,
      amount_paid: amountPaid,
      is_reserve: isReserve,
      filled_at: Number.isNaN(filledAtDate.getTime()) ? "invalid" : filledAtDate.toISOString(),
    };

    // Same validation as the API, so most mistakes are caught before saving.
    const parsed = parseFuelEntryInput(payload);
    if (!parsed.ok) {
      setErrorMessage(parsed.error);
      return;
    }

    setIsSubmitting(true);
    const result = await apiRequest<{ entry: FuelEntry }>("/api/fuel-entry", {
      method: isEditing ? "PUT" : "POST",
      body: { ...payload, ...(entry ? { id: entry.id } : {}) },
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    if (!isEditing) {
      setSuccessMessage("Fuel entry saved.");
      setFilledAt(toDateTimeLocalValue(new Date()));
      setOdometer("");
      setAmountPaid("");
      setIsReserve(false);
    }

    onSaved?.(result.data.entry);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Fill date and time</span>
          <input
            type="datetime-local"
            required
            value={filledAt}
            max={toDateTimeLocalValue(new Date())}
            onChange={(event) => setFilledAt(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Odometer reading (km)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            required
            value={odometer}
            onChange={(event) => setOdometer(event.target.value)}
            placeholder="e.g. 45231.5"
            className={inputClass}
          />
          {typeof lastOdometer === "number" && !isEditing ? (
            <span className={`mt-1 block text-xs ${mutedTextClass}`}>
              Last reading: {formatNumber(lastOdometer)} km
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className={labelClass}>Fuel price per litre</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            value={fuelPrice}
            onChange={(event) => setFuelPrice(event.target.value)}
            placeholder="e.g. 102.45"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Amount paid</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            value={amountPaid}
            onChange={(event) => setAmountPaid(event.target.value)}
            placeholder="e.g. 500"
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-border-strong bg-surface px-3 py-2.5">
        <input
          type="checkbox"
          checked={isReserve}
          onChange={(event) => setIsReserve(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-current"
        />
        <span>
          <span className="block text-sm font-medium text-foreground">Filled at reserve</span>
          <span className={`block text-xs ${mutedTextClass}`}>
            Tick when the tank was on reserve before this fill. Mileage is measured between reserve fills.
          </span>
        </span>
      </label>

      <div className="rounded-lg border border-border-strong bg-surface px-3 py-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Calculated fuel volume</p>
        <p className="mt-1 text-base font-semibold text-foreground">{fuelVolume.toFixed(2)} L</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={isSubmitting || !vehicleId} className={primaryButtonClass}>
          {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Save fuel entry"}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} disabled={isSubmitting} className={secondaryButtonClass}>
            Cancel
          </button>
        ) : null}
      </div>

      {successMessage ? <p className={successTextClass}>{successMessage}</p> : null}
      {errorMessage ? <p className={errorTextClass}>{errorMessage}</p> : null}
    </form>
  );
}
