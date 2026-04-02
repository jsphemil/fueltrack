"use client";

import { FormEvent, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type FuelEntryFormProps = {
  onSaved?: () => void;
};

export default function FuelEntryForm({ onSaved }: FuelEntryFormProps) {
  const [odometer, setOdometer] = useState("");
  const [fuelPrice, setFuelPrice] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [isReserve, setIsReserve] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fuelVolume = useMemo(() => {
    const price = Number(fuelPrice);
    const amount = Number(amountPaid);

    if (!price || price <= 0 || !amount || amount < 0) {
      return 0;
    }

    return amount / price;
  }, [fuelPrice, amountPaid]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      setErrorMessage("Please log in before saving an entry.");
      setIsSubmitting(false);
      return;
    }

    const response = await fetch("/api/fuel-entry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({
        odometer: Number(odometer),
        fuel_price: Number(fuelPrice),
        amount_paid: Number(amountPaid),
        fuel_volume: fuelVolume,
        is_reserve: isReserve,
      }),
    });

    if (!response.ok) {
      setErrorMessage("Could not save fuel entry.");
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage("Fuel entry saved.");
    setOdometer("");
    setFuelPrice("");
    setAmountPaid("");
    setIsReserve(false);
    onSaved?.();
    setIsSubmitting(false);
  }

  return (
    <section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-zinc-900">New Fuel Entry</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Fill in the details below. Fuel volume is calculated automatically.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">
            Odometer Reading
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            required
            value={odometer}
            onChange={(event) => setOdometer(event.target.value)}
            placeholder="e.g. 45231.5"
            className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">
            Fuel Price per Litre
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            value={fuelPrice}
            onChange={(event) => setFuelPrice(event.target.value)}
            placeholder="e.g. 102.45"
            className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">
            Amount Paid
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            value={amountPaid}
            onChange={(event) => setAmountPaid(event.target.value)}
            placeholder="e.g. 1500"
            className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
          />
        </label>

        <label className="flex items-center gap-3 rounded-lg border border-zinc-300 bg-white px-3 py-2.5">
          <input
            type="checkbox"
            checked={isReserve}
            onChange={(event) => setIsReserve(event.target.checked)}
            className="h-4 w-4 accent-zinc-900"
          />
          <span className="text-sm font-medium text-zinc-700">
            Filled at reserve
          </span>
        </label>

        <div className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Calculated Fuel Volume
          </p>
          <p className="mt-1 text-base font-semibold text-zinc-900">
            {fuelVolume.toFixed(2)} L
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Save Fuel Entry"}
        </button>

        {successMessage ? (
          <p className="text-sm font-medium text-emerald-700">{successMessage}</p>
        ) : null}

        {errorMessage ? (
          <p className="text-sm font-medium text-red-600">{errorMessage}</p>
        ) : null}
      </form>
    </section>
  );
}
