// Shared input validation for API routes and forms. Pure functions only.
// Inputs arrive in display units (km, litres, rupees) and are returned in
// stored integer units (see lib/units.ts).

import {
  amountFromVolume,
  kmToTenths,
  litresToMl,
  priceFromAmount,
  rupeesToPaise,
  volumeFromAmount,
} from "@/lib/units";

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export const PROFILE_NAME_MAX_LENGTH = 50;
export const VEHICLE_NAME_MAX_LENGTH = 40;
export const NOTE_MAX_LENGTH = 200;
export const VEHICLE_KINDS = ["Motorcycle", "Scooter", "Moped", "Other"] as const;
export const MAX_ODOMETER_KM = 9_999_999;
export const AMOUNT_TOLERANCE_PAISE = 100;
export const SERVICE_NAME_MAX_LENGTH = 40;
export const MAX_SERVICE_INTERVAL_KM = 100_000;
export const MAX_SERVICE_INTERVAL_MONTHS = 120;
export const MAX_SERVICE_COST_RUPEES = 1_000_000;
export const SERVICE_KINDS = ["MAINTENANCE", "REPAIR"] as const;
export const ISSUE_TITLE_MAX_LENGTH = 80;
const DAY_MS = 24 * 60 * 60 * 1000;

// Allow small clock differences between phone and server.
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Request bodies are untrusted: null for invalid JSON or non-objects.
export async function readJsonBody(request: Request) {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return Number.NaN;
  return typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
}

function isBlank(value: unknown) {
  return value === null || value === undefined || value === "";
}

function toTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value: unknown, now: Date): ValidationResult<Date> {
  if (isBlank(value)) return { ok: true, value: now };
  if (typeof value !== "string") return { ok: false, error: "Date is invalid" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { ok: false, error: "Date is invalid" };
  if (date.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) {
    return { ok: false, error: "Date cannot be in the future" };
  }
  return { ok: true, value: date };
}

function parseOdometer(value: unknown, label = "Odometer"): ValidationResult<number> {
  const km = toNumber(value);
  if (!Number.isFinite(km) || km < 0 || km > MAX_ODOMETER_KM) {
    return { ok: false, error: `${label} must be a reading between 0 and ${MAX_ODOMETER_KM.toLocaleString("en-IN")} km` };
  }
  return { ok: true, value: kmToTenths(km) };
}

function parseNote(value: unknown): ValidationResult<string | null> {
  const note = toTrimmedString(value);
  if (note.length > NOTE_MAX_LENGTH) {
    return { ok: false, error: `Note must be at most ${NOTE_MAX_LENGTH} characters` };
  }
  return { ok: true, value: note || null };
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function parseBase(source: Record<string, unknown>) {
  if (!isUuid(source.id)) return { ok: false as const, error: "Event id is invalid" };
  const vehicleId = toTrimmedString(source.vehicleId);
  if (!vehicleId) return { ok: false as const, error: "Select a vehicle" };
  return { ok: true as const, value: { id: source.id, vehicleId } };
}

// --- Profile and vehicle ----------------------------------------------------

export function parseProfileInput(body: Record<string, unknown> | null | undefined): ValidationResult<{ name: string }> {
  const name = toTrimmedString((body ?? {}).name).replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Name is required" };
  if (name.length > PROFILE_NAME_MAX_LENGTH) {
    return { ok: false, error: `Name must be at most ${PROFILE_NAME_MAX_LENGTH} characters` };
  }
  return { ok: true, value: { name } };
}

export const MAX_LOW_FUEL_KM = 500;

// Low-fuel reminder threshold: whole km from 1 to MAX_LOW_FUEL_KM, or null to turn reminders off.
export function parseLowFuelInput(body: Record<string, unknown> | null | undefined): ValidationResult<{ lowFuelKm: number | null }> {
  const value = (body ?? {}).lowFuelKm;
  if (value === null) return { ok: true, value: { lowFuelKm: null } };
  const km = toNumber(value);
  if (!Number.isInteger(km) || km < 1 || km > MAX_LOW_FUEL_KM) {
    return { ok: false, error: `Reminder distance must be a whole number from 1 to ${MAX_LOW_FUEL_KM} km` };
  }
  return { ok: true, value: { lowFuelKm: km } };
}

export type VehicleInput = {
  name: string;
  kind: string;
  startOdometer: number;
  tankCapacityMl: number | null;
  reserveMl: number | null;
};

export function parseVehicleInput(body: Record<string, unknown> | null | undefined): ValidationResult<VehicleInput> {
  const source = body ?? {};
  const name = toTrimmedString(source.name).replace(/\s+/g, " ");
  const kind = toTrimmedString(source.kind);

  if (!name) return { ok: false, error: "Vehicle name is required" };
  if (name.length > VEHICLE_NAME_MAX_LENGTH) {
    return { ok: false, error: `Vehicle name must be at most ${VEHICLE_NAME_MAX_LENGTH} characters` };
  }
  if (!(VEHICLE_KINDS as readonly string[]).includes(kind)) {
    return { ok: false, error: "Choose a vehicle type" };
  }

  const odometer = parseOdometer(source.startOdometerKm, "Current odometer");
  if (!odometer.ok) return odometer;

  let tankCapacityMl: number | null = null;
  if (!isBlank(source.tankCapacityL)) {
    const litres = toNumber(source.tankCapacityL);
    if (!Number.isFinite(litres) || litres < 1 || litres > 50) {
      return { ok: false, error: "Tank capacity must be between 1 and 50 litres" };
    }
    tankCapacityMl = litresToMl(litres);
  }

  let reserveMl: number | null = null;
  if (!isBlank(source.reserveL)) {
    const litres = toNumber(source.reserveL);
    if (!Number.isFinite(litres) || litres < 0.1 || litres > 10) {
      return { ok: false, error: "Reserve must be between 0.1 and 10 litres" };
    }
    reserveMl = litresToMl(litres);
    if (tankCapacityMl !== null && reserveMl >= tankCapacityMl) {
      return { ok: false, error: "Reserve must be less than the tank capacity" };
    }
  }

  return { ok: true, value: { name, kind, startOdometer: odometer.value, tankCapacityMl, reserveMl } };
}

// --- Events -----------------------------------------------------------------

export type FillInput = {
  id: string;
  vehicleId: string;
  occurredAt: Date;
  odometer: number;
  volumeMl: number;
  amountPaise: number;
  pricePaise: number;
  fullTank: boolean;
  note: string | null;
  reserveTrip: number | null; // tenths of km ridden since the open reserve mark
};

// A fill needs any two of amount, price per litre and litres; the third is
// calculated. When all three are given they must agree.
export function parseFillInput(
  body: Record<string, unknown> | null | undefined,
  now: Date = new Date()
): ValidationResult<FillInput> {
  const source = body ?? {};
  const base = parseBase(source);
  if (!base.ok) return base;

  const date = parseDate(source.occurredAt, now);
  if (!date.ok) return date;
  const odometer = parseOdometer(source.odometerKm);
  if (!odometer.ok) return odometer;
  const note = parseNote(source.note);
  if (!note.ok) return note;

  const hasAmount = !isBlank(source.amount);
  const hasPrice = !isBlank(source.price);
  const hasLitres = !isBlank(source.litres);
  const amount = toNumber(source.amount);
  const price = toNumber(source.price);
  const litres = toNumber(source.litres);

  if ([hasAmount, hasPrice, hasLitres].filter(Boolean).length < 2) {
    return { ok: false, error: "Enter at least two of amount, price per litre and litres" };
  }
  if (hasAmount && (!Number.isFinite(amount) || amount <= 0 || amount > 100_000)) {
    return { ok: false, error: "Amount must be greater than 0" };
  }
  if (hasPrice && (!Number.isFinite(price) || price <= 0 || price > 1_000)) {
    return { ok: false, error: "Price per litre must be greater than 0" };
  }
  if (hasLitres && (!Number.isFinite(litres) || litres <= 0 || litres > 100)) {
    return { ok: false, error: "Litres must be greater than 0" };
  }

  let amountPaise = hasAmount ? rupeesToPaise(amount) : 0;
  let pricePaise = hasPrice ? rupeesToPaise(price) : 0;
  let volumeMl = hasLitres ? litresToMl(litres) : 0;

  if (!hasLitres) {
    volumeMl = volumeFromAmount(amountPaise, pricePaise);
  } else if (!hasAmount) {
    amountPaise = amountFromVolume(volumeMl, pricePaise);
  } else if (!hasPrice) {
    pricePaise = priceFromAmount(amountPaise, volumeMl);
  } else if (Math.abs(amountFromVolume(volumeMl, pricePaise) - amountPaise) > AMOUNT_TOLERANCE_PAISE) {
    return { ok: false, error: "Amount, price and litres don't match. Check the pump receipt." };
  }

  if (volumeMl <= 0) return { ok: false, error: "Litres must be greater than 0" };

  let reserveTrip: number | null = null;
  if (!isBlank(source.reserveTripKm)) {
    const trip = toNumber(source.reserveTripKm);
    if (!Number.isFinite(trip) || trip < 0 || trip > 500) {
      return { ok: false, error: "Trip reading must be between 0 and 500 km" };
    }
    reserveTrip = kmToTenths(trip);
  }

  return {
    ok: true,
    value: {
      ...base.value,
      occurredAt: date.value,
      odometer: odometer.value,
      volumeMl,
      amountPaise,
      pricePaise,
      fullTank: source.fullTank === true,
      note: note.value,
      reserveTrip,
    },
  };
}

export type ReserveInput = {
  id: string;
  vehicleId: string;
  occurredAt: Date;
  odometer: number | null;
};

export function parseReserveInput(
  body: Record<string, unknown> | null | undefined,
  now: Date = new Date()
): ValidationResult<ReserveInput> {
  const source = body ?? {};
  const base = parseBase(source);
  if (!base.ok) return base;
  const date = parseDate(source.occurredAt, now);
  if (!date.ok) return date;

  let odometer: number | null = null;
  if (!isBlank(source.odometerKm)) {
    const parsed = parseOdometer(source.odometerKm);
    if (!parsed.ok) return parsed;
    odometer = parsed.value;
  }

  return { ok: true, value: { ...base.value, occurredAt: date.value, odometer } };
}

export type OdometerInput = { id: string; vehicleId: string; occurredAt: Date; odometer: number };

export function parseOdometerInput(
  body: Record<string, unknown> | null | undefined,
  now: Date = new Date()
): ValidationResult<OdometerInput> {
  const source = body ?? {};
  const base = parseBase(source);
  if (!base.ok) return base;
  const date = parseDate(source.occurredAt, now);
  if (!date.ok) return date;
  const odometer = parseOdometer(source.odometerKm);
  if (!odometer.ok) return odometer;
  return { ok: true, value: { ...base.value, occurredAt: date.value, odometer: odometer.value } };
}

// Readings must not go backwards in time: at least the latest earlier reading
// (or the vehicle's start odometer) and at most the earliest later reading.
// Equal readings are allowed (e.g. reserve mark and fill at the same spot).
export function checkOdometerOrder(params: {
  odometer: number;
  occurredAt: Date;
  startOdometer: number;
  otherEvents: Array<{ odometer: number | null; occurredAt: Date }>;
}): ValidationResult<null> {
  const at = params.occurredAt.getTime();
  let previous: number | null = null;
  let next: number | null = null;

  for (const event of params.otherEvents) {
    if (event.odometer === null) continue;
    const eventAt = event.occurredAt.getTime();
    if (eventAt <= at) {
      previous = previous === null ? event.odometer : Math.max(previous, event.odometer);
    } else {
      next = next === null ? event.odometer : Math.min(next, event.odometer);
    }
  }

  const km = (tenths: number) => (tenths / 10).toLocaleString("en-IN");

  if (params.odometer < params.startOdometer) {
    return { ok: false, error: `Odometer can't be below the vehicle's starting reading (${km(params.startOdometer)} km)` };
  }
  if (previous !== null && params.odometer < previous) {
    return { ok: false, error: `Odometer can't be less than the earlier reading (${km(previous)} km)` };
  }
  if (next !== null && params.odometer > next) {
    return { ok: false, error: `Odometer can't be more than the later reading (${km(next)} km)` };
  }
  return { ok: true, value: null };
}

// --- Documents ----------------------------------------------------------------

export const DOCUMENT_KINDS = ["Insurance", "PUC", "RC", "Licence", "Other"] as const;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// A calendar date "YYYY-MM-DD", stored as UTC midnight.
function parseDateOnly(value: unknown, error: string): ValidationResult<Date> {
  const text = toTrimmedString(value);
  const date = new Date(`${text}T00:00:00Z`);
  if (!DATE_ONLY_PATTERN.test(text) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    return { ok: false, error };
  }
  return { ok: true, value: date };
}

export type DocumentInput = {
  kind: string;
  vehicleId: string | null;
  expiresOn: Date; // UTC midnight of the expiry date
  note: string | null;
};

export function parseDocumentInput(body: Record<string, unknown> | null | undefined): ValidationResult<DocumentInput> {
  const source = body ?? {};
  const kind = toTrimmedString(source.kind);
  if (!(DOCUMENT_KINDS as readonly string[]).includes(kind)) return { ok: false, error: "Choose a document type" };

  const vehicleId = isBlank(source.vehicleId) ? null : source.vehicleId;
  if (vehicleId !== null && !isUuid(vehicleId)) return { ok: false, error: "Vehicle is invalid" };

  const expiresOn = parseDateOnly(source.expiresOn, "Enter a valid expiry date");
  if (!expiresOn.ok) return expiresOn;

  const note = parseNote(source.note);
  if (!note.ok) return note;
  return { ok: true, value: { kind, vehicleId, expiresOn: expiresOn.value, note: note.value } };
}

// --- Service log ----------------------------------------------------------------

function parseOptionalWhole(value: unknown, max: number, error: string): ValidationResult<number | null> {
  if (isBlank(value)) return { ok: true, value: null };
  const number = toNumber(value);
  if (!Number.isInteger(number) || number < 1 || number > max) return { ok: false, error };
  return { ok: true, value: number };
}

export type ServiceItemInput = {
  name: string;
  intervalKm: number | null;
  intervalMonths: number | null;
  baselineOdometer: number | null; // null = the vehicle's starting odometer
  baselineDate: Date | null; // null = today
};

export function parseServiceItemInput(body: Record<string, unknown> | null | undefined): ValidationResult<ServiceItemInput> {
  const source = body ?? {};
  const name = toTrimmedString(source.name).replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Name is required" };
  if (name.length > SERVICE_NAME_MAX_LENGTH) return { ok: false, error: `Name must be at most ${SERVICE_NAME_MAX_LENGTH} characters` };

  const intervalKm = parseOptionalWhole(source.intervalKm, MAX_SERVICE_INTERVAL_KM, `Every (km) must be a whole number up to ${MAX_SERVICE_INTERVAL_KM.toLocaleString("en-IN")}`);
  if (!intervalKm.ok) return intervalKm;
  const intervalMonths = parseOptionalWhole(source.intervalMonths, MAX_SERVICE_INTERVAL_MONTHS, `Every (months) must be a whole number up to ${MAX_SERVICE_INTERVAL_MONTHS}`);
  if (!intervalMonths.ok) return intervalMonths;
  if (intervalKm.value === null && intervalMonths.value === null) return { ok: false, error: "Set how often: every so many km, months, or both" };

  let baselineOdometer: number | null = null;
  if (!isBlank(source.lastDoneKm)) {
    const reading = parseOdometer(source.lastDoneKm, "Last done at");
    if (!reading.ok) return reading;
    baselineOdometer = reading.value;
  }
  let baselineDate: Date | null = null;
  if (!isBlank(source.lastDoneOn)) {
    const date = parseDateOnly(source.lastDoneOn, "Enter a valid last done date");
    if (!date.ok) return date;
    baselineDate = date.value;
  }

  return { ok: true, value: { name, intervalKm: intervalKm.value, intervalMonths: intervalMonths.value, baselineOdometer, baselineDate } };
}

export type ServiceRecordInput = {
  vehicleId: string;
  kind: (typeof SERVICE_KINDS)[number];
  occurredOn: Date;
  odometer: number;
  costPaise: number | null;
  itemIds: string[];
  issueIds: string[]; // open issues this visit fixed
  note: string | null;
};

const uniqueIds = (value: unknown) => (Array.isArray(value) ? [...new Set(value)] : []);

export function parseServiceRecordInput(
  body: Record<string, unknown> | null | undefined,
  now: Date = new Date()
): ValidationResult<ServiceRecordInput> {
  const source = body ?? {};
  if (!isUuid(source.vehicleId)) return { ok: false, error: "Vehicle is invalid" };
  const kind = SERVICE_KINDS.find((option) => option === source.kind);
  if (!kind) return { ok: false, error: "Choose maintenance or repair" };

  const occurredOn = parseDateOnly(source.occurredOn, "Enter a valid service date");
  if (!occurredOn.ok) return occurredOn;
  // Date-only: allow "today" in any time zone, nothing later.
  if (occurredOn.value.getTime() > now.getTime() + DAY_MS) return { ok: false, error: "Service date can't be in the future" };

  const odometer = parseOdometer(source.odometerKm, "Odometer");
  if (!odometer.ok) return odometer;

  let costPaise: number | null = null;
  if (!isBlank(source.costRupees)) {
    const cost = toNumber(source.costRupees);
    if (!Number.isFinite(cost) || cost < 0 || cost > MAX_SERVICE_COST_RUPEES) {
      return { ok: false, error: `Cost must be between 0 and ${MAX_SERVICE_COST_RUPEES.toLocaleString("en-IN")} rupees` };
    }
    costPaise = rupeesToPaise(cost);
  }

  const itemIds = uniqueIds(source.itemIds);
  const issueIds = uniqueIds(source.issueIds);
  if (!itemIds.every(isUuid)) return { ok: false, error: "Service item is invalid" };
  if (!issueIds.every(isUuid)) return { ok: false, error: "Issue is invalid" };

  const note = parseNote(source.note);
  if (!note.ok) return note;
  // Something must say what was done: a scheduled item, a fixed issue, or (for a repair) the note.
  if (itemIds.length === 0 && issueIds.length === 0 && !(kind === "REPAIR" && note.value)) {
    return { ok: false, error: kind === "REPAIR" ? "Pick the issue fixed or describe the repair" : "Tick at least one thing that was done" };
  }

  return {
    ok: true,
    value: { vehicleId: source.vehicleId, kind, occurredOn: occurredOn.value, odometer: odometer.value, costPaise, itemIds, issueIds, note: note.value },
  };
}

export function parseIssueInput(body: Record<string, unknown> | null | undefined, now: Date = new Date()): ValidationResult<{ title: string; notedOn: Date }> {
  const source = body ?? {};
  const title = toTrimmedString(source.title).replace(/\s+/g, " ");
  if (!title) return { ok: false, error: "Describe the problem" };
  if (title.length > ISSUE_TITLE_MAX_LENGTH) return { ok: false, error: `Keep it under ${ISSUE_TITLE_MAX_LENGTH} characters` };
  const notedOn = parseDateOnly(source.notedOn, "Enter a valid date");
  if (!notedOn.ok) return notedOn;
  if (notedOn.value.getTime() > now.getTime() + DAY_MS) return { ok: false, error: "Date can't be in the future" };
  return { ok: true, value: { title, notedOn: notedOn.value } };
}

// --- Expenses -------------------------------------------------------------------

export const EXPENSE_CATEGORIES = ["Parts", "Insurance", "Tax/RC", "Parking", "Toll", "Wash", "Accessories", "Fine", "Other"] as const;

export type ExpenseInput = { vehicleId: string; category: string; occurredOn: Date; amountPaise: number; note: string | null };

export function parseExpenseInput(body: Record<string, unknown> | null | undefined, now: Date = new Date()): ValidationResult<ExpenseInput> {
  const source = body ?? {};
  if (!isUuid(source.vehicleId)) return { ok: false, error: "Vehicle is invalid" };
  const category = toTrimmedString(source.category);
  if (!(EXPENSE_CATEGORIES as readonly string[]).includes(category)) return { ok: false, error: "Choose a category" };

  const occurredOn = parseDateOnly(source.occurredOn, "Enter a valid date");
  if (!occurredOn.ok) return occurredOn;
  if (occurredOn.value.getTime() > now.getTime() + DAY_MS) return { ok: false, error: "Date can't be in the future" };

  const amount = toNumber(source.amountRupees);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_SERVICE_COST_RUPEES) {
    return { ok: false, error: `Amount must be more than 0 and at most ${MAX_SERVICE_COST_RUPEES.toLocaleString("en-IN")} rupees` };
  }

  const note = parseNote(source.note);
  if (!note.ok) return note;
  return { ok: true, value: { vehicleId: source.vehicleId, category, occurredOn: occurredOn.value, amountPaise: rupeesToPaise(amount), note: note.value } };
}
