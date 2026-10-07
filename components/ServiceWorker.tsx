"use client";

import { useEffect } from "react";

// Registers public/sw.js in production builds (dev servers rebuild constantly).
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is optional; the app works without it.
    });
  }, []);
  return null;
}
