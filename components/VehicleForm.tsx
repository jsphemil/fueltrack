"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function VehicleForm() {
  const isDevelopment = process.env.NODE_ENV === "development";
  const [name, setName] = useState("");
  const [initialOdometer, setInitialOdometer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    let accessToken = "";
    if (!isDevelopment) {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setErrorMessage("Please log in before adding a vehicle.");
        setIsSubmitting(false);
        return;
      }
      accessToken = data.session.access_token;
    }

    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch("/api/vehicle", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: name.trim(),
        initial_odometer: Number(initialOdometer),
      }),
    });

    if (!response.ok) {
      setErrorMessage("Could not save vehicle.");
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage("Vehicle saved.");
    setName("");
    setInitialOdometer("");
    setIsSubmitting(false);
  }

  return (
    <section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-zinc-900">Add Vehicle</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Add your vehicle details to get started.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">
            Vehicle Name
          </span>
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Honda City"
            className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">
            Initial Odometer
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            required
            value={initialOdometer}
            onChange={(event) => setInitialOdometer(event.target.value)}
            placeholder="e.g. 10000"
            className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Save Vehicle"}
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
