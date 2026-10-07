"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { FuelIcon } from "@/components/Icons";
import { Field } from "@/components/ui";
import { useSession } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { errorTextClass, inputClass, primaryButtonClass, secondaryButtonClass, successTextClass } from "@/lib/ui";

const MIN_PASSWORD_LENGTH = 6;

export default function LoginPage() {
  const router = useRouter();
  const { session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  function validate() {
    if (!email.trim()) return "Email is required.";
    if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    return "";
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    const validationError = validate();
    if (validationError) return setErrorMessage(validationError);

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);

    if (error) {
      setErrorMessage(
        error.message.toLowerCase().includes("invalid login credentials") ? "Incorrect email or password." : error.message
      );
      return;
    }
    router.replace("/");
  }

  async function handleCreateAccount() {
    setErrorMessage("");
    setSuccessMessage("");
    const validationError = validate();
    if (validationError) return setErrorMessage(validationError);

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);

    if (error) return setErrorMessage(error.message);
    if (data.session) return router.replace("/");
    setSuccessMessage("Account created. Check your email to confirm it, then sign in.");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-reserve text-reserve-foreground">
            <FuelIcon size={28} />
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">FuelTrack</h1>
          <p className="mt-2 text-sm text-muted">The fuel gauge your bike doesn&apos;t have.</p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-sm" noValidate>
          <Field label="Email">
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
          </Field>
          <Field label="Password">
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className={inputClass} />
          </Field>
          <button type="submit" disabled={loading} className={`${primaryButtonClass} w-full`}>
            {loading ? "Please wait..." : "Sign in"}
          </button>
          <button type="button" onClick={() => void handleCreateAccount()} disabled={loading} className={`${secondaryButtonClass} w-full`}>
            Create account
          </button>
          {successMessage ? <p className={successTextClass}>{successMessage}</p> : null}
          {errorMessage ? <p className={errorTextClass}>{errorMessage}</p> : null}
        </form>
      </div>
    </main>
  );
}
