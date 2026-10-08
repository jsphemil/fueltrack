import { describe, expect, it } from "@jest/globals";

import {
  calculateCycles,
  calculateGauge,
  calculateStats,
  currentOdometer,
  daysUntil,
  documentStage,
  efficiency,
  isLowFuel,
  mileageDrop,
  addMonths,
  serviceStatus,
  serviceUrgency,
  kmPerDay,
  monthKey,
  ownershipCost,
  resolveReserveOdometer,
  sortEvents,
  type EngineEvent,
  type EngineVehicle,
} from "@/lib/engine";

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date("2026-08-01T08:00:00Z").getTime();
let seq = 0;

// Helpers take km / litres / rupees for readability and convert to stored units.
function at(day: number, hour = 0) {
  return new Date(T0 + day * DAY + hour * 60 * 60 * 1000);
}
function reserve(day: number, km: number | null, approx = false): EngineEvent {
  return { id: `e${++seq}`, kind: "RESERVE", occurredAt: at(day), odometer: km === null ? null : km * 10, odometerApprox: approx };
}
function fill(day: number, km: number, litres: number, opts: { full?: boolean; rupees?: number; hour?: number } = {}): EngineEvent {
  return {
    id: `e${++seq}`,
    kind: "FILL",
    occurredAt: at(day, opts.hour ?? 1),
    odometer: km * 10,
    volumeMl: litres * 1000,
    amountPaise: (opts.rupees ?? litres * 100) * 100,
    fullTank: opts.full ?? false,
  };
}
function odo(day: number, km: number, hour = 2): EngineEvent {
  return { id: `e${++seq}`, kind: "ODOMETER", occurredAt: at(day, hour), odometer: km * 10 };
}

const noTank: EngineVehicle = { startOdometer: 900 * 10, tankCapacityMl: null, reserveMl: null, createdAt: at(-1) };
const tank: EngineVehicle = { ...noTank, tankCapacityMl: 12000, reserveMl: 2000 };

describe("sortEvents", () => {
  it("orders by time and puts a reserve mark before a fill at the same moment", () => {
    const f = { ...fill(1, 1000, 5), occurredAt: at(1) };
    const r = reserve(1, 1000);
    expect(sortEvents([f, r]).map((e) => e.kind)).toEqual(["RESERVE", "FILL"]);
  });
});

describe("calculateCycles", () => {
  it("reserve to reserve counts every litre added in between, including partial top-ups", () => {
    const cycles = calculateCycles(noTank, [
      reserve(0, 10000),
      fill(0, 10000, 5),
      fill(2, 10200, 3),
      reserve(4, 10400),
    ]);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toMatchObject({ type: "RR", distance: 4000, addedMl: 8000, burnedMl: 8000, kmPerL: 50, status: "ok" });
  });

  it("full tank to full tank includes the closing fill", () => {
    const cycles = calculateCycles(noTank, [
      fill(0, 1000, 10, { full: true }),
      fill(2, 1100, 2),
      fill(4, 1300, 6, { full: true }),
    ]);
    expect(cycles[0]).toMatchObject({ type: "FF", distance: 3000, burnedMl: 8000, kmPerL: 37.5, status: "ok" });
  });

  it("reserve to full uses tank capacity and reserve", () => {
    const events = [reserve(0, 1000), fill(0, 1050, 4), fill(3, 1250, 10, { full: true })];
    // level 2 L + 14 L added − 12 L full = 4 L burned over 250 km
    expect(calculateCycles(tank, events)[0]).toMatchObject({ type: "RF", burnedMl: 4000, kmPerL: 62.5, status: "ok" });
    expect(calculateCycles(noTank, events)[0]).toMatchObject({ type: "RF", burnedMl: null, kmPerL: null, status: "needs-tank-info" });
  });

  it("full to reserve uses tank capacity and reserve", () => {
    const events = [fill(0, 2000, 9, { full: true }), fill(3, 2300, 3), reserve(5, 2650)];
    // 12 L + 3 L − 2 L = 13 L burned over 650 km
    expect(calculateCycles(tank, events)[0]).toMatchObject({ type: "FR", burnedMl: 13000, kmPerL: 50, status: "ok" });
  });

  it("ignores reserve marks without an odometer reading", () => {
    const cycles = calculateCycles(noTank, [reserve(0, 1000), reserve(1, null), fill(1, 1300, 8), reserve(2, 1400)]);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toMatchObject({ distance: 4000, burnedMl: 8000, kmPerL: 50 });
  });

  it("flags implausible and invalid cycles instead of using them", () => {
    const implausible = calculateCycles(noTank, [reserve(0, 1000), fill(0, 1000, 1), reserve(2, 1500)]);
    expect(implausible[0].status).toBe("implausible");
    const noFuel = calculateCycles(noTank, [reserve(0, 1000), reserve(2, 1100)]);
    expect(noFuel[0].status).toBe("invalid");
    expect(efficiency([...implausible, ...noFuel])).toBeNull();
  });

  it("marks cycles with an approximate reserve reading", () => {
    const cycles = calculateCycles(noTank, [reserve(0, 1000, true), fill(0, 1000, 8), reserve(3, 1400)]);
    expect(cycles[0].approx).toBe(true);
  });
});

