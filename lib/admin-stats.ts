// Pure helpers for the admin page (no database), so they can be unit-tested.

const DAY_MS = 24 * 60 * 60 * 1000;
export const ERROR_MESSAGE_MAX = 500;
export const ERROR_KEEP_DAYS = 30;

// One line, emails masked, at most ERROR_MESSAGE_MAX characters: error text can echo
// what a user typed, and the log must not become a store of personal data.
export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const clean = raw.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]").replace(/\s+/g, " ").trim();
  return clean.length > ERROR_MESSAGE_MAX ? `${clean.slice(0, ERROR_MESSAGE_MAX - 1)}…` : clean;
}

// Sign-ups per week for the last `weeks` weeks, oldest first. Week 0 ends now.
export function signupsByWeek(dates: Date[], now: Date, weeks = 8): { weekStart: string; count: number }[] {
  const buckets = Array.from({ length: weeks }, (_, index) => ({
    weekStart: new Date(now.getTime() - (weeks - index) * 7 * DAY_MS).toISOString().slice(0, 10),
    count: 0,
  }));
  for (const date of dates) {
    const weeksAgo = Math.floor((now.getTime() - date.getTime()) / (7 * DAY_MS));
    if (weeksAgo >= 0 && weeksAgo < weeks) buckets[weeks - 1 - weeksAgo].count += 1;
  }
  return buckets;
}

// How many of the given last-activity times fall within the last `days` days.
export function activeWithin(lastActivity: (Date | null)[], now: Date, days: number) {
  return lastActivity.filter((date) => date !== null && now.getTime() - date.getTime() <= days * DAY_MS).length;
}
