import { describe, expect, it } from "@jest/globals";
import {
  buildMileageTrend,
  buildMonthly,
  calculateCycles,
  formatMonthKey,
  summarizeVehicle,
  type MileageEntry,
} from "@/lib/mileage";

function entry(
  day: string,
  odometer: number,
  litres: number,
  isReserve: boolean,
  amount = litres * 100
): MileageEntry {
  return {
    filled_at: new Date(`${day}T10:00:00Z`),
    odometer,
    fuel_volume: litres,
    amount_paid: amount,
    is_reserve: isReserve,
  };
}

describe("calculateCycles", () => {
  it("computes mileage between consecutive reserve fills", () => {
    const cycles = calculateCycles([
      entry("2026-01-01", 1000, 10, true),
      entry("2026-01-10", 1450, 10, true),
    ]);

    expect(cycles).toHaveLength(1);
    expect(cycles[0].distance).toBe(450);
    expect(cycles[0].litres).toBe(10);
    expect(cycles[0].mileage).toBe(45);
  });

  it("includes partial top-ups between reserve fills in the litres", () => {
    const cycles = calculateCycles([
      entry("2026-01-01", 1000, 5, true),
      entry("2026-01-04", 1150, 3, false),
      entry("2026-01-08", 1300, 2, false),
      entry("2026-01-12", 1500, 6, true),
    ]);

    // 500 km on 5 + 3 + 2 = 10 litres
    expect(cycles).toHaveLength(1);
    expect(cycles[0].distance).toBe(500);
    expect(cycles[0].litres).toBe(10);
    expect(cycles[0].mileage).toBe(50);
    expect(cycles[0].cost).toBe(1000);
  });

  it("ignores fills before the first reserve fill", () => {
    const cycles = calculateCycles([
      entry("2026-01-01", 900, 4, false),
      entry("2026-01-02", 1000, 10, true),
      entry("2026-01-10", 1400, 8, true),
    ]);

    expect(cycles).toHaveLength(1);
    expect(cycles[0].mileage).toBe(40);
  });

  it("returns no cycles without at least two reserve fills", () => {
    expect(calculateCycles([])).toEqual([]);
    expect(calculateCycles([entry("2026-01-01", 1000, 10, true)])).toEqual([]);
    expect(
      calculateCycles([
        entry("2026-01-01", 1000, 10, false),
        entry("2026-01-05", 1300, 10, false),
      ])
    ).toEqual([]);
  });

  it("orders entries by fill date regardless of input order", () => {
    const cycles = calculateCycles([
      entry("2026-01-20", 1900, 10, true),
      entry("2026-01-01", 1000, 10, true),
      entry("2026-01-10", 1450, 9, true),
    ]);

    expect(cycles.map((cycle) => cycle.mileage)).toEqual([45, 50]);
  });
});

describe("summarizeVehicle", () => {
  it("returns empty statistics for a vehicle without entries", () => {
    const summary = summarizeVehicle([], 500);

    expect(summary.lastOdometer).toBe(500);
    expect(summary.totalSpend).toBe(0);
    expect(summary.averageMileage).toBeNull();
    expect(summary.range).toBeNull();
    expect(summary.costPerKm).toBeNull();
  });

  it("uses distance-weighted average and predicts range from the last reserve fill", () => {
    const summary = summarizeVehicle(
      [
        entry("2026-01-01", 1000, 10, true), // cycle 1: 400 km / 10 L = 40
        entry("2026-01-10", 1400, 5, true), // cycle 2: 300 km / 5 L = 60
        entry("2026-01-20", 1700, 8, true), // open cycle: 8 L since reserve
        entry("2026-01-22", 1750, 2, false),
      ],
      900
    );

    // 700 km / 15 L = 46.67 (mean of ratios would be 50)
    expect(summary.averageMileage).toBe(46.67);
    expect(summary.latestMileage).toBe(60);
    expect(summary.cycleCount).toBe(2);
    expect(summary.lastOdometer).toBe(1750);
    expect(summary.distanceTracked).toBe(850);
    expect(summary.totalSpend).toBe(2500);
    expect(summary.totalLitres).toBe(25);
    // cost 1500 over 700 km
    expect(summary.costPerKm).toBe(2.14);
    // 700/15 * (8 + 2) litres = 466.7 km from odometer 1700
    expect(summary.range).toBe(466.7);
    expect(summary.nextReserveOdometer).toBe(2166.7);
    expect(summary.remainingRange).toBe(416.7);
  });

  it("never reports a negative remaining range", () => {
    const summary = summarizeVehicle(
      [
        entry("2026-01-01", 1000, 10, true),
        entry("2026-01-10", 1400, 1, true),
        entry("2026-01-12", 1600, 1, false),
      ],
      900
    );

    expect(summary.remainingRange).toBe(0);
  });
});

describe("buildMonthly", () => {
  it("groups spend by fill month and cycle distance by closing month", () => {
    const monthly = buildMonthly([
      entry("2026-01-25", 1000, 10, true, 1000),
      entry("2026-02-05", 1500, 10, true, 1100),
    ]);

    expect(monthly).toEqual([
      {
        month: "2026-02",
        fill_count: 1,
        total_spend: 1100,
        total_litres: 10,
        total_distance: 500,
        average_mileage: 50,
        cost_per_km: 2,
      },
      {
        month: "2026-01",
        fill_count: 1,
        total_spend: 1000,
        total_litres: 10,
        total_distance: 0,
        average_mileage: null,
        cost_per_km: null,
      },
    ]);
  });

  it("buckets months in the user's local time zone", () => {
    // 2026-01-31 20:00 UTC is 2026-02-01 01:30 in IST (offset -330)
    expect(formatMonthKey(new Date("2026-01-31T20:00:00Z"), 0)).toBe("2026-01");
    expect(formatMonthKey(new Date("2026-01-31T20:00:00Z"), -330)).toBe("2026-02");
  });
});

describe("buildMileageTrend", () => {
  it("returns one point per completed cycle", () => {
    const trend = buildMileageTrend([
      entry("2026-01-01", 1000, 10, true),
      entry("2026-01-10", 1450, 10, true),
      entry("2026-01-20", 1950, 10, true),
    ]);

    expect(trend).toEqual([
      { date: "2026-01-10T10:00:00.000Z", mileage: 45 },
      { date: "2026-01-20T10:00:00.000Z", mileage: 50 },
    ]);
  });
});