describe("efficiency", () => {
  it("is distance-weighted and can use only recent cycles", () => {
    const cycles = calculateCycles(noTank, [
      reserve(0, 1000), fill(0, 1000, 10),
      reserve(5, 1400), fill(5, 1400, 5), // 400 km / 10 L = 40
      reserve(9, 1700), // 300 km / 5 L = 60
    ]);
    expect(efficiency(cycles)).toBe(46.67); // 700 / 15, not the mean 50
    expect(efficiency(cycles, 1)).toBe(60);
  });
});

describe("odometer projection", () => {
  // Start reading 900 km at day −1, then 1400 km exactly 11 days later.
  const events = [odo(10, 1400, 0)];

  it("computes km per day from the start reading", () => {
    expect(kmPerDay(noTank, events)).toBe(45.5); // 500 km / 11 days = 45.45
  });

  it("projects forward when the last reading is over a day old", () => {
    const estimate = currentOdometer(noTank, events, at(12, 0));
    expect(estimate.estimated).toBe(true);
    expect(estimate.odometer).toBe(14000 + 910); // 2 days × 45.5 km
  });

  it("uses the reading as is when recent", () => {
    expect(currentOdometer(noTank, events, at(10, 5))).toMatchObject({ odometer: 14000, estimated: false });
  });

  it("needs at least three days of history to project", () => {
    expect(kmPerDay(noTank, [odo(1, 1000)])).toBeNull();
  });
});

describe("calculateGauge", () => {
  // One calibrated cycle at 50 km/l, then 6 L added at the second reserve.
  const calibrated = () => [reserve(0, 1000), fill(0, 1000, 8), reserve(4, 1400), fill(4, 1400, 6)];

  it("estimates km to reserve after a reserve mark", () => {
    const gauge = calculateGauge(tank, calibrated(), at(4, 3));
    expect(gauge).toMatchObject({ status: "ok", efficiency: 50, kmToReserve: 300, reserveAtOdometer: 17000 });
  });

  it("subtracts distance ridden since the last reading", () => {
    const gauge = calculateGauge(tank, [...calibrated(), odo(5, 1500)], at(5, 3));
    // 6 L − 100 km / 50 = 4 L above reserve → 200 km
    expect(gauge).toMatchObject({ kmToReserve: 200, reserveAtOdometer: 17000, fuelAboveReserveMl: 4000 });
    expect(gauge.fillPercent).toBe(50); // (2 L reserve + 4 L) / 12 L
    expect(gauge.reserveRangeKm).toBe(100); // 2 L × 50
  });

  it("reports on-reserve with reserve km left", () => {
    const events = [...calibrated(), reserve(7, 1700), odo(7, 1730, 3)];
    const gauge = calculateGauge(tank, events, at(7, 4));
    expect(gauge).toMatchObject({ status: "on-reserve", kmToReserve: 0, reserveKmLeft: 70 });
  });

  it("treats an unresolved reserve tap as on reserve", () => {
    const gauge = calculateGauge(tank, [...calibrated(), reserve(7, null)], at(7, 1));
    expect(gauge.status).toBe("on-reserve");
  });

  it("estimates from a full tank only when tank info is known", () => {
    const events = [...calibrated(), fill(6, 1600, 5, { full: true })];
    expect(calculateGauge(noTank, events, at(6, 2)).status).toBe("needs-tank-info");
    // full = 10 L above reserve → 500 km at 50 km/l
    expect(calculateGauge(tank, events, at(6, 2))).toMatchObject({ status: "ok", kmToReserve: 500, fillPercent: 100 });
  });

  it("asks for calibration until a cycle is complete", () => {
    expect(calculateGauge(noTank, [reserve(0, 1000), fill(0, 1000, 8)], at(0, 3)).status).toBe("calibrating");
    expect(calculateGauge(noTank, [], at(0)).status).toBe("no-data");
  });

  it("raises confidence with more cycles", () => {
    expect(calculateGauge(noTank, calibrated(), at(4, 3)).confidence).toBe("medium");
    const many = [
      reserve(0, 1000), fill(0, 1000, 8), reserve(4, 1400), fill(4, 1400, 8),
      reserve(8, 1800), fill(8, 1800, 8), reserve(12, 2200), fill(12, 2200, 8),
    ];
    expect(calculateGauge(noTank, many, at(12, 3)).confidence).toBe("high");
  });
});

