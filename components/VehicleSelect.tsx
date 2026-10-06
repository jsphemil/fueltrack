import Link from "next/link";

import type { Vehicle } from "@/lib/types";
import { errorTextClass, inputClass, labelClass, mutedTextClass, primaryButtonClass } from "@/lib/ui";

type VehicleSelectProps = {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onChange: (vehicleId: string) => void;
  loading?: boolean;
  error?: string;
};

export default function VehicleSelect({ vehicles, selectedVehicleId, onChange, loading, error }: VehicleSelectProps) {
  if (loading && vehicles.length === 0) {
    return <p className={mutedTextClass}>Loading vehicles...</p>;
  }

  if (error) {
    return <p className={errorTextClass}>{error}</p>;
  }

  if (vehicles.length === 0) {
    return (
      <div className="space-y-3">
        <p className={mutedTextClass}>Add a vehicle to start tracking fuel.</p>
        <Link href="/account#add-vehicle" className={primaryButtonClass}>
          Add vehicle
        </Link>
      </div>
    );
  }

  return (
    <label className="block max-w-sm">
      <span className={labelClass}>Vehicle</span>
      <select
        value={selectedVehicleId ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      >
        {vehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.name} ({vehicle.vehicleType})
          </option>
        ))}
      </select>
    </label>
  );
}
