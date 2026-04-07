"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function getInvalidPasswordMessage(errorText: string) {
    const lower = errorText.toLowerCase();
    return (
      lower.includes("password") || lower.includes("invalid login credentials")
    );
  }

  async function handleSignIn() {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const trimmedEmail = email.trim();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (!error && data.user) {
      setSuccessMessage("Login successful.");
      setLoading(false);
      return;
    }

    if (error && getInvalidPasswordMessage(error.message)) {
      setErrorMessage("Invalid password.");
      setLoading(false);
      return;
    }

    setErrorMessage(error?.message ?? "Unable to sign in.");
    setLoading(false);
  }

  async function handleCreateAccount() {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const trimmedEmail = email.trim();
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    });

    if (!error && data.user) {
      setSuccessMessage("Signup successful.");
      setLoading(false);
      return;
    }

    if (error && getInvalidPasswordMessage(error.message)) {
      setErrorMessage("Invalid password.");
      setLoading(false);
      return;
    }

    setErrorMessage(error?.message ?? "Unable to create account.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <section className="mx-auto w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">FuelTrack Login</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Use Email and Password.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-12 w-full rounded-lg border border-zinc-300 px-4 text-base outline-none transition focus:border-zinc-500"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">
              Password
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              className="h-12 w-full rounded-lg border border-zinc-300 px-4 text-base outline-none transition focus:border-zinc-500"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleSignIn}
              disabled={loading}
              className="h-12 w-full rounded-lg bg-zinc-900 px-4 text-base font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Please wait..." : "Sign In"}
            </button>
            <button
              type="button"
              onClick={handleCreateAccount}
              disabled={loading}
              className="h-12 w-full rounded-lg border border-zinc-300 bg-white px-4 text-base font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Please wait..." : "Create Account"}
            </button>
          </div>
        </div>

        {successMessage ? (
          <p className="mt-4 text-sm font-medium text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p>
        ) : null}
      </section>
    </main>
  );
}
