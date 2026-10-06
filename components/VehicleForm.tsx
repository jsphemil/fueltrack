"use client";

import { FormEvent, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { Vehicle } from "@/lib/types";
import {
  errorTextClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  successTextClass,
} from "@/lib/ui";
import { parseVehicleInput, VEHICLE_NAME_MAX_LENGTH, VEHICLE_TYPE_MAX_LENGTH } from "@/lib/validation";

type VehicleFormProps = {
  // When set the form edits this vehicle instead of creating a new one.
  vehicle?: Vehicle;
  onSaved?: (vehicle: Vehicle) => void;
  onCancel?: () => void;
};

export default function VehicleForm({ vehicle, onSaved, onCancel }: VehicleFormProps) {
  const isEditing = Boolean(vehicle);
  const [name, setName] = useState(vehicle?.name ?? "");
  const [vehicleType, setVehicleType] = useState(vehicle?.vehicleType ?? "");
  const [initialOdometer, setInitialOdometer] = useState(vehicle ? String(vehicle.initial_odometer) : "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const payload = { name, vehicleType, initial_odometer: initialOdometer };
    const parsed = parseVehicleInput(payload);
    if (!parsed.ok) {
      setErrorMessage(parsed.error);
      return;
    }

    setIsSubmitting(true);
    const result = await apiRequest<{ vehicle: Vehicle }>("/api/vehicle", {
      method: isEditing ? "PUT" : "POST",
      body: { ...parsed.value, ...(vehicle ? { id: vehicle.id } : {}) },
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    if (!isEditing) {
      setSuccessMessage("Vehicle saved.");
      setName("");
      setVehicleType("");
      setInitialOdometer("");
    }

    onSaved?.(result.data.vehicle);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className={labelClass}>Vehicle name</span>
          <input
            type="text"
            required
            maxLength={VEHICLE_NAME_MAX_LENGTH}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Classic 350"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Vehicle type</span>
          <input
            type="text"
            required
            maxLength={VEHICLE_TYPE_MAX_LENGTH}
            list="vehicle-type-options"
            value={vehicleType}
            onChange={(event) => setVehicleType(event.target.value)}
            placeholder="e.g. Motorcycle"
            className={inputClass}
          />
          <datalist id="vehicle-type-options">
            <option value="Motorcycle" />
            <option value="Scooter" />
            <option value="Car" />
          </datalist>
        </label>

        <label className="block">
          <span className={labelClass}>Initial odometer (km)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            required
            value={initialOdometer}
            onChange={(event) => setInitialOdometer(event.target.value)}
            placeholder="e.g. 10000"
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
          {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Add vehicle"}
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
