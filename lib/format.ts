// Display formatting shared across pages.

export const CURRENCY = "INR";
const LOCALE = "en-IN";

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | null | undefined) {
  return typeof value === "number" ? currencyFormatter.format(value) : "—";
}

export function formatNumber(value: number | null | undefined, decimals = 1) {
  return typeof value === "number"
    ? value.toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : "—";
}

export function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// "2026-02" -> "Feb 2026"
export function formatMonthKey(month: string, style: "short" | "long" = "short") {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthIndex - 1, 1)).toLocaleDateString(LOCALE, {
    month: style,
    year: "numeric",
    timeZone: "UTC",
  });
}

// Value for <input type="datetime-local"> in the browser's local time.
export function toDateTimeLocalValue(value: string | Date) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Local calendar day key, e.g. "2026-02-05".
export function toLocalDateKey(value: string | Date) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
