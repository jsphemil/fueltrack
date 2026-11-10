"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { FuelIcon } from "@/components/Icons";
import { Field } from "@/components/ui";
import { useSession } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { errorTextClass, inputClass, primaryButtonClass } from "@/lib/ui";

const MIN_PASSWORD_LENGTH = 6;

// The emailed reset link signs the user in (Supabase reads the token from the URL),
// then this page sets the new password.
export default function ResetPasswordPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (password.length < MIN_PASSWORD_LENGTH) return setErrorMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (password !== confirm) return setErrorMessage("The two passwords don't match.");

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return setErrorMessage(error.message);
    router.replace("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <FuelIcon size={28} />
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Set a new password</h1>
        </div>

        {loading ? (
          <p className="text-center text-sm text-muted">Checking your reset link...</p>
        ) : !session ? (
          <div className="space-y-4 rounded-3xl border border-border bg-surface p-6 text-center shadow-sm">
            <p className="text-sm text-muted">This reset link is invalid or has expired. Request a new one from the sign-in screen.</p>
            <Link href="/login" className="text-sm font-semibold text-foreground underline">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-sm" noValidate>
            <Field label="New password">
              <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className={inputClass} />
            </Field>
            <Field label="Confirm new password">
              <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
            </Field>
            <button type="submit" disabled={saving} className={`${primaryButtonClass} w-full`}>
              {saving ? "Saving..." : "Save password"}
            </button>
            {errorMessage ? <p className={errorTextClass}>{errorMessage}</p> : null}
          </form>
        )}
      </div>
    </main>
  );
}
