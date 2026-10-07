// Shared Tailwind class strings; colours come from theme tokens in globals.css.

// Minimal cards: a hairline edge and a soft, low shadow.
export const cardClass =
  "rounded-3xl border border-border/70 bg-surface p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_12px_32px_-16px_rgba(28,25,23,0.12)]";
export const sectionTitleClass = "text-sm font-semibold uppercase tracking-wide text-muted";
export const labelClass = "mb-1.5 block text-sm font-medium text-subtle";
export const hintClass = "mt-1 block text-xs text-muted";
export const inputClass =
  "h-12 w-full rounded-2xl border border-border-strong bg-surface px-4 text-base text-foreground outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
export const primaryButtonClass = `${buttonBase} h-12 bg-primary px-5 text-primary-foreground hover:opacity-90`;
export const secondaryButtonClass = `${buttonBase} h-12 border border-border-strong bg-surface px-5 text-foreground hover:bg-surface-muted`;
export const reserveButtonClass = `${buttonBase} h-14 bg-reserve px-5 text-reserve-foreground hover:opacity-90`;
export const dangerButtonClass = `${buttonBase} h-12 border border-danger/40 bg-surface px-5 text-danger hover:bg-danger/10`;
export const smallButtonClass = "h-9! rounded-xl! px-3! text-sm!";
export const chipClass = "inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition";

export const errorTextClass = "text-sm font-medium text-danger";
export const successTextClass = "text-sm font-medium text-good";
export const mutedTextClass = "text-sm text-muted";

// localStorage key for the light/dark preference (read by the layout script).
export const THEME_STORAGE_KEY = "fueltrack:theme";
