// Shared Tailwind class strings; colours come from theme tokens in globals.css.

export const pageClass = "min-h-screen bg-background px-4 py-6 sm:py-10";
export const containerClass = "mx-auto w-full max-w-6xl";
export const cardClass = "rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6";
export const panelClass = "rounded-xl border border-border bg-surface-muted p-4";
export const labelClass = "mb-1.5 block text-sm font-medium text-subtle";
export const inputClass =
  "h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary disabled:opacity-60";
export const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
export const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-lg border border-border-strong bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60";
export const dangerButtonClass =
  "inline-flex h-10 items-center justify-center rounded-lg border border-danger/40 bg-surface px-4 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60";
export const errorTextClass = "text-sm font-medium text-danger";
export const successTextClass = "text-sm font-medium text-success";
export const mutedTextClass = "text-sm text-muted";

// localStorage key for the light/dark preference (read by the layout script).
export const THEME_STORAGE_KEY = "fueltrack:theme";
