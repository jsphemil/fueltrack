// FuelTrack calculation engine for vehicles without a fuel gauge.
// Pure functions shared by API routes and the UI. Stored units (see lib/units.ts):
// odometer in tenths of a km, volume in ml, money in paise.
//
// The tank level is only known at "anchors":
//   R = a reserve mark with an odometer reading (tank at reserve level)
//   F = a full-tank fill (tank full)
// A cycle runs between consecutive anchors. Fuel burned in a cycle:
//   R→R, F→F: litres added in between (unknown level cancels out)
//   R→F:      reserve + litres added − capacity   (needs tank info)
//   F→R:      capacity + litres added − reserve   (needs tank info)
// Litres added include the closing fill when the cycle ends on a full tank.

export type EventKind = "FILL" | "RESERVE" | "ODOMETER";

export type EngineEvent = {
  id: string;
  kind: EventKind;
  occurredAt: Date | string;
  odometer: number | null;
  odometerApprox?: boolean;
  volumeMl?: number | null;
  amountPaise?: number | null;
  fullTank?: boolean;
};

export type EngineVehicle = {
  startOdometer: number;
  tankCapacityMl: number | null;
  reserveMl: number | null;
  createdAt?: Date | string;
};

export type CycleStatus = "ok" | "implausible" | "needs-tank-info" | "invalid";

export type Cycle<T extends EngineEvent = EngineEvent> = {
  start: T;
  end: T;
  type: "RR" | "FF" | "RF" | "FR";
  distance: number; // tenths of km
  addedMl: number;
  burnedMl: number | null;
  kmPerL: number | null;
  status: CycleStatus;
  approx: boolean;
};

export const MIN_KM_PER_L = 5;
export const MAX_KM_PER_L = 150;
export const RECENT_CYCLES = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

function time(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// km per litre from tenths of km and ml.
function kmPerLitre(distanceTenths: number, volumeMl: number) {
  return distanceTenths / 10 / (volumeMl / 1000);
}

export function sortEvents<T extends EngineEvent>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    const byTime = time(a.occurredAt) - time(b.occurredAt);
    if (byTime !== 0) return byTime;
    if (a.odometer !== null && b.odometer !== null && a.odometer !== b.odometer) {
      return a.odometer - b.odometer;
    }
    // Same moment: a reserve mark comes before the fill that follows it.
    const order: Record<EventKind, number> = { ODOMETER: 0, RESERVE: 1, FILL: 2 };
    return order[a.kind] - order[b.kind];
  });
}

function anchorType(event: EngineEvent): "R" | "F" | null {
  if (event.kind === "RESERVE" && event.odometer !== null) return "R";
  if (event.kind === "FILL" && event.fullTank && event.odometer !== null) return "F";
  return null;
}

export function calculateCycles<T extends EngineEvent>(
  vehicle: EngineVehicle,
  events: T[]
): Cycle<T>[] {
  const ordered = sortEvents(events);
  const cycles: Cycle<T>[] = [];
  let start: T | null = null;
  let addedMl = 0;

  for (const event of ordered) {
    if (event.kind === "FILL" && start) {
      addedMl += event.volumeMl ?? 0;
    }

    const type = anchorType(event);
    if (!type) continue;

    if (start) {
      const startType = anchorType(start) as "R" | "F";
      const cycleType = `${startType}${type}` as Cycle["type"];
      const distance = (event.odometer as number) - (start.odometer as number);
      let burnedMl: number | null = addedMl;
      let status: CycleStatus = "ok";

      if (cycleType === "RF" || cycleType === "FR") {
        if (vehicle.tankCapacityMl === null || vehicle.reserveMl === null) {
          burnedMl = null;
          status = "needs-tank-info";
        } else if (cycleType === "RF") {
          burnedMl = vehicle.reserveMl + addedMl - vehicle.tankCapacityMl;
        } else {
          burnedMl = vehicle.tankCapacityMl + addedMl - vehicle.reserveMl;
        }
      }

      let kmPerL: number | null = null;
      if (status === "ok") {
        if (distance <= 0 || burnedMl === null || burnedMl <= 0) {
          status = "invalid";
        } else {
          kmPerL = round(kmPerLitre(distance, burnedMl));
          if (kmPerL < MIN_KM_PER_L || kmPerL > MAX_KM_PER_L) {
            status = "implausible";
          }
        }
      }

      cycles.push({
        start,
        end: event,
        type: cycleType,
        distance,
        addedMl,
        burnedMl,
        kmPerL,
        status,
        approx: Boolean(start.odometerApprox || event.odometerApprox),
      });
    }

    start = event;
    addedMl = 0;
  }

  return cycles;
}

