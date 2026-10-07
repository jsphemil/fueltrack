"use client";

import { useEffect } from "react";

// Pages where a reload could lose a half-typed entry.
const FORM_PATHS = ["/fill", "/quick/reserve"];
const RELOADED_KEY = "fueltrack:reloadedFor";

// The installed app can stay open in the background for days. When it comes
// back, reload once if a newer build has been deployed since it loaded.
async function reloadIfStale() {
  if (document.visibilityState !== "visible" || FORM_PATHS.includes(window.location.pathname)) return;
  const response = await fetch("/api/version", { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return;
  const { buildId } = (await response.json()) as { buildId?: string };
  if (!buildId || buildId === process.env.NEXT_PUBLIC_BUILD_ID) return;
  try {
    // Never loop if the new build somehow doesn't arrive.
    if (window.sessionStorage.getItem(RELOADED_KEY) === buildId) return;
    window.sessionStorage.setItem(RELOADED_KEY, buildId);
  } catch {
    return;
  }
  window.location.reload();
}

// Registers public/sw.js in production builds (dev servers rebuild constantly).
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is optional; the app works without it.
      });
    }

    const check = () => void reloadIfStale().catch(() => {});
    check();
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, []);
  return null;
}
