"use client";

import { useSyncExternalStore } from "react";

import { THEME_STORAGE_KEY } from "@/lib/ui";

type Theme = "light" | "dark";
type Preference = Theme | "system";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
  };
}

function getPreference(): Preference {
  const explicit = document.documentElement.dataset.theme;
  return explicit === "light" || explicit === "dark" ? explicit : "system";
}

function getTheme(): Theme {
  const preference = getPreference();
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setPreference(preference: Preference) {
  try {
    if (preference === "system") {
      delete document.documentElement.dataset.theme;
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      document.documentElement.dataset.theme = preference;
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {
    // Preference just won't persist.
  }
  listeners.forEach((listener) => listener());
}

// Compact light/dark switch for the sidebar.
export default function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, getTheme, () => null);
  if (!theme) return null;
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      className="rounded-lg px-2 py-1 text-sm font-medium text-muted transition hover:text-foreground"
      aria-label={`Switch to ${next} theme`}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}

// Light / Dark / System choice for Settings.
export function ThemeSelect() {
  const preference = useSyncExternalStore<Preference | null>(subscribe, getPreference, () => null);
  if (!preference) return null;

  return (
    <div className="inline-flex rounded-2xl border border-border-strong bg-surface-muted p-1" role="radiogroup" aria-label="Theme">
      {(["light", "dark", "system"] as const).map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={preference === option}
          onClick={() => setPreference(option)}
          className={`h-9 rounded-xl px-4 text-sm font-medium capitalize transition ${
            preference === option ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
