"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import {
  errorTextClass,
  inputClass,
  labelClass,
  mutedTextClass,
  pageClass,
  primaryButtonClass,
  secondaryButtonClass,
  successTextClass,
} from "@/lib/ui";

const MIN_PASSWORD_LENGTH = 6;

export default function LoginPage() {
  const router = useRouter();
  const { session } = useSession({ requireAuth: false });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (session) {
      router.replace("/");
    }
  }, [session, router]);

  function validate() {
    if (!email.trim()) {
      return "Email is required.";
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    return "";
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);

    if (error) {
      setErrorMessage(
        error.message.toLowerCase().includes("invalid login credentials")
          ? "Incorrect email or password."
          : error.message
      );
      return;
    }

    router.replace("/");
  }

  async function handleCreateAccount() {
    setErrorMessage("");
    setSuccessMessage("");

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (data.session) {
      router.replace("/");
      return;
    }

    setSuccessMessage("Account created. Check your email to confirm it, then sign in.");
  }

  return (
    <main className={`${pageClass} flex items-start justify-center sm:items-center`}>
      <section className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">FuelTrack</h1>
        <p className={`mt-1 ${mutedTextClass}`}>Sign in with your email and password.</p>

        <form onSubmit={handleSignIn} className="mt-6 space-y-4" noValidate>
          <label className="block">
            <span className={labelClass}>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              className={inputClass}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button type="submit" disabled={loading} className={`${primaryButtonClass} w-full`}>
              {loading ? "Please wait..." : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => void handleCreateAccount()}
              disabled={loading}
              className={`${secondaryButtonClass} w-full`}
            >
              Create account
            </button>
          </div>
        </form>

        {successMessage ? <p className={`mt-4 ${successTextClass}`}>{successMessage}</p> : null}
        {errorMessage ? <p className={`mt-4 ${errorTextClass}`}>{errorMessage}</p> : null}
      </section>
    </main>
  );
}