// Distance-weighted km/l over valid cycles.
export function efficiency(cycles: Cycle[], limit?: number): number | null {
  const valid = cycles.filter((cycle) => cycle.status === "ok");
  const used = limit ? valid.slice(-limit) : valid;
  const distance = used.reduce((sum, cycle) => sum + cycle.distance, 0);
  const burned = used.reduce((sum, cycle) => sum + (cycle.burnedMl ?? 0), 0);
  return burned > 0 ? round(kmPerLitre(distance, burned)) : null;
}

type Reading = { odometer: number; at: number };

function readings(vehicle: EngineVehicle, ordered: EngineEvent[]): Reading[] {
  const list: Reading[] = [];
  if (vehicle.createdAt) {
    list.push({ odometer: vehicle.startOdometer, at: time(vehicle.createdAt) });
  }
  for (const event of ordered) {
    if (event.odometer !== null) {
      list.push({ odometer: event.odometer, at: time(event.occurredAt) });
    }
  }
  return list;
}

// Average km per day between the first and last odometer reading (at least 3 days apart).
export function kmPerDay(vehicle: EngineVehicle, events: EngineEvent[]): number | null {
  const list = readings(vehicle, sortEvents(events));
  if (list.length < 2) return null;
  const first = list[0];
  const last = list[list.length - 1];
  const days = (last.at - first.at) / DAY_MS;
  if (days < 3 || last.odometer <= first.odometer) return null;
  return round((last.odometer - first.odometer) / 10 / days, 1);
}

export type OdometerEstimate = {
  odometer: number; // tenths of km
  estimated: boolean;
  lastReadingAt: string | null;
};

// Latest known odometer, projected forward by average km/day when the last
// reading is more than a day old.
export function currentOdometer(
  vehicle: EngineVehicle,
  events: EngineEvent[],
  now: Date = new Date()
): OdometerEstimate {
  const list = readings(vehicle, sortEvents(events));
  const last = list.length > 0 ? list[list.length - 1] : null;

  if (!last) {
    return { odometer: vehicle.startOdometer, estimated: false, lastReadingAt: null };
  }

  const days = (now.getTime() - last.at) / DAY_MS;
  const perDay = kmPerDay(vehicle, events);
  if (days > 1 && perDay !== null) {
    return {
      odometer: last.odometer + Math.round(perDay * days * 10),
      estimated: true,
      lastReadingAt: new Date(last.at).toISOString(),
    };
  }

  return { odometer: last.odometer, estimated: false, lastReadingAt: new Date(last.at).toISOString() };
}

export type GaugeStatus =
  | "ok" // estimate available
  | "on-reserve" // last known state is reserve with no fuel added since
  | "calibrating" // not enough cycles for an efficiency yet
  | "needs-tank-info" // last anchor is a full tank but capacity/reserve unknown
  | "no-data";

export type Gauge = {
  status: GaugeStatus;
  efficiency: number | null; // km/l used for the estimate
  lifetimeEfficiency: number | null;
  odometer: OdometerEstimate;
  kmToReserve: number | null; // km
  reserveAtOdometer: number | null; // tenths of km
  reserveRangeKm: number | null;
  reserveKmLeft: number | null; // while on reserve
  fuelAboveReserveMl: number | null;
  fillPercent: number | null; // 0–100, needs capacity and reserve
  confidence: "high" | "medium" | "low";
  validCycles: number;
};

