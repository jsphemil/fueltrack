"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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

export default function HistoryPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState("");
  const [entries, setEntries] = useState<FuelEntry[]>([]);

  async function fetchEntries(accessToken?: string) {
    if (!accessToken) {
      setEntries([]);
      return;
    }

    setEntriesLoading(true);
    setEntriesError("");

    const response = await fetch("/api/fuel-entry", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      setEntriesError("Could not load fuel history.");
      setEntriesLoading(false);
      return;
    }

    const result = (await response.json()) as { entries: FuelEntry[] };
    setEntries(result.entries ?? []);
    setEntriesLoading(false);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setSession(data.session);
      setLoading(false);
      if (data.session) {
        void fetchEntries(data.session.access_token);
      }
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      if (nextSession) {
        void fetchEntries(nextSession.access_token);
      } else {
        setEntries([]);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <section className="mx-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">Fuel History</h1>
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
          >
            Back to Dashboard
          </Link>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-zinc-600">Checking session...</p>
        ) : !session ? (
          <div className="mt-4">
            <p className="text-sm text-zinc-700">Please login to view history.</p>
            <Link
              href="/login"
              className="mt-3 inline-flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Go to Login
            </Link>
          </div>
        ) : entriesLoading ? (
          <p className="mt-4 text-sm text-zinc-600">Loading entries...</p>
        ) : entriesError ? (
          <p className="mt-4 text-sm font-medium text-red-600">{entriesError}</p>
        ) : entries.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">No fuel entries yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {entries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
              >
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
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
