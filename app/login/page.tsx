"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const trimmedEmail = email.trim();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (!signInError) {
      router.push("/");
      setLoading(false);
      return;
    }

    const signInMessage = signInError.message.toLowerCase();
    if (
      signInMessage.includes("user not found") ||
      signInMessage.includes("invalid login credentials")
    ) {
      const { error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });

      if (!signUpError) {
        setSuccessMessage("Account created, you can now login");
        setLoading(false);
        return;
      }

      const signUpMessage = signUpError.message.toLowerCase();
      if (
        signUpMessage.includes("already") ||
        signUpMessage.includes("registered") ||
        signUpMessage.includes("exists")
      ) {
        setErrorMessage("Wrong password");
        setLoading(false);
        return;
      }

      setErrorMessage("User not found");
      setLoading(false);
      return;
    }

    setErrorMessage("Wrong password");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <section className="mx-auto w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">FuelTrack Login</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Enter your email and password to sign in.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-lg bg-zinc-900 px-4 text-base font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Please wait..." : "Sign In"}
          </button>
        </form>

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