export function calculateGauge(
  vehicle: EngineVehicle,
  events: EngineEvent[],
  now: Date = new Date()
): Gauge {
  const ordered = sortEvents(events);
  const cycles = calculateCycles(vehicle, ordered);
  const validCycles = cycles.filter((cycle) => cycle.status === "ok").length;
  const recent = efficiency(cycles, RECENT_CYCLES);
  const lifetime = efficiency(cycles);
  const eff = recent ?? lifetime;
  const odometer = currentOdometer(vehicle, ordered, now);
  const reserveRangeKm =
    eff !== null && vehicle.reserveMl !== null ? round((vehicle.reserveMl / 1000) * eff, 0) : null;

  const base: Gauge = {
    status: "no-data",
    efficiency: eff,
    lifetimeEfficiency: lifetime,
    odometer,
    kmToReserve: null,
    reserveAtOdometer: null,
    reserveRangeKm,
    reserveKmLeft: null,
    fuelAboveReserveMl: null,
    fillPercent: null,
    confidence: "low",
    validCycles,
  };

  if (ordered.length === 0) return base;

  base.confidence =
    validCycles >= 3 && !odometer.estimated ? "high" : validCycles >= 1 ? "medium" : "low";

  // A reserve mark with nothing filled since means the bike is on reserve now
  // (whether or not its odometer reading is known yet).
  let anchorIndex = -1;
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    if (anchorType(ordered[index])) {
      anchorIndex = index;
      break;
    }
  }
  const fillsAfter = (index: number) =>
    ordered.slice(index + 1).filter((event) => event.kind === "FILL");

  const lastReserveIndex = ordered.map((event) => event.kind).lastIndexOf("RESERVE");
  if (lastReserveIndex >= 0 && fillsAfter(lastReserveIndex).length === 0) {
    const reserveEvent = ordered[lastReserveIndex];
    const kmSince =
      reserveEvent.odometer !== null ? Math.max(0, odometer.odometer - reserveEvent.odometer) / 10 : 0;
    return {
      ...base,
      status: "on-reserve",
      kmToReserve: 0,
      fuelAboveReserveMl: 0,
      reserveKmLeft: reserveRangeKm !== null ? Math.max(0, round(reserveRangeKm - kmSince, 0)) : null,
      fillPercent:
        vehicle.tankCapacityMl && vehicle.reserveMl !== null
          ? round((vehicle.reserveMl / vehicle.tankCapacityMl) * 100, 0)
          : null,
    };
  }

  if (anchorIndex < 0 || eff === null) return { ...base, status: "calibrating" };

  const anchor = ordered[anchorIndex];
  const addedSinceMl = fillsAfter(anchorIndex).reduce((sum, event) => sum + (event.volumeMl ?? 0), 0);
  const kmSinceAnchor = Math.max(0, odometer.odometer - (anchor.odometer as number)) / 10;
  const burnedSinceMl = (kmSinceAnchor / eff) * 1000;

  let aboveAtAnchorMl: number;
  if (anchorType(anchor) === "R") {
    aboveAtAnchorMl = 0;
  } else if (vehicle.tankCapacityMl !== null && vehicle.reserveMl !== null) {
    aboveAtAnchorMl = vehicle.tankCapacityMl - vehicle.reserveMl;
  } else {
    return { ...base, status: "needs-tank-info" };
  }

  const fuelAboveReserveMl = aboveAtAnchorMl + addedSinceMl - burnedSinceMl;
  const kmToReserveRaw = (fuelAboveReserveMl / 1000) * eff;
  const fillPercent =
    vehicle.tankCapacityMl && vehicle.reserveMl !== null
      ? Math.min(100, Math.max(0, round(((vehicle.reserveMl + fuelAboveReserveMl) / vehicle.tankCapacityMl) * 100, 0)))
      : null;

  return {
    ...base,
    status: "ok",
    kmToReserve: Math.max(0, round(kmToReserveRaw, 0)),
    reserveAtOdometer: odometer.odometer + Math.round(kmToReserveRaw * 10),
    fuelAboveReserveMl: Math.max(0, Math.round(fuelAboveReserveMl)),
    fillPercent,
  };
}

// --- Stats ------------------------------------------------------------------

export type MonthStats = {
  month: string; // YYYY-MM in the user's local time
  fills: number;
  spendPaise: number;
  volumeMl: number;
  distance: number; // tenths of km
  kmPerL: number | null;
};

export type VehicleStats = {
  totalSpendPaise: number;
  totalVolumeMl: number;
  fillCount: number;
  distance: number; // tenths of km since start odometer
  kmPerDay: number | null;
  efficiency: number | null;
  lifetimeEfficiency: number | null;
  avgPricePaise: number | null; // per litre
  costPerKmPaise: number | null;
  avgFillMl: number | null;
  avgReserveKm: number | null; // km ridden on reserve before filling
  cycles: Array<{ date: string; kmPerL: number; distance: number; type: Cycle["type"] }>;
  months: MonthStats[];
};

