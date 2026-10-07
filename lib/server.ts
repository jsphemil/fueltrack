// Server-only helpers shared by API routes.
import type { Event, EventKind, Prisma, Vehicle } from "@prisma/client";

import { getUserFromRequest, type AuthenticatedUser } from "@/lib/auth";
import {
  calculateCycles,
  calculateGauge,
  resolveReserveOdometer,
  sortEvents,
  type EngineVehicle,
} from "@/lib/engine";
import { prisma } from "@/lib/prisma";
import {
  checkOdometerOrder,
  parseFillInput,
  parseOdometerInput,
  parseReserveInput,
  type ValidationResult,
} from "@/lib/validation";

// Note on the entry created from the vehicle's initial fuel state.
export const STARTING_POINT_NOTE = "Starting point";

export function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

// Runs a handler for the signed-in user, turning unexpected errors into a 500.
export async function withUser(
  request: Request,
  label: string,
  handler: (user: AuthenticatedUser) => Promise<Response>
) {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth.user) {
      return jsonError(auth.error, auth.status);
    }
    return await handler(auth.user);
  } catch (error) {
    console.error(`Failed to ${label}`, error);
    return jsonError(`Failed to ${label}`, 500);
  }
}

export function getOwnedVehicle(userId: string, vehicleId: string) {
  return prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
}

export function getVehicleEvents(vehicleId: string) {
  return prisma.event.findMany({ where: { vehicleId }, orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }] });
}

export function toEngineVehicle(vehicle: Vehicle): EngineVehicle {
  return {
    startOdometer: vehicle.startOdometer,
    tankCapacityMl: vehicle.tankCapacityMl,
    reserveMl: vehicle.reserveMl,
    createdAt: vehicle.createdAt,
  };
}

// Everything the Home screen needs for one vehicle.
export function summarizeVehicle(vehicle: Vehicle, events: Event[], now = new Date()) {
  const ordered = sortEvents(events);
  const fills = ordered.filter((event) => event.kind === "FILL" && event.volumeMl !== null);
  const lastFill = fills.length > 0 ? fills[fills.length - 1] : null;
  const lastPrice = [...fills].reverse().find((event) => event.pricePaise !== null)?.pricePaise ?? null;
  const reserves = ordered.filter((event) => event.kind === "RESERVE");
  const lastReserve = reserves.length > 0 ? reserves[reserves.length - 1] : null;
  const openReserve =
    lastReserve && lastReserve.odometer === null &&
    !ordered.some((event) => event.kind === "FILL" && event.occurredAt > lastReserve.occurredAt)
      ? lastReserve
      : null;

  return {
    ...vehicle,
    gauge: calculateGauge(toEngineVehicle(vehicle), ordered, now),
    lastFill,
    lastPrice,
    openReserve,
    eventCount: ordered.length,
  };
}

// History: events newest first, with the cycle each closing event completes.
export function buildTimeline(vehicle: Vehicle, events: Event[]) {
  const cycles = calculateCycles(toEngineVehicle(vehicle), events).map((cycle) => ({
    startId: cycle.start.id,
    endId: cycle.end.id,
    type: cycle.type,
    distance: cycle.distance,
    addedMl: cycle.addedMl,
    burnedMl: cycle.burnedMl,
    kmPerL: cycle.kmPerL,
    status: cycle.status,
    approx: cycle.approx,
  }));
  return { events: sortEvents(events).reverse(), cycles };
}

// --- Events -----------------------------------------------------------------


type ParsedEvent = {
  id: string;
  vehicleId: string;
  occurredAt: Date;
  odometer: number | null;
  data: Omit<Prisma.EventUncheckedCreateInput, "id" | "userId" | "vehicleId" | "kind">;
  reserveTrip: number | null;
};

const EVENT_KINDS: EventKind[] = ["FILL", "RESERVE", "ODOMETER"];

export function parseEventKind(value: unknown): EventKind | null {
  return EVENT_KINDS.find((kind) => kind === value) ?? null;
}

export function parseEvent(kind: EventKind, body: Record<string, unknown> | null): ValidationResult<ParsedEvent> {
  if (kind === "FILL") {
    const parsed = parseFillInput(body);
    if (!parsed.ok) return parsed;
    const { id, vehicleId, reserveTrip, ...fill } = parsed.value;
    return {
      ok: true,
      value: {
        id,
        vehicleId,
        occurredAt: fill.occurredAt,
        odometer: fill.odometer,
        reserveTrip,
        data: { ...fill, odometerApprox: false },
      },
    };
  }

  if (kind === "RESERVE") {
    const parsed = parseReserveInput(body);
    if (!parsed.ok) return parsed;
    const { id, vehicleId, occurredAt, odometer } = parsed.value;
    return { ok: true, value: { id, vehicleId, occurredAt, odometer, reserveTrip: null, data: { occurredAt, odometer, odometerApprox: false } } };
  }

  const parsed = parseOdometerInput(body);
  if (!parsed.ok) return parsed;
  const { id, vehicleId, occurredAt, odometer } = parsed.value;
  return { ok: true, value: { id, vehicleId, occurredAt, odometer, reserveTrip: null, data: { occurredAt, odometer } } };
}

export function checkEventOdometer(vehicle: Vehicle, others: Event[], odometer: number | null, occurredAt: Date) {
  if (odometer === null) return { ok: true as const, value: null };
  return checkOdometerOrder({ odometer, occurredAt, startOdometer: vehicle.startOdometer, otherEvents: others });
}

// The reserve mark this fill closes, if its odometer reading is still unknown:
// the latest reserve mark before the fill with no other fill in between.
export function findOpenReserve(others: Event[], fillAt: Date) {
  const before = sortEvents(others).filter((event) => event.occurredAt.getTime() <= fillAt.getTime());
  for (let index = before.length - 1; index >= 0; index -= 1) {
    const event = before[index];
    if (event.kind === "FILL") return null;
    if (event.kind === "RESERVE") return event.odometer === null ? event : null;
  }
  return null;
}

// Works out the reading for an open reserve mark when a fill is saved.
export function planReserveResolution(
  vehicle: Vehicle,
  others: Event[],
  fill: { occurredAt: Date; odometer: number },
  tripTenths: number | null
): ValidationResult<{ id: string; odometer: number; odometerApprox: boolean } | null> {
  const open = findOpenReserve(others, fill.occurredAt);
  if (!open) return { ok: true, value: null };

  const resolved = resolveReserveOdometer(fill.odometer, tripTenths);
  const order = checkOdometerOrder({
    odometer: resolved.odometer,
    occurredAt: open.occurredAt,
    startOdometer: vehicle.startOdometer,
    otherEvents: others.filter((event) => event.id !== open.id),
  });
  if (!order.ok) {
    return { ok: false, error: "The trip reading is more than you rode since your last logged reading. Check the trip meter." };
  }
  return { ok: true, value: { id: open.id, odometer: resolved.odometer, odometerApprox: resolved.approx } };
}
