"use client";

// Per-phone display and reminder preferences, kept in localStorage. Nothing here
// is business data: the server never needs it (reminders are shown by the app).

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "fueltrack:preferences";

// Days before a document expires at which to remind.
export const DOCUMENT_LEADS = {
  early: { label: "Early: 60 and 14 days before", days: [60, 14] },
  standard: { label: "Standard: 30 and 7 days before", days: [30, 7] },
  late: { label: "Late: 7 days before", days: [7] },
} as const;

export type DocumentLead = keyof typeof DOCUMENT_LEADS;

export type Preferences = {
  showLastFill: boolean;
  showReserveRange: boolean;
  showRecentMileage: boolean;
  showLifetime: boolean;
  documentLead: DocumentLead;
};

export const DEFAULT_PREFERENCES: Preferences = {
  showLastFill: true,
  showReserveRange: true,
  showRecentMileage: true,
  showLifetime: true,
  documentLead: "standard",
};

const listeners = new Set<() => void>();
let cache: Preferences | null = null;

// Unknown or badly typed values fall back to the defaults.
export function mergePreferences(stored: unknown): Preferences {
  const source = stored && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
  const flag = (key: "showLastFill" | "showReserveRange" | "showRecentMileage" | "showLifetime") =>
    typeof source[key] === "boolean" ? (source[key] as boolean) : DEFAULT_PREFERENCES[key];
  const lead = typeof source.documentLead === "string" && source.documentLead in DOCUMENT_LEADS ? (source.documentLead as DocumentLead) : DEFAULT_PREFERENCES.documentLead;
  return {
    showLastFill: flag("showLastFill"),
    showReserveRange: flag("showReserveRange"),
    showRecentMileage: flag("showRecentMileage"),
    showLifetime: flag("showLifetime"),
    documentLead: lead,
  };
}

function read(): Preferences {
  try {
    return mergePreferences(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null"));
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function getPreferences(): Preferences {
  cache ??= read();
  return cache;
}

export function setPreferences(patch: Partial<Preferences>) {
  cache = mergePreferences({ ...getPreferences(), ...patch });
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // The choice just won't survive a restart.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab or the installed app changed it.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePreferences() {
  return useSyncExternalStore(subscribe, getPreferences, () => DEFAULT_PREFERENCES);
}
