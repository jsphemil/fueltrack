"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ThemeSelect } from "@/components/ThemeToggle";
import { Field, Notice, Page, PageHeader } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { clearFuelCache, useFuel } from "@/lib/fuel-context";
import { DOCUMENT_LEADS, isDefaultPreferences, type DocumentLead, type Preferences } from "@/lib/preferences";
import { supabase } from "@/lib/supabase";
import { cardClass, dangerButtonClass, inputClass, mutedTextClass, primaryButtonClass, secondaryButtonClass, successTextClass } from "@/lib/ui";
import { MAX_LOW_FUEL_KM, parseLowFuelInput, parseProfileInput, PROFILE_NAME_MAX_LENGTH } from "@/lib/validation";

const HOME_TILES: Array<{ key: keyof Preferences & `show${string}`; label: string }> = [
  { key: "showLastFill", label: "Last fill" },
  { key: "showReserveRange", label: "Range on reserve" },
  { key: "showRecentMileage", label: "Recent mileage" },
  { key: "showLifetime", label: "Lifetime mileage" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { me, refresh, preferences, savePreferences } = useFuel();
  const [name, setName] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const nameValue = name ?? me?.name ?? "";
  const [lowFuel, setLowFuel] = useState<string | null>(null);
  const [reminderMessage, setReminderMessage] = useState("");
  const lowFuelValue = lowFuel ?? (me?.lowFuelKm != null ? String(me.lowFuelKm) : "30");

  async function saveReminder(lowFuelKm: string | null) {
    const parsed = parseLowFuelInput({ lowFuelKm });
    if (!parsed.ok) return setError(parsed.error);
    if (parsed.value.lowFuelKm !== null) {
      if (!("Notification" in window)) return setError("This browser can't show notifications.");
      if ((await Notification.requestPermission()) !== "granted") {
        return setError("Notifications are blocked. Allow them for FuelTrack in your phone or browser settings.");
      }
    }
    const result = await apiRequest("/api/me", { method: "PATCH", body: parsed.value });
    if (!result.ok) return setError(result.error);
    setError("");
    setLowFuel(null);
    setReminderMessage(parsed.value.lowFuelKm === null ? "Reminder turned off." : "Reminder saved.");
    await refresh();
  }

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseProfileInput({ name: nameValue });
    if (!parsed.ok) return setError(parsed.error);
    const result = await apiRequest("/api/me", { method: "PATCH", body: parsed.value });
    if (!result.ok) return setError(result.error);
    setError("");
    setMessage("Name saved.");
    await refresh();
  }

  async function changePreferences(patch: Partial<Preferences> | null) {
    setError(await savePreferences(patch));
  }

  async function exportCsv() {
    setError("");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return setError("Please sign in again.");
    const response = await fetch("/api/export", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    if (!response?.ok) return setError("Couldn't export. Check your connection.");
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = `fueltrack-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAll() {
    const typed = window.prompt('This permanently deletes your vehicles and every entry. Type DELETE to confirm.');
    if (typed !== "DELETE") return;
    setBusy(true);
    const result = await apiRequest("/api/me", { method: "DELETE" });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    clearFuelCache();
    await refresh();
    router.replace("/onboarding");
  }

  async function signOut() {
    clearFuelCache();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <Page narrow>
      <PageHeader title="Settings" subtitle={me?.email ?? undefined} />
      {error ? <Notice tone="danger">{error}</Notice> : null}

      <section className={cardClass}>
        <h2 className="font-semibold text-foreground">Profile</h2>
        <form onSubmit={saveName} className="mt-4 flex gap-2" noValidate>
          <div className="flex-1">
            <Field label="Name">
              <input value={nameValue} maxLength={PROFILE_NAME_MAX_LENGTH} onChange={(event) => { setName(event.target.value); setMessage(""); }} className={inputClass} autoComplete="name" />
            </Field>
          </div>
          <button type="submit" className={`${primaryButtonClass} self-end`}>Save</button>
        </form>
        {message ? <p className={`mt-2 ${successTextClass}`}>{message}</p> : null}
      </section>

      <section className={cardClass}>
        <h2 className="font-semibold text-foreground">Low-fuel reminder</h2>
        <p className={`mt-2 ${mutedTextClass}`}>
          {me?.lowFuelKm != null ? `On: notifies when about ${me.lowFuelKm} km are left to reserve.` : "Off."} Checked when you open the app, once per tank on this phone. Allowing notifications here also turns on oil change reminders.
        </p>
        <form onSubmit={(event) => { event.preventDefault(); void saveReminder(lowFuelValue); }} className="mt-4 flex gap-2" noValidate>
          <div className="flex-1">
            <Field label="Remind me at (km to reserve)">
              <input value={lowFuelValue} inputMode="numeric" min={1} max={MAX_LOW_FUEL_KM} onChange={(event) => { setLowFuel(event.target.value); setReminderMessage(""); }} className={inputClass} />
            </Field>
          </div>
          <button type="submit" className={`${primaryButtonClass} self-end`}>{me?.lowFuelKm != null ? "Save" : "Turn on"}</button>
          {me?.lowFuelKm != null ? (
            <button type="button" onClick={() => void saveReminder(null)} className={`${secondaryButtonClass} self-end`}>Turn off</button>
          ) : null}
        </form>
        {reminderMessage ? <p className={`mt-2 ${successTextClass}`}>{reminderMessage}</p> : null}
      </section>

      <section className={cardClass}>
        <h2 className="font-semibold text-foreground">Home and reminders</h2>
        <p className={`mt-2 ${mutedTextClass}`}>Saved to your account, so it follows you to other devices.</p>
        <fieldset className="mt-4">
          <legend className="mb-2 block text-sm font-medium text-subtle">Show on Home</legend>
          <div className="space-y-3">
            {HOME_TILES.map((tile) => (
              <label key={tile.key} className="flex cursor-pointer items-center gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={preferences[tile.key]}
                  onChange={(event) => void changePreferences({ [tile.key]: event.target.checked })}
                  className="h-5 w-5 accent-current"
                />
                {tile.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-5">
          <Field label="Remind me about documents">
            <select value={preferences.documentLead} onChange={(event) => void changePreferences({ documentLead: event.target.value as DocumentLead })} className={inputClass}>
              {(Object.keys(DOCUMENT_LEADS) as DocumentLead[]).map((key) => (
                <option key={key} value={key}>{DOCUMENT_LEADS[key].label}</option>
              ))}
            </select>
          </Field>
        </div>
        <button
          type="button"
          disabled={isDefaultPreferences(preferences)}
          onClick={() => void changePreferences(null)}
          className={`${secondaryButtonClass} mt-5`}
        >
          Reset to defaults
        </button>
      </section>

      <section className={cardClass}>
        <h2 className="font-semibold text-foreground">Guide</h2>
        <p className={`mt-2 ${mutedTextClass}`}>How the estimates work and how to keep them accurate.</p>
        <Link href="/guide" className={`${secondaryButtonClass} mt-4`}>Read the guide</Link>
      </section>

      <section className={cardClass}>
        <h2 className="font-semibold text-foreground">Appearance</h2>
        <div className="mt-4"><ThemeSelect /></div>
      </section>

      <section className={cardClass}>
        <h2 className="font-semibold text-foreground">Install on your phone</h2>
        <p className={`mt-2 ${mutedTextClass}`}>
          In Chrome, open the menu and choose <strong>Add to Home screen</strong> (Safari: Share → Add to Home Screen).
          Then long-press the FuelTrack icon for the <strong>On reserve</strong> shortcut.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className="font-semibold text-foreground">Your data</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => void exportCsv()} className={secondaryButtonClass}>Export CSV</button>
          <button type="button" onClick={() => void signOut()} className={secondaryButtonClass}>Sign out</button>
        </div>
        <div className="mt-6 border-t border-border pt-5">
          <p className={mutedTextClass}>Delete all vehicles and entries. Your login stays.</p>
          <button type="button" disabled={busy} onClick={() => void deleteAll()} className={`${dangerButtonClass} mt-3`}>
            {busy ? "Deleting..." : "Delete all data"}
          </button>
        </div>
      </section>
    </Page>
  );
}