export function monthKey(value: Date | string, tzOffsetMinutes = 0) {
  const local = new Date(time(value) - tzOffsetMinutes * 60 * 1000);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function calculateStats(
  vehicle: EngineVehicle,
  events: EngineEvent[],
  tzOffsetMinutes = 0,
  now: Date = new Date()
): VehicleStats {
  const ordered = sortEvents(events);
  // Fills without a volume are starting points ("tank is full now"), not purchases.
  const fills = ordered.filter((event) => event.kind === "FILL" && event.volumeMl != null);
  const cycles = calculateCycles(vehicle, ordered);
  const totalSpendPaise = fills.reduce((sum, event) => sum + (event.amountPaise ?? 0), 0);
  const totalVolumeMl = fills.reduce((sum, event) => sum + (event.volumeMl ?? 0), 0);
  const recent = efficiency(cycles, RECENT_CYCLES);
  const lifetime = efficiency(cycles);
  const eff = recent ?? lifetime;
  const avgPricePaise = totalVolumeMl > 0 ? Math.round(totalSpendPaise / (totalVolumeMl / 1000)) : null;
  const odometer = currentOdometer(vehicle, ordered, now);

  // km ridden on reserve: reserve mark (exact reading) to the next fill.
  const reserveRuns: number[] = [];
  ordered.forEach((event, index) => {
    if (event.kind !== "RESERVE" || event.odometer === null || event.odometerApprox) return;
    const nextFill = ordered.slice(index + 1).find((next) => next.kind === "FILL");
    if (nextFill?.odometer != null && nextFill.odometer >= event.odometer) {
      reserveRuns.push((nextFill.odometer - event.odometer) / 10);
    }
  });

  // Monthly buckets: spend/volume by fill month, distance between consecutive
  // readings by the later reading's month, km/l by the month a cycle ends.
  const months = new Map<string, MonthStats & { cycleDistance: number; cycleBurned: number }>();
  const bucket = (key: string) => {
    const existing = months.get(key);
    if (existing) return existing;
    const created = { month: key, fills: 0, spendPaise: 0, volumeMl: 0, distance: 0, kmPerL: null, cycleDistance: 0, cycleBurned: 0 };
    months.set(key, created);
    return created;
  };

  for (const fill of fills) {
    const entry = bucket(monthKey(fill.occurredAt, tzOffsetMinutes));
    entry.fills += 1;
    entry.spendPaise += fill.amountPaise ?? 0;
    entry.volumeMl += fill.volumeMl ?? 0;
  }

  const list = readings(vehicle, ordered);
  for (let index = 1; index < list.length; index += 1) {
    const delta = list[index].odometer - list[index - 1].odometer;
    if (delta > 0) {
      bucket(monthKey(new Date(list[index].at), tzOffsetMinutes)).distance += delta;
    }
  }

  for (const cycle of cycles) {
    if (cycle.status !== "ok" || cycle.burnedMl === null) continue;
    const entry = bucket(monthKey(cycle.end.occurredAt, tzOffsetMinutes));
    entry.cycleDistance += cycle.distance;
    entry.cycleBurned += cycle.burnedMl;
  }

  return {
    totalSpendPaise,
    totalVolumeMl,
    fillCount: fills.length,
    distance: Math.max(0, odometer.odometer - vehicle.startOdometer),
    kmPerDay: kmPerDay(vehicle, ordered),
    efficiency: eff,
    lifetimeEfficiency: lifetime,
    avgPricePaise,
    costPerKmPaise: eff !== null && avgPricePaise !== null ? round(avgPricePaise / eff, 2) : null,
    avgFillMl: fills.length > 0 ? Math.round(totalVolumeMl / fills.length) : null,
    avgReserveKm:
      reserveRuns.length > 0 ? round(reserveRuns.reduce((a, b) => a + b, 0) / reserveRuns.length, 1) : null,
    cycles: cycles
      .filter((cycle) => cycle.status === "ok" && cycle.kmPerL !== null)
      .map((cycle) => ({
        date: new Date(time(cycle.end.occurredAt)).toISOString(),
        kmPerL: cycle.kmPerL as number,
        distance: cycle.distance,
        type: cycle.type,
      })),
    months: [...months.values()]
      .sort((a, b) => (a.month < b.month ? 1 : -1))
      .map(({ cycleDistance, cycleBurned, ...entry }) => ({
        ...entry,
        kmPerL: cycleBurned > 0 ? round(kmPerLitre(cycleDistance, cycleBurned)) : null,
      })),
  };
}

// Reserve reading worked out at the pump. With a trip-meter reading (km since
// reserve) it is exact; without one the fill's odometer is used, marked approximate.
export function resolveReserveOdometer(fillOdometer: number, tripTenths: number | null) {
  if (tripTenths !== null && tripTenths >= 0 && tripTenths <= fillOdometer) {
    return { odometer: fillOdometer - tripTenths, approx: false };
  }
  return { odometer: fillOdometer, approx: true };
}

// Low-fuel reminder: the estimate says reserve is within thresholdKm.
// "on-reserve" is excluded: the rider marked it, so they already know.
export function isLowFuel(gauge: Gauge, thresholdKm: number | null) {
  return thresholdKm !== null && gauge.status === "ok" && gauge.kmToReserve !== null && gauge.kmToReserve <= thresholdKm;
}

// --- Service log ----------------------------------------------------------------

// A service item counts as due this close to its interval.
export const SERVICE_SOON_KM = 100;
export const SERVICE_SOON_DAYS = 14;

export type ServiceItemInput = {
  id: string;
  name: string;
  intervalKm: number | null;
  intervalMonths: number | null;
  baselineOdometer: number; // tenths of km
  baselineDate: Date | string; // date part is used
};

export type ServiceDone = { odometer: number; occurredOn: Date | string };

export type ServiceStatus = {
  itemId: string;
  name: string;
  intervalKm: number | null;
  intervalMonths: number | null;
  lastOdometer: number; // tenths of km
  lastDate: string; // YYYY-MM-DD
  dueKm: number | null; // km left; negative = overdue; null = no km interval
  dueDays: number | null; // days left; negative = overdue; null = no time interval
  due: boolean;
};

const datePart = (value: Date | string) => (typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10));

