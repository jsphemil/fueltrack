"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import FuelEntryForm from "@/components/FuelEntryForm";

type FuelEntry = {
  id: string;
  odometer: number;
  fuel_price: number;
  amount_paid: number;
  fuel_volume: number;
  is_reserve: boolean;
  vehicleId: string | null;
  created_at: string;
};

type Vehicle = {
  id: string;
  name: string;
};

type MonthlySpend = {
  month: string;
  total_spend: number;
};

type UserProfile = {
  id: string;
  name: string;
};

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState("");
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState("");
  const [monthlySpend, setMonthlySpend] = useState<MonthlySpend[]>([]);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editOdometer, setEditOdometer] = useState("");
  const [editFuelPrice, setEditFuelPrice] = useState("");
  const [editAmountPaid, setEditAmountPaid] = useState("");
  const [editIsReserve, setEditIsReserve] = useState(false);
  const [entryActionLoading, setEntryActionLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const dashboardMetrics = useMemo(() => {
    const orderedEntries = [...entries].sort((a, b) => a.odometer - b.odometer);
    const mileages: number[] = [];

    for (let index = 1; index < orderedEntries.length; index += 1) {
      const previous = orderedEntries[index - 1];
      const current = orderedEntries[index];

      const distance = current.odometer - previous.odometer;
      if (distance <= 0 || previous.fuel_volume <= 0) {
        continue;
      }

      mileages.push(distance / previous.fuel_volume);
    }

    const latestMileage =
      mileages.length > 0 ? mileages[mileages.length - 1] : null;
    const averageMileage =
      mileages.length > 0
        ? mileages.reduce((sum, value) => sum + value, 0) / mileages.length
        : null;
    const latestEntry =
      orderedEntries.length > 0 ? orderedEntries[orderedEntries.length - 1] : null;
    const range =
      latestEntry && averageMileage !== null
        ? latestEntry.fuel_volume * averageMileage
        : null;
    const nextRefuelOdometer =
      latestEntry && range !== null ? latestEntry.odometer + range : null;

    return {
      latestMileage,
      averageMileage,
      range,
      nextRefuelOdometer,
    };
  }, [entries]);

  const recentEntries = useMemo(() => entries.slice(0, 3), [entries]);


  const fetchProfile = useCallback(async (accessToken?: string) => {
    if (!accessToken) {
      setProfile(null);
      setProfileName("");
      return;
    }

    setProfileLoading(true);
    setProfileError("");

    const response = await fetch("/api/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      setProfileError("Could not load profile.");
      setProfileLoading(false);
      return;
    }

    const result = (await response.json()) as { profile: UserProfile | null };
    setProfile(result.profile);
    setProfileName(result.profile?.name ?? "");
    setProfileLoading(false);
  }, []);

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.access_token) {
      setProfileError("Please log in before saving your profile.");
      return;
    }

    const name = profileName.trim();
    if (!name) {
      setProfileError("Name is required.");
      return;
    }

    setProfileSaving(true);
    setProfileError("");

    const response = await fetch("/api/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setProfileError(result?.error ?? "Could not save profile.");
      setProfileSaving(false);
      return;
    }

    const result = (await response.json()) as { profile: UserProfile };
    setProfile(result.profile);
    setProfileName(result.profile.name);
    window.dispatchEvent(new Event("profile-updated"));
    setProfileSaving(false);
  }

  const fetchEntries = useCallback(
    async (accessToken?: string, vehicleId?: string | null) => {
      if (!accessToken) {
        setEntries([]);
        setMonthlySpend([]);
        return;
      }

      setEntriesLoading(true);
      setEntriesError("");

      const headers: HeadersInit = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const query = vehicleId
        ? `?vehicleId=${encodeURIComponent(vehicleId)}`
        : "";

      const response = await fetch(`/api/fuel-entry${query}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        setEntriesError("Could not load fuel entries.");
        setEntriesLoading(false);
        return;
      }

      const result = (await response.json()) as {
        entries: FuelEntry[];
        monthly_spend?: MonthlySpend[];
      };
      setEntries(result.entries ?? []);
      setMonthlySpend(result.monthly_spend ?? []);
      setEntriesLoading(false);
    },
    []
  );

  const fetchVehicles = useCallback(
    async (accessToken?: string) => {
      if (!accessToken) {
        setVehicles([]);
        setSelectedVehicleId(null);
        return null;
      }

      setVehiclesLoading(true);
      setVehiclesError("");

      const response = await fetch("/api/vehicle", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        setVehiclesError("Could not load vehicles.");
        setVehiclesLoading(false);
        return null;
      }

      const result = (await response.json()) as { vehicles: Vehicle[] };
      const nextVehicles = result.vehicles ?? [];
      setVehicles(nextVehicles);
      setSelectedVehicleId((currentValue) => {
        if (nextVehicles.length === 0) {
          return null;
        }

        if (currentValue && nextVehicles.some((vehicle) => vehicle.id === currentValue)) {
          return currentValue;
        }

        return nextVehicles[0].id;
      });
      setVehiclesLoading(false);
      return nextVehicles[0]?.id ?? null;
    },
    []
  );

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setSession(data.session);
      setLoading(false);
      if (data.session) {
        void fetchProfile(data.session.access_token);
        void fetchVehicles(data.session.access_token);
      } else {
        setEntries([]);
        setMonthlySpend([]);
        setVehicles([]);
        setSelectedVehicleId(null);
        setProfile(null);
        setProfileName("");
      }
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      if (nextSession) {
        void fetchProfile(nextSession.access_token);
        void fetchVehicles(nextSession.access_token);
      } else {
        setEntries([]);
        setMonthlySpend([]);
        setVehicles([]);
        setSelectedVehicleId(null);
        setProfile(null);
        setProfileName("");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, fetchVehicles]);

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchEntries(session.access_token, selectedVehicleId);
  }, [fetchEntries, selectedVehicleId, session?.access_token]);

  function startEditingEntry(entry: FuelEntry) {
    setEditingEntryId(entry.id);
    setEditOdometer(String(entry.odometer));
    setEditFuelPrice(String(entry.fuel_price));
    setEditAmountPaid(String(entry.amount_paid));
    setEditIsReserve(entry.is_reserve);
    setEntriesError("");
  }

  function cancelEditingEntry() {
    setEditingEntryId(null);
    setEditOdometer("");
    setEditFuelPrice("");
    setEditAmountPaid("");
    setEditIsReserve(false);
  }

  async function handleUpdateEntry(entry: FuelEntry) {
    if (!session?.access_token) {
      setEntriesError("Please log in before updating an entry.");
      return;
    }

    const odometer = Number(editOdometer);
    const fuelPrice = Number(editFuelPrice);
    const amountPaid = Number(editAmountPaid);
    const fuelVolume =
      Number.isFinite(fuelPrice) && fuelPrice > 0 ? amountPaid / fuelPrice : 0;

    setEntryActionLoading(true);
    setEntriesError("");

    const response = await fetch("/api/fuel-entry", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        id: entry.id,
        vehicleId: entry.vehicleId,
        odometer,
        fuel_price: fuelPrice,
        amount_paid: amountPaid,
        fuel_volume: fuelVolume,
        is_reserve: editIsReserve,
      }),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;
      setEntriesError(
        result?.message ?? result?.error ?? "Could not update fuel entry."
      );
      setEntryActionLoading(false);
      return;
    }

    cancelEditingEntry();
    await fetchEntries(session.access_token, selectedVehicleId);
    setEntryActionLoading(false);
  }

  async function handleDeleteEntry(entryId: string) {
    if (!session?.access_token) {
      setEntriesError("Please log in before deleting an entry.");
      return;
    }

    setEntryActionLoading(true);
    setEntriesError("");

    const response = await fetch(`/api/fuel-entry?id=${encodeURIComponent(entryId)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;
      setEntriesError(
        result?.message ?? result?.error ?? "Could not delete fuel entry."
      );
      setEntryActionLoading(false);
      return;
    }

    if (editingEntryId === entryId) {
      cancelEditingEntry();
    }

    await fetchEntries(session.access_token, selectedVehicleId);
    setEntryActionLoading(false);
  }



  const monthlySpendFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }),
    []
  );

  const monthLabelFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
    []
  );

  const isAuthenticated = Boolean(session);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <section className="mx-auto w-full max-w-4xl rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">FuelTrack</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Track your fuel usage once you sign in with Email and Password.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-zinc-700">Checking session...</p>
        ) : !isAuthenticated ? (
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Go to Login
            </Link>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p>
        ) : null}

        {isAuthenticated && !profileLoading && !profile ? (
          <section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-zinc-900">Enter your name</h2>
            <form onSubmit={handleSaveProfile} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                className="h-10 flex-1 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900"
                placeholder="Enter your name"
                required
              />
              <button
                type="submit"
                disabled={profileSaving}
                className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {profileSaving ? "Saving..." : "Save"}
              </button>
            </form>
            {profileError ? (
              <p className="mt-3 text-sm font-medium text-red-600">{profileError}</p>
            ) : null}
          </section>
        ) : null}

        {isAuthenticated ? (
          <section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-zinc-900">Vehicle Selection</h2>

            {vehiclesLoading ? (
              <p className="mt-3 text-sm text-zinc-600">Loading vehicles...</p>
            ) : vehiclesError ? (
              <p className="mt-3 text-sm font-medium text-red-600">{vehiclesError}</p>
            ) : vehicles.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-600">No vehicles available yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-zinc-700">
                    Select Vehicle
                  </span>
                  <select
                    value={selectedVehicleId ?? ""}
                    onChange={(event) => setSelectedVehicleId(event.target.value)}
                    className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
                  >
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </section>
        ) : null}

        {isAuthenticated ? (
          <section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-zinc-900">Add Fuel Entry</h2>
            <FuelEntryForm
            vehicleId={selectedVehicleId}
            onSaved={() => fetchEntries(session?.access_token, selectedVehicleId)}
          />
          </section>
        ) : null}

        {isAuthenticated ? (
          <section className="mt-8 space-y-6">

            <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <h2 className="text-lg font-semibold text-zinc-900">Metrics</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <article className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-sm text-zinc-500">Latest mileage</p>
                  <p className="mt-1 text-lg font-semibold text-zinc-900">
                    {dashboardMetrics.latestMileage !== null
                      ? `${dashboardMetrics.latestMileage.toFixed(1)} km/l`
                      : "Not enough data"}
                  </p>
                </article>

                <article className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-sm text-zinc-500">Average mileage</p>
                  <p className="mt-1 text-lg font-semibold text-zinc-900">
                    {dashboardMetrics.averageMileage !== null
                      ? `${dashboardMetrics.averageMileage.toFixed(1)} km/l`
                      : "Not enough data"}
                  </p>
                </article>

                <article className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-sm text-zinc-500">Range</p>
                  <p className="mt-1 text-lg font-semibold text-zinc-900">
                    {dashboardMetrics.range !== null
                      ? `${dashboardMetrics.range.toFixed(1)} km`
                      : "Not enough data"}
                  </p>
                </article>

                <article className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-sm text-zinc-500">Next refuel</p>
                  <p className="mt-1 text-lg font-semibold text-zinc-900">
                    {dashboardMetrics.nextRefuelOdometer !== null
                      ? Math.round(
                          dashboardMetrics.nextRefuelOdometer
                        ).toLocaleString()
                      : "Not enough data"}
                  </p>
                </article>

                <article className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-sm text-zinc-500">Monthly spend</p>
                  <p className="mt-1 text-lg font-semibold text-zinc-900">
                    {entriesLoading
                      ? "Loading..."
                      : monthlySpend.length > 0
                        ? (() => {
                            const latestMonth = monthlySpend[0];
                            const [year, month] = latestMonth.month.split("-");
                            const monthDate = new Date(
                              Date.UTC(Number(year), Number(month) - 1, 1)
                            );
                            return `${monthLabelFormatter.format(monthDate)}: ${monthlySpendFormatter.format(latestMonth.total_spend)}`;
                          })()
                        : "No data"}
                  </p>
                </article>

              </div>
            </section>
            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Recent Entries
                </h2>
                <Link
                  href={
                    selectedVehicleId
                      ? `/history?vehicleId=${encodeURIComponent(selectedVehicleId)}`
                      : "/history"
                  }
                  className="inline-flex h-9 items-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
                >
                  View Full History
                </Link>
              </div>

              {entriesLoading ? (
                <p className="mt-3 text-sm text-zinc-600">Loading entries...</p>
              ) : entriesError ? (
                <p className="mt-3 text-sm font-medium text-red-600">
                  {entriesError}
                </p>
              ) : recentEntries.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-600">No fuel entries yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {recentEntries.map((entry) => (
                    <article
                      key={entry.id}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                    >
                      {editingEntryId === entry.id ? (
                        <div className="space-y-3">
                          <label className="block">
                            <span className="mb-1.5 block text-sm font-medium text-zinc-700">
                              Odometer
                            </span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.1"
                              value={editOdometer}
                              onChange={(event) => setEditOdometer(event.target.value)}
                              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-sm font-medium text-zinc-700">
                              Fuel Price
                            </span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              value={editFuelPrice}
                              onChange={(event) => setEditFuelPrice(event.target.value)}
                              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
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
                              value={editAmountPaid}
                              onChange={(event) => setEditAmountPaid(event.target.value)}
                              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm text-zinc-700">
                            <input
                              type="checkbox"
                              checked={editIsReserve}
                              onChange={(event) => setEditIsReserve(event.target.checked)}
                              className="h-4 w-4 accent-zinc-900"
                            />
                            Filled at reserve
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateEntry(entry)}
                              disabled={entryActionLoading}
                              className="h-9 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditingEntry}
                              disabled={entryActionLoading}
                              className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-zinc-700">
                            Odometer:{" "}
                            <span className="font-medium text-zinc-900">
                              {entry.odometer}
                            </span>
                          </p>
                          <p className="mt-1 text-sm text-zinc-700">
                            Fuel Price:{" "}
                            <span className="font-medium text-zinc-900">
                              {entry.fuel_price.toFixed(2)}
                            </span>
                          </p>
                          <p className="mt-1 text-sm text-zinc-700">
                            Amount Paid:{" "}
                            <span className="font-medium text-zinc-900">
                              {entry.amount_paid.toFixed(2)}
                            </span>
                          </p>
                          <p className="mt-1 text-sm text-zinc-700">
                            Fuel Volume:{" "}
                            <span className="font-medium text-zinc-900">
                              {entry.fuel_volume.toFixed(2)} L
                            </span>
                          </p>
                          <p className="mt-1 text-sm text-zinc-700">
                            Filled at reserve:{" "}
                            <span className="font-medium text-zinc-900">
                              {entry.is_reserve ? "Yes" : "No"}
                            </span>
                          </p>
                          <p className="mt-1 text-sm text-zinc-700">
                            Created at:{" "}
                            <span className="font-medium text-zinc-900">
                              {new Date(entry.created_at).toLocaleString()}
                            </span>
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEditingEntry(entry)}
                              disabled={entryActionLoading}
                              className="h-9 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(entry.id)}
                              disabled={entryActionLoading}
                              className="h-9 rounded-lg border border-red-300 bg-white px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        ) : null}
      </section>
    </main>
  );
}
