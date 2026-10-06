// Shared input validation for API routes and forms. Pure functions only.

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export const PROFILE_NAME_MAX_LENGTH = 50;
export const VEHICLE_NAME_MAX_LENGTH = 60;
export const VEHICLE_TYPE_MAX_LENGTH = 30;

// Allow small clock differences between browser and server.
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

// Request bodies are untrusted: return null for invalid JSON or non-objects.
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

export function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return Number.NaN;
  }

  return Number(value);
}

function toTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export type FuelEntryInput = {
  vehicleId: string;
  odometer: number;
  fuel_price: number;
  amount_paid: number;
  fuel_volume: number;
  is_reserve: boolean;
  filled_at: Date;
};

export function calculateFuelVolume(amountPaid: number, fuelPrice: number) {
  if (!Number.isFinite(amountPaid) || !Number.isFinite(fuelPrice) || fuelPrice <= 0 || amountPaid <= 0) {
    return 0;
  }

  return roundTo(amountPaid / fuelPrice, 3);
}

export function parseFuelEntryInput(
  body: Record<string, unknown> | null | undefined,
  now: Date = new Date()
): ValidationResult<FuelEntryInput> {
  const source = body ?? {};
  const vehicleId = toTrimmedString(source.vehicleId);
  const odometer = toNumber(source.odometer);
  const fuelPrice = toNumber(source.fuel_price);
  const amountPaid = toNumber(source.amount_paid);
  const filledAtRaw = source.filled_at;

  if (!vehicleId) {
    return { ok: false, error: "Select a vehicle" };
  }

  if (!Number.isFinite(odometer) || odometer < 0) {
    return { ok: false, error: "Odometer must be a non-negative number" };
  }

  if (!Number.isFinite(fuelPrice) || fuelPrice <= 0) {
    return { ok: false, error: "Fuel price must be greater than 0" };
  }

  if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
    return { ok: false, error: "Amount paid must be greater than 0" };
  }

  if (filledAtRaw !== undefined && filledAtRaw !== null && typeof filledAtRaw !== "string") {
    return { ok: false, error: "Fill date is invalid" };
  }

  const filledAt = filledAtRaw ? new Date(filledAtRaw) : now;
  if (Number.isNaN(filledAt.getTime())) {
    return { ok: false, error: "Fill date is invalid" };
  }

  if (filledAt.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) {
    return { ok: false, error: "Fill date cannot be in the future" };
  }

  const roundedPrice = roundTo(fuelPrice, 2);
  const roundedAmount = roundTo(amountPaid, 2);

  return {
    ok: true,
    value: {
      vehicleId,
      odometer: roundTo(odometer, 1),
      fuel_price: roundedPrice,
      amount_paid: roundedAmount,
      fuel_volume: calculateFuelVolume(roundedAmount, roundedPrice),
      is_reserve: source.is_reserve === true,
      filled_at: filledAt,
    },
  };
}

export type VehicleInput = {
  name: string;
  vehicleType: string;
  initial_odometer: number;
};

export function parseVehicleInput(
  body: Record<string, unknown> | null | undefined
): ValidationResult<VehicleInput> {
  const source = body ?? {};
  const name = toTrimmedString(source.name);
  const vehicleType = toTrimmedString(source.vehicleType ?? source.type);
  const initialOdometer = toNumber(source.initial_odometer);

  if (!name) {
    return { ok: false, error: "Vehicle name is required" };
  }

  if (name.length > VEHICLE_NAME_MAX_LENGTH) {
    return { ok: false, error: `Vehicle name must be at most ${VEHICLE_NAME_MAX_LENGTH} characters` };
  }

  if (!vehicleType) {
    return { ok: false, error: "Vehicle type is required" };
  }

  if (vehicleType.length > VEHICLE_TYPE_MAX_LENGTH) {
    return { ok: false, error: `Vehicle type must be at most ${VEHICLE_TYPE_MAX_LENGTH} characters` };
  }

  if (!Number.isFinite(initialOdometer) || initialOdometer < 0) {
    return { ok: false, error: "Initial odometer must be a non-negative number" };
  }

  return {
    ok: true,
    value: { name, vehicleType, initial_odometer: roundTo(initialOdometer, 1) },
  };
}

export function parseProfileInput(
  body: Record<string, unknown> | null | undefined
): ValidationResult<{ name: string }> {
  const name = toTrimmedString((body ?? {}).name).replace(/\s+/g, " ");

  if (!name) {
    return { ok: false, error: "Name is required" };
  }

  if (name.length > PROFILE_NAME_MAX_LENGTH) {
    return { ok: false, error: `Name must be at most ${PROFILE_NAME_MAX_LENGTH} characters` };
  }

  return { ok: true, value: { name } };
}

// Odometer readings must increase with fill date: greater than the reading
// just before this fill (or the vehicle's initial reading) and less than the
// reading just after it.
export function checkOdometerOrder(params: {
  odometer: number;
  filledAt: Date;
  initialOdometer: number;
  otherEntries: Array<{ odometer: number; filled_at: Date }>;
}): ValidationResult<null> {
  const time = params.filledAt.getTime();
  let previous: { odometer: number; filled_at: Date } | null = null;
  let next: { odometer: number; filled_at: Date } | null = null;

  for (const entry of params.otherEntries) {
    const entryTime = entry.filled_at.getTime();

    if (entryTime <= time) {
      if (!previous || entryTime > previous.filled_at.getTime() ||
        (entryTime === previous.filled_at.getTime() && entry.odometer > previous.odometer)) {
        previous = entry;
      }
    } else if (!next || entryTime < next.filled_at.getTime()) {
      next = entry;
    }
  }

  if (!previous && params.odometer <= params.initialOdometer) {
    return {
      ok: false,
      error: `Odometer must be greater than the vehicle's initial reading (${params.initialOdometer})`,
    };
  }

  if (previous && params.odometer <= previous.odometer) {
    return {
      ok: false,
      error: `Odometer must be greater than the previous reading (${previous.odometer})`,
    };
  }

  if (next && params.odometer >= next.odometer) {
    return {
      ok: false,
      error: `Odometer must be less than the next reading (${next.odometer})`,
    };
  }

  return { ok: true, value: null };
}