// "YYYY-MM-DD" plus whole months, clamped to the month's last day (31 Jan + 1 month = 28/29 Feb).
export function addMonths(date: string, months: number) {
  const [year, month, day] = date.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1 + months, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

// When an item was last done is the furthest point among its starting point and
// every service that included it, so editing or deleting history stays consistent.
// Share of the interval left (by km or time, whichever is closer); lower = more urgent.
export function serviceUrgency(status: ServiceStatus) {
  const byKm = status.dueKm !== null && status.intervalKm ? status.dueKm / status.intervalKm : Infinity;
  const byTime = status.dueDays !== null && status.intervalMonths ? status.dueDays / (status.intervalMonths * 30.4) : Infinity;
  return Math.min(byKm, byTime);
}

export function serviceStatus(item: ServiceItemInput, done: ServiceDone[], odometer: number, today: Date = new Date()): ServiceStatus {
  const lastOdometer = Math.max(item.baselineOdometer, ...done.map((record) => record.odometer));
  const lastDate = [datePart(item.baselineDate), ...done.map((record) => datePart(record.occurredOn))].sort().pop() as string;
  const dueKm = item.intervalKm !== null ? Math.round(item.intervalKm - (odometer - lastOdometer) / 10) : null;
  const dueDays = item.intervalMonths !== null ? daysUntil(addMonths(lastDate, item.intervalMonths), today) : null;
  const due = (dueKm !== null && dueKm <= SERVICE_SOON_KM) || (dueDays !== null && dueDays <= SERVICE_SOON_DAYS);
  return { itemId: item.id, name: item.name, intervalKm: item.intervalKm, intervalMonths: item.intervalMonths, lastOdometer, lastDate, dueKm, dueDays, due };
}

// --- Document reminders ---------------------------------------------------------

// Remind this many days before a document expires.
export const DOCUMENT_REMIND_DAYS = [30, 7] as const;

// Whole days from today (the phone's local date) to an expiry date "YYYY-MM-DD".
export function daysUntil(expiresOn: string, today: Date = new Date()) {
  const [year, month, day] = expiresOn.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000);
}

// Reminder stage for a document: "expired", "7", "30" or null when not due yet.
export function documentStage(daysLeft: number) {
  if (daysLeft < 0) return "expired";
  const stage = [...DOCUMENT_REMIND_DAYS].sort((a, b) => a - b).find((days) => daysLeft <= days);
  return stage === undefined ? null : String(stage);
}

// --- Cost of ownership --------------------------------------------------------------

export type OwnershipCost = {
  totalPaise: number;
  perKmPaise: number | null; // everything spent / distance ridden
  breakdown: Array<{ label: string; paise: number }>; // biggest first, zero rows left out
};

// Fuel, service visits and other expenses together. Distance in tenths of km.
export function ownershipCost(
  parts: { fuelPaise: number; maintenancePaise: number; repairPaise: number; expenses: Array<{ category: string; amountPaise: number }> },
  distance: number
): OwnershipCost {
  const totals = new Map<string, number>([
    ["Fuel", parts.fuelPaise],
    ["Maintenance", parts.maintenancePaise],
    ["Repairs", parts.repairPaise],
  ]);
  for (const expense of parts.expenses) totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amountPaise);

  const breakdown = [...totals].map(([label, paise]) => ({ label, paise })).filter((row) => row.paise > 0).sort((a, b) => b.paise - a.paise);
  const totalPaise = breakdown.reduce((sum, row) => sum + row.paise, 0);
  return { totalPaise, perKmPaise: distance > 0 && totalPaise > 0 ? round(totalPaise / (distance / 10), 2) : null, breakdown };
}
