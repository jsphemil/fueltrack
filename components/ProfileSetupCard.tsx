"use client";

import { FormEvent, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { Profile } from "@/lib/types";
import { cardClass, errorTextClass, inputClass, mutedTextClass, primaryButtonClass } from "@/lib/ui";
import { parseProfileInput, PROFILE_NAME_MAX_LENGTH } from "@/lib/validation";

type ProfileSetupCardProps = {
  onSaved: (profile: Profile) => void;
};

// Shown once, until the user has saved a display name.
export default function ProfileSetupCard({ onSaved }: ProfileSetupCardProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseProfileInput({ name });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    setSaving(true);
    setError("");
    const result = await apiRequest<{ profile: Profile }>("/api/profile", {
      method: "POST",
      body: parsed.value,
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    window.dispatchEvent(new Event("profile-updated"));
    onSaved(result.data.profile);
  }

  return (
    <section className={cardClass}>
      <h2 className="text-lg font-semibold text-foreground">Welcome to FuelTrack</h2>
      <p className={`mt-1 ${mutedTextClass}`}>What should we call you? You can change this later in Account.</p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row" noValidate>
        <input
          type="text"
          value={name}
          maxLength={PROFILE_NAME_MAX_LENGTH}
          onChange={(event) => setName(event.target.value)}
          className={`${inputClass} sm:max-w-sm`}
          placeholder="Your name"
          autoComplete="name"
        />
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
      {error ? <p className={`mt-3 ${errorTextClass}`}>{error}</p> : null}
    </section>
  );
}
