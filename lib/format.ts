// Display formatting. Inputs are stored units (see lib/units.ts).

const LOCALE = "en-IN";

const money = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const moneyWhole = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function formatMoney(paise: number | null | undefined, whole = false) {
  if (typeof paise !== "number") return "—";
  return (whole ? moneyWhole : money).format(paise / 100);
}

export function formatNumber(value: number | null | undefined, decimals = 1) {
  if (typeof value !== "number") return "—";
  return value.toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Odometer / distance in tenths of km.
export function formatKm(tenths: number | null | undefined, decimals = 0) {
  return typeof tenths === "number" ? `${formatNumber(tenths / 10, decimals)} km` : "—";
}

export function formatLitres(ml: number | null | undefined, decimals = 2) {
  return typeof ml === "number" ? `${formatNumber(ml / 1000, decimals)} L` : "—";
}

export function formatKmPerL(value: number | null | undefined) {
  return typeof value === "number" ? `${formatNumber(value, 1)} km/l` : "—";
}

export function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(value: string | Date) {
  return new Date(value).toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(value: string | Date) {
  return `${formatDate(value)}, ${formatTime(value)}`;
}

export function formatRelative(value: string | Date, now: Date = new Date()) {
  const minutes = Math.round((now.getTime() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

// "2026-02" -> "Feb 2026"
export function formatMonth(month: string, style: "short" | "long" = "short") {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthIndex - 1, 1)).toLocaleDateString(LOCALE, { month: style, year: "numeric", timeZone: "UTC" });
}

// Value for <input type="datetime-local"> in local time.
export function toDateTimeLocalValue(value: string | Date) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Plain number for prefilling inputs (no grouping separators).
export function toInputNumber(value: number | null | undefined, divisor: number, decimals: number) {
  return typeof value === "number" ? String(Number((value / divisor).toFixed(decimals))) : "";
}

// "Oil change due in 80 km" / "Oil change overdue by 20 km".
export function formatServiceDue(dueKm: number) {
  return dueKm < 0 ? `Oil change overdue by ${formatNumber(-dueKm, 0)} km` : `Oil change due in ${formatNumber(dueKm, 0)} km`;
}
