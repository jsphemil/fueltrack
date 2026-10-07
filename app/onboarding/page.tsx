"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { FuelIcon, OdometerIcon, ReserveIcon } from "@/components/Icons";
import { Field, Page } from "@/components/ui";
import VehicleForm from "@/components/VehicleForm";
import { apiRequest } from "@/lib/api";
import { useFuel } from "@/lib/fuel-context";
import { cardClass, errorTextClass, inputClass, primaryButtonClass } from "@/lib/ui";
import { parseProfileInput, PROFILE_NAME_MAX_LENGTH } from "@/lib/validation";

type Step = "name" | "vehicle" | "habit";

const HABITS = [
  { icon: ReserveIcon, title: "Bike sputters? Switch to reserve", text: "Then reset your trip meter to 0 and tap On reserve when it's safe. One tap, no typing." },
  { icon: FuelIcon, title: "At the pump, add fuel", text: "Enter the odometer and what you paid. If you reset the trip meter, enter its reading too." },
  { icon: OdometerIcon, title: "FuelTrack learns your range", text: "After two reserve marks it shows how many km you have left before reserve." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { me, vehicles, refresh, setActiveVehicleId } = useFuel();
  const [step, setStep] = useState<Step>(me?.name ? "vehicle" : "name");
  const [name, setName] = useState(me?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseProfileInput({ name });
    if (!parsed.ok) return setError(parsed.error);
    setSaving(true);
    const result = await apiRequest("/api/me", { method: "PATCH", body: parsed.value });
    setSaving(false);
    if (!result.ok) return setError(result.error);
    setError("");
    setStep(vehicles.length > 0 ? "habit" : "vehicle");
  }

  return (
    <Page narrow>
      <div className="flex items-center gap-2 pb-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <FuelIcon size={20} />
        </span>
        <span className="text-lg font-bold text-foreground">FuelTrack</span>
        <span className="ml-auto text-sm text-muted">Step {step === "name" ? 1 : step === "vehicle" ? 2 : 3} of 3</span>
      </div>

      {step === "name" ? (
        <section className={cardClass}>
          <h1 className="text-2xl font-bold text-foreground">Welcome</h1>
          <p className="mt-1 text-sm text-muted">
            No fuel gauge? FuelTrack works out how far you can ride before reserve. What should we call you?
          </p>
          <form onSubmit={saveName} className="mt-5 space-y-4" noValidate>
            <Field label="Your name">
              <input value={name} maxLength={PROFILE_NAME_MAX_LENGTH} onChange={(event) => setName(event.target.value)} autoComplete="name" className={inputClass} placeholder="e.g. Asha" />
            </Field>
            {error ? <p className={errorTextClass}>{error}</p> : null}
            <button type="submit" disabled={saving} className={`${primaryButtonClass} w-full`}>
              {saving ? "Saving..." : "Continue"}
            </button>
          </form>
        </section>
      ) : null}

      {step === "vehicle" ? (
        <section className={cardClass}>
          <h1 className="text-2xl font-bold text-foreground">Your vehicle</h1>
          <p className="mt-1 mb-5 text-sm text-muted">Tell us where the odometer is and how much fuel is in the tank right now.</p>
          <VehicleForm
            submitLabel="Continue"
            onSaved={(vehicle) => {
              setActiveVehicleId(vehicle.id);
              void refresh();
              setStep("habit");
            }}
          />
        </section>
      ) : null}

      {step === "habit" ? (
        <section className={cardClass}>
          <h1 className="text-2xl font-bold text-foreground">How it works</h1>
          <ol className="mt-5 space-y-5">
            {HABITS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-reserve">
                  <Icon size={22} />
                </span>
                <span>
                  <span className="block font-semibold text-foreground">{title}</span>
                  <span className="block text-sm text-muted">{text}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-subtle">
            Tip: install FuelTrack on your home screen. Long-press its icon for an instant <strong>On reserve</strong> shortcut.
          </p>
          <button type="button" onClick={() => router.replace("/")} className={`${primaryButtonClass} mt-5 w-full`}>
            Start tracking
          </button>
        </section>
      ) : null}
    </Page>
  );
}
