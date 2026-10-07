// Offline outbox: new entries are saved locally first and sent to the API when
// online. Each entry carries its own id, so a retry never creates a duplicate.

import { apiRequest } from "@/lib/api";

export type OutboxItem = {
  id: string;
  body: Record<string, unknown>;
  queuedAt: string;
  error?: string; // validation error from the server; needs the user's attention
};

const STORAGE_KEY = "fueltrack:outbox";
const listeners = new Set<() => void>();
let cache: OutboxItem[] | null = null;
let flushing: Promise<number> | null = null;

// crypto.randomUUID needs a secure context; fall back for http on a LAN.
export function newId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function read(): OutboxItem[] {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    cache = Array.isArray(parsed) ? (parsed as OutboxItem[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: OutboxItem[]) {
  cache = items;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage unavailable: items live in memory until the page closes.
  }
  listeners.forEach((listener) => listener());
}

export function getOutbox() {
  return read();
}

const emptyOutbox: OutboxItem[] = [];
export function getServerOutbox() {
  return emptyOutbox;
}

export function subscribeOutbox(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function queueEvent(body: Record<string, unknown> & { id: string }) {
  write([...read(), { id: body.id, body, queuedAt: new Date().toISOString() }]);
}

export function updateQueued(id: string, patch: Record<string, unknown>) {
  const items = read();
  if (!items.some((item) => item.id === id)) return false;
  write(items.map((item) => (item.id === id ? { ...item, body: { ...item.body, ...patch }, error: undefined } : item)));
  return true;
}

export function removeQueued(id: string) {
  const items = read();
  if (!items.some((item) => item.id === id)) return false;
  write(items.filter((item) => item.id !== id));
  return true;
}

// Sends queued entries in order. Stops at the first network or server error
// (to retry later); entries the server rejects are kept with the error shown.
// Returns how many entries were saved.
export function flushOutbox(): Promise<number> {
  if (flushing) return flushing;

  flushing = (async () => {
    let saved = 0;
    for (const item of read().filter((entry) => !entry.error)) {
      const result = await apiRequest("/api/events", { method: "POST", body: item.body });
      if (result.ok) {
        write(read().filter((entry) => entry.id !== item.id));
        saved += 1;
      } else if (result.status === 0 || result.status === 401 || result.status >= 500) {
        break;
      } else {
        write(read().map((entry) => (entry.id === item.id ? { ...entry, error: result.error } : entry)));
      }
    }
    return saved;
  })().finally(() => {
    flushing = null;
  });

  return flushing;
}