describe("mileageDrop", () => {
  // Builds ok cycles of 500 km at the given km/l, oldest first.
  const cycle = (kmPerL: number, n: number, status: "ok" | "implausible" = "ok") =>
    ({
      start: { id: `s${n}` }, end: { id: `e${n}` }, type: "RR", distance: 5000, addedMl: 0,
      burnedMl: (500 / kmPerL) * 1000, kmPerL, status, approx: false,
    }) as unknown as Parameters<typeof mileageDrop>[0][number];
  const series = (values: number[]) => values.map((value, index) => cycle(value, index));

  it("flags a clear drop in the latest cycles against the usual figure", () => {
    expect(mileageDrop(series([50, 50, 50, 50, 40, 40]))).toEqual({ recent: 40, usual: 50, dropPercent: 20, cycleId: "e5" });
  });

  it("ignores small dips, improvements and a single bad cycle among the last two", () => {
    expect(mileageDrop(series([50, 50, 50, 50, 46, 46]))).toBeNull(); // 8 % down
    expect(mileageDrop(series([50, 50, 50, 50, 55, 55]))).toBeNull();
    expect(mileageDrop(series([50, 50, 50, 50, 50, 38]))).toBeNull(); // latest two average ~43.2 km/l: 13.6 % down
  });

  it("needs at least four valid cycles and skips implausible ones", () => {
    expect(mileageDrop(series([50, 50, 30]))).toBeNull();
    const withBad = [cycle(50, 0), cycle(50, 1), cycle(2, 2, "implausible"), cycle(50, 3), cycle(40, 4), cycle(40, 5)];
    expect(mileageDrop(withBad)).toMatchObject({ dropPercent: 20, cycleId: "e5" });
  });
});

describe("isLowFuel", () => {
  const events = [reserve(0, 1000), fill(0, 1000, 8), reserve(4, 1400), fill(4, 1400, 6), odo(5, 1500)]; // 200 km left

  it("fires only when the estimate is within the threshold", () => {
    const gauge = calculateGauge(tank, events, at(5, 3));
    expect(isLowFuel(gauge, 200)).toBe(true);
    expect(isLowFuel(gauge, 199)).toBe(false);
    expect(isLowFuel(gauge, null)).toBe(false);
  });

  it("stays quiet on reserve and without an estimate", () => {
    expect(isLowFuel(calculateGauge(tank, [...events, reserve(7, null)], at(7, 1)), 500)).toBe(false);
    expect(isLowFuel(calculateGauge(noTank, [], at(0)), 500)).toBe(false);
  });
});

describe("service log", () => {
  const today = new Date(2026, 9, 7, 9, 0); // 7 Oct 2026, local
  const oil = { id: "i1", name: "Engine oil", intervalKm: 3000, intervalMonths: 6, baselineOdometer: 100000, baselineDate: "2026-06-01" };

  it("adds months, clamping to the end of the month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-08-15", 6)).toBe("2027-02-15");
  });

  it("counts from the starting point until a service includes the item", () => {
    const status = serviceStatus(oil, [], 120000, today); // 2000 km ridden
    expect(status).toMatchObject({ dueKm: 1000, lastOdometer: 100000, lastDate: "2026-06-01", due: false });
    expect(status.dueDays).toBe(55); // 1 Dec 2026
  });

  it("uses the furthest service, whatever order records come in", () => {
    const done = [{ odometer: 125000, occurredOn: "2026-09-01" }, { odometer: 110000, occurredOn: new Date("2026-07-01T00:00:00Z") }];
    expect(serviceStatus(oil, done, 130000, today)).toMatchObject({ lastOdometer: 125000, lastDate: "2026-09-01", dueKm: 2500 });
  });

  it("ranks the most overdue share of its interval first", () => {
    const chain = { ...oil, id: "i2", name: "Chain", intervalKm: 500, intervalMonths: null };
    const statuses = [serviceStatus(oil, [], 128500, today), serviceStatus(chain, [], 110000, today)]; // 5 % vs -100 % left
    expect(statuses.sort((a, b) => serviceUrgency(a) - serviceUrgency(b)).map((status) => status.name)).toEqual(["Chain", "Engine oil"]);
  });

  it("is due within 100 km or 14 days, and overdue goes negative", () => {
    expect(serviceStatus(oil, [], 129000, today)).toMatchObject({ dueKm: 100, due: true });
    expect(serviceStatus(oil, [], 131000, today)).toMatchObject({ dueKm: -100, due: true });
    const byTime = { ...oil, intervalKm: null, baselineDate: "2026-04-15" }; // due 15 Oct
    expect(serviceStatus(byTime, [], 999999, today)).toMatchObject({ dueKm: null, dueDays: 8, due: true });
  });
});

