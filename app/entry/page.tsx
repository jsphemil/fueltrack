"use client";

import Link from "next/link";
import { useState } from "react";

import FuelEntryForm from "@/components/FuelEntryForm";
import PageShell from "@/components/PageShell";
import VehicleSelect from "@/components/VehicleSelect";
import { useSession, useVehicles } from "@/lib/hooks";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

export default function EntryPage() {
  const { loading: sessionLoading, userId } = useSession();
  const {
    vehicles,
    loading: vehiclesLoading,
    error: vehiclesError,
    selectedVehicleId,
    selectedVehicle,
    setSelectedVehicleId,
    reload,
  } = useVehicles(userId);
  const [savedCount, setSavedCount] = useState(0);

  return (
    <PageShell
      title="Add fuel entry"
      description="Record a fill-up. Fuel volume is calculated from the amount and price."
      loading={sessionLoading || !userId}
    >
      <section className={`${cardClass} space-y-6`}>
        <VehicleSelect
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onChange={setSelectedVehicleId}
          loading={vehiclesLoading}
          error={vehiclesError}
        />

        {selectedVehicleId ? (
          <FuelEntryForm
            key={selectedVehicleId}
            vehicleId={selectedVehicleId}
            lastOdometer={selectedVehicle?.lastOdometer}
            onSaved={() => {
              setSavedCount((count) => count + 1);
              void reload();
            }}
          />
        ) : null}
      </section>

      {savedCount > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Link href="/" className={secondaryButtonClass}>
            Go to dashboard
          </Link>
          <Link href="/history" className={secondaryButtonClass}>
            View history
          </Link>
        </div>
      ) : null}
    </PageShell>
  );
}
