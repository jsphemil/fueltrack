"use client";

import { useEffect, useState } from "react";

import PageShell from "@/components/PageShell";
import VehicleForm from "@/components/VehicleForm";
import { apiRequest } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { useSession, useVehicles } from "@/lib/hooks";
import type { Profile, VehicleWithStats } from "@/lib/types";
import {
  cardClass,
  dangerButtonClass,
  errorTextClass,
  inputClass,
  mutedTextClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";
import { parseProfileInput, PROFILE_NAME_MAX_LENGTH } from "@/lib/validation";

const smallButton = "h-8! px-3! text-xs!";

export default function AccountPage() {
  const { session, loading: sessionLoading, userId } = useSession();
  const { vehicles, loading: vehiclesLoading, error: vehiclesError, reload } = useVehicles(userId);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [editVehicleId, setEditVehicleId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [vehicleActionError, setVehicleActionError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isMounted = true;
    void apiRequest<{ profile: Profile | null }>("/api/profile").then((result) => {
      if (!isMounted) {
        return;
      }
      if (result.ok) {
        setProfile(result.data.profile);
      } else {
        setProfileError(result.error);
      }
      setProfileLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  function startProfileEdit() {
    setEditingProfile(true);
    setProfileNameInput(profile?.name ?? "");
    setProfileError("");
  }

  async function handleSaveProfile() {
    const parsed = parseProfileInput({ name: profileNameInput });
    if (!parsed.ok) {
      setProfileError(parsed.error);
      return;
    }

    setProfileSaving(true);
    setProfileError("");
    const result = await apiRequest<{ profile: Profile }>("/api/profile", {
      method: "POST",
      body: parsed.value,
    });
    setProfileSaving(false);

    if (!result.ok) {
      setProfileError(result.error);
      return;
    }

    setProfile(result.data.profile);
    setEditingProfile(false);
    window.dispatchEvent(new Event("profile-updated"));
  }

  async function handleDeleteVehicle(vehicle: VehicleWithStats) {
    const confirmed = window.confirm(
      `Delete "${vehicle.name}"? This also deletes all of its fuel entries.`
    );
    if (!confirmed) {
      return;
    }

    setDeleteLoadingId(vehicle.id);
    setVehicleActionError("");
    const result = await apiRequest(`/api/vehicle?id=${encodeURIComponent(vehicle.id)}`, {
      method: "DELETE",
    });
    setDeleteLoadingId(null);

    if (!result.ok) {
      setVehicleActionError(result.error);
      return;
    }

    await reload();
  }

  async function handleResetAccount() {
    const confirmed = window.confirm(
      "Reset your account? This permanently deletes your profile, all vehicles and all fuel entries."
    );
    if (!confirmed) {
      return;
    }

    setResetLoading(true);
    setResetError("");
    const result = await apiRequest("/api/account/reset", { method: "POST" });
    setResetLoading(false);

    if (!result.ok) {
      setResetError(result.error);
      return;
    }

    setProfile(null);
    window.dispatchEvent(new Event("profile-updated"));
    await reload();
  }

  return (
    <PageShell title="Account" loading={sessionLoading || !userId}>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-foreground">Profile</h2>
          <p className={`mt-2 ${mutedTextClass}`}>
            Email: <span className="font-medium text-foreground">{session?.user.email}</span>
          </p>

          {profileLoading ? (
            <p className={`mt-3 ${mutedTextClass}`}>Loading profile...</p>
          ) : editingProfile ? (
            <form
              className="mt-3 space-y-3"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void handleSaveProfile();
              }}
            >
              <input
                type="text"
                value={profileNameInput}
                maxLength={PROFILE_NAME_MAX_LENGTH}
                onChange={(event) => setProfileNameInput(event.target.value)}
                className={inputClass}
                placeholder="Your name"
                autoComplete="name"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={profileSaving} className={primaryButtonClass}>
                  {profileSaving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  disabled={profileSaving}
                  className={secondaryButtonClass}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className={mutedTextClass}>
                Name: <span className="font-medium text-foreground">{profile?.name ?? "Not set"}</span>
              </p>
              <button type="button" onClick={startProfileEdit} className={`${secondaryButtonClass} ${smallButton}`}>
                Edit
              </button>
            </div>
          )}
          {profileError ? <p className={`mt-2 ${errorTextClass}`}>{profileError}</p> : null}
        </section>

        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-foreground">Danger zone</h2>
          <p className={`mt-2 ${mutedTextClass}`}>
            Delete your profile, vehicles and fuel entries. Your login stays active.
          </p>
          <button
            type="button"
            onClick={() => void handleResetAccount()}
            disabled={resetLoading}
            className={`mt-4 ${dangerButtonClass}`}
          >
            {resetLoading ? "Resetting..." : "Reset account"}
          </button>
          {resetError ? <p className={`mt-2 ${errorTextClass}`}>{resetError}</p> : null}
        </section>

        <section className={`${cardClass} lg:col-span-2`}>
          <h2 className="text-lg font-semibold text-foreground">Vehicles</h2>
          {vehiclesError ? <p className={`mt-2 ${errorTextClass}`}>{vehiclesError}</p> : null}
          {vehicleActionError ? <p className={`mt-2 ${errorTextClass}`}>{vehicleActionError}</p> : null}

          {vehiclesLoading && vehicles.length === 0 ? (
            <p className={`mt-2 ${mutedTextClass}`}>Loading vehicles...</p>
          ) : vehicles.length === 0 ? (
            <p className={`mt-2 ${mutedTextClass}`}>No vehicles added yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {vehicles.map((vehicle) => (
                <li key={vehicle.id} className="py-3">
                  {editVehicleId === vehicle.id ? (
                    <VehicleForm
                      vehicle={vehicle}
                      onSaved={() => {
                        setEditVehicleId(null);
                        void reload();
                      }}
                      onCancel={() => setEditVehicleId(null)}
                    />
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {vehicle.name} <span className="font-normal text-muted">· {vehicle.vehicleType}</span>
                        </p>
                        <p className="text-xs text-muted">
                          Initial odometer {formatNumber(vehicle.initial_odometer, 0)} km · {vehicle.entryCount} fills
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditVehicleId(vehicle.id)}
                          disabled={deleteLoadingId !== null}
                          className={`${secondaryButtonClass} ${smallButton}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteVehicle(vehicle)}
                          disabled={deleteLoadingId !== null}
                          className={`${dangerButtonClass} ${smallButton}`}
                        >
                          {deleteLoadingId === vehicle.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div id="add-vehicle" className="mt-6 scroll-mt-6 border-t border-border pt-6">
            <h3 className="text-base font-semibold text-foreground">Add vehicle</h3>
            <div className="mt-3">
              <VehicleForm onSaved={() => void reload()} />
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