describe("document reminders", () => {
  const today = new Date(2026, 9, 7, 23, 30); // local time, late evening

  it("counts whole calendar days to the expiry date", () => {
    expect(daysUntil("2026-10-07T00:00:00.000Z", today)).toBe(0);
    expect(daysUntil("2026-11-06", today)).toBe(30);
    expect(daysUntil("2026-10-01", today)).toBe(-6);
  });

  it("moves through 30 days, 7 days and expired", () => {
    expect(documentStage(31)).toBeNull();
    expect(documentStage(30)).toBe("30");
    expect(documentStage(8)).toBe("30");
    expect(documentStage(7)).toBe("7");
    expect(documentStage(0)).toBe("7");
    expect(documentStage(-1)).toBe("expired");
  });
});

describe("ownershipCost", () => {
  it("adds fuel, service and expenses, biggest first, and divides by distance", () => {
    const cost = ownershipCost(
      {
        fuelPaise: 500000,
        maintenancePaise: 120000,
        repairPaise: 0,
        expenses: [{ category: "Insurance", amountPaise: 150000 }, { category: "Parking", amountPaise: 2000 }, { category: "Parking", amountPaise: 3000 }],
      },
      50000 // 5000 km
    );
    expect(cost.totalPaise).toBe(775000);
    expect(cost.perKmPaise).toBe(155); // ₹1.55 per km
    expect(cost.breakdown).toEqual([
      { label: "Fuel", paise: 500000 },
      { label: "Insurance", paise: 150000 },
      { label: "Maintenance", paise: 120000 },
      { label: "Parking", paise: 5000 },
    ]);
  });

  it("has no per-km figure before any distance or spend", () => {
    expect(ownershipCost({ fuelPaise: 1000, maintenancePaise: 0, repairPaise: 0, expenses: [] }, 0).perKmPaise).toBeNull();
    expect(ownershipCost({ fuelPaise: 0, maintenancePaise: 0, repairPaise: 0, expenses: [] }, 1000)).toEqual({ totalPaise: 0, perKmPaise: null, breakdown: [] });
  });
});

describe("calculateStats", () => {
  it("summarises spend, efficiency, cost per km and km ridden on reserve", () => {
    const events = [
      reserve(0, 1000), fill(0, 1003, 8, { rupees: 800 }),
      reserve(4, 1400), fill(4, 1410, 6, { rupees: 600 }),
    ];
    const stats = calculateStats(noTank, events, 0, at(4, 3));
    expect(stats.totalSpendPaise).toBe(140000);
    expect(stats.totalVolumeMl).toBe(14000);
    expect(stats.avgPricePaise).toBe(10000);
    expect(stats.efficiency).toBe(50);
    expect(stats.costPerKmPaise).toBe(200); // ₹100/L ÷ 50 km/l
    expect(stats.avgReserveKm).toBe(6.5); // 3 km and 10 km on reserve
    expect(stats.distance).toBe((1410 - 900) * 10);
    expect(stats.cycles).toEqual([{ date: at(4).toISOString(), kmPerL: 50, distance: 4000, type: "RR" }]);
  });

  it("ignores starting-point fills without a volume", () => {
    const start: EngineEvent = { id: "s", kind: "FILL", occurredAt: at(0), odometer: 10000, volumeMl: null, amountPaise: null, fullTank: true };
    const stats = calculateStats(noTank, [start, fill(2, 1100, 4)], 0, at(2, 3));
    expect(stats.fillCount).toBe(1);
    expect(stats.avgFillMl).toBe(4000);
  });

  it("buckets months in local time", () => {
    expect(monthKey("2026-01-31T20:00:00Z", 0)).toBe("2026-01");
    expect(monthKey("2026-01-31T20:00:00Z", -330)).toBe("2026-02");
  });
});

describe("resolveReserveOdometer", () => {
  it("uses the trip meter when given", () => {
    expect(resolveReserveOdometer(120000, 35)).toEqual({ odometer: 119965, approx: false });
  });

  it("falls back to the fill reading, marked approximate", () => {
    expect(resolveReserveOdometer(120000, null)).toEqual({ odometer: 120000, approx: true });
  });
});
