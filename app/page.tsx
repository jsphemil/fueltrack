"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    setErrorMessage("");
    const { error } = await supabase.auth.signOut();
    if (error) {
      setErrorMessage(error.message);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <section className="mx-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">FuelTrack</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Track your fuel usage once you sign in with your magic link.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-zinc-700">Checking session...</p>
        ) : session ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-zinc-700">
              Signed in as{" "}
              <span className="font-medium text-zinc-900">
                {session.user.email}
              </span>
              .
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              className="h-11 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Go to Login
            </Link>
          </div>
        )}

        {errorMessage ? (
          <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p>
        ) : null}
      </section>
    </main>
  );
}
