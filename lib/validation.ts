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
