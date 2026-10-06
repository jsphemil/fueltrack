// Single source of truth for mileage calculations (reserve-to-reserve method).
// Pure functions shared by API routes and client components.
//
// A cycle runs from one reserve fill to the next reserve fill:
//   distance = odometer at closing reserve fill - odometer at opening reserve fill
//   litres   = fuel added from the opening fill up to (not including) the closing fill
//   mileage  = distance / litres
// Partial top-ups between reserve fills are counted in litres. Fills before the
// first reserve fill are not part of any cycle.

export type MileageEntry = {
  odometer: number;
  fuel_volume: number;
  amount_paid: number;
  is_reserve: boolean;
  filled_at: Date | string;
};

export type MileageCycle<T extends MileageEntry = MileageEntry> = {
  startEntry: T;
  endEntry: T;
  distance: number;
  litres: number;
  cost: number;
  mileage: number;
};

export type VehicleSummary = {
  entryCount: number;
  cycleCount: number;
  lastOdometer: number;
  totalSpend: number;
  totalLitres: number;
  distanceTracked: number;
  latestMileage: number | null;
  averageMileage: number | null;
  costPerKm: number | null;
  range: number | null;
  remainingRange: number | null;
  nextReserveOdometer: number | null;
};

export type MonthlySummary = {
  month: string;
  fill_count: number;
  total_spend: number;
  total_litres: number;
  total_distance: number;
  average_mileage: number | null;
  cost_per_km: number | null;
};

export type MileageTrendPoint = {
  date: string;
  mileage: number;
};

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toTime(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function toIso(value: Date | string) {
  return new Date(toTime(value)).toISOString();
}

export function sortEntries<T extends MileageEntry>(entries: T[]): T[] {
  return [...entries].sort(
    (a, b) => toTime(a.filled_at) - toTime(b.filled_at) || a.odometer - b.odometer
  );
}

export function calculateCycles<T extends MileageEntry>(entries: T[]): MileageCycle<T>[] {
  const ordered = sortEntries(entries);
  const cycles: MileageCycle<T>[] = [];
  let startIndex = -1;

  for (let index = 0; index < ordered.length; index += 1) {
    if (!ordered[index].is_reserve) {
      continue;
    }

    if (startIndex >= 0) {
      const startEntry = ordered[startIndex];
      const endEntry = ordered[index];
      const fills = ordered.slice(startIndex, index);
      const distance = endEntry.odometer - startEntry.odometer;
      const litres = fills.reduce((sum, entry) => sum + entry.fuel_volume, 0);
      const cost = fills.reduce((sum, entry) => sum + entry.amount_paid, 0);

      if (distance > 0 && litres > 0) {
        cycles.push({
          startEntry,
          endEntry,
          distance: round(distance, 1),
          litres: round(litres, 3),
          cost: round(cost),
          mileage: round(distance / litres),
        });
      }
    }

    startIndex = index;
  }

  return cycles;
}

export function summarizeVehicle(
  entries: MileageEntry[],
  initialOdometer: number
): VehicleSummary {
  const ordered = sortEntries(entries);
  const cycles = calculateCycles(ordered);
  const cycleDistance = cycles.reduce((sum, cycle) => sum + cycle.distance, 0);
  const cycleLitres = cycles.reduce((sum, cycle) => sum + cycle.litres, 0);
  const cycleCost = cycles.reduce((sum, cycle) => sum + cycle.cost, 0);
  const averageMileage = cycleLitres > 0 ? cycleDistance / cycleLitres : null;
  const lastOdometer =
    ordered.length > 0 ? ordered[ordered.length - 1].odometer : initialOdometer;

  let range: number | null = null;
  let remainingRange: number | null = null;
  let nextReserveOdometer: number | null = null;

  let lastReserveIndex = -1;
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    if (ordered[index].is_reserve) {
      lastReserveIndex = index;
      break;
    }
  }

  if (averageMileage !== null && lastReserveIndex >= 0) {
    const litresSinceReserve = ordered
      .slice(lastReserveIndex)
      .reduce((sum, entry) => sum + entry.fuel_volume, 0);
    range = averageMileage * litresSinceReserve;
    nextReserveOdometer = ordered[lastReserveIndex].odometer + range;
    remainingRange = Math.max(0, nextReserveOdometer - lastOdometer);
  }

  return {
    entryCount: ordered.length,
    cycleCount: cycles.length,
    lastOdometer,
    totalSpend: round(ordered.reduce((sum, entry) => sum + entry.amount_paid, 0)),
    totalLitres: round(ordered.reduce((sum, entry) => sum + entry.fuel_volume, 0), 3),
    distanceTracked: round(Math.max(0, lastOdometer - initialOdometer), 1),
    latestMileage: cycles.length > 0 ? cycles[cycles.length - 1].mileage : null,
    averageMileage: averageMileage !== null ? round(averageMileage) : null,
    costPerKm: cycleDistance > 0 ? round(cycleCost / cycleDistance) : null,
    range: range !== null ? round(range, 1) : null,
    remainingRange: remainingRange !== null ? round(remainingRange, 1) : null,
    nextReserveOdometer: nextReserveOdometer !== null ? round(nextReserveOdometer, 1) : null,
  };
}

// tzOffsetMinutes follows Date#getTimezoneOffset (UTC - local), so months are
// bucketed in the user's local time.
export function formatMonthKey(value: Date | string, tzOffsetMinutes = 0) {
  const local = new Date(toTime(value) - tzOffsetMinutes * 60 * 1000);
  const year = local.getUTCFullYear();
  const month = String(local.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function buildMonthly(
  entries: MileageEntry[],
  tzOffsetMinutes = 0
): MonthlySummary[] {
  const buckets = new Map<
    string,
    { fills: number; spend: number; litres: number; distance: number; cycleLitres: number; cycleCost: number }
  >();

  const getBucket = (month: string) => {
    const bucket = buckets.get(month) ?? {
      fills: 0,
      spend: 0,
      litres: 0,
      distance: 0,
      cycleLitres: 0,
      cycleCost: 0,
    };
    buckets.set(month, bucket);
    return bucket;
  };

  for (const entry of entries) {
    const bucket = getBucket(formatMonthKey(entry.filled_at, tzOffsetMinutes));
    bucket.fills += 1;
    bucket.spend += entry.amount_paid;
    bucket.litres += entry.fuel_volume;
  }

  // Cycle distance and mileage belong to the month the cycle closed.
  for (const cycle of calculateCycles(entries)) {
    const bucket = getBucket(formatMonthKey(cycle.endEntry.filled_at, tzOffsetMinutes));
    bucket.distance += cycle.distance;
    bucket.cycleLitres += cycle.litres;
    bucket.cycleCost += cycle.cost;
  }

  return [...buckets.entries()]
    .sort(([monthA], [monthB]) => (monthA < monthB ? 1 : monthA > monthB ? -1 : 0))
    .map(([month, bucket]) => ({
      month,
      fill_count: bucket.fills,
      total_spend: round(bucket.spend),
      total_litres: round(bucket.litres, 2),
      total_distance: round(bucket.distance, 1),
      average_mileage: bucket.cycleLitres > 0 ? round(bucket.distance / bucket.cycleLitres) : null,
      cost_per_km: bucket.distance > 0 ? round(bucket.cycleCost / bucket.distance) : null,
    }));
}

export function buildMileageTrend(entries: MileageEntry[]): MileageTrendPoint[] {
  return calculateCycles(entries).map((cycle) => ({
    date: toIso(cycle.endEntry.filled_at),
    mileage: cycle.mileage,
  }));
}
