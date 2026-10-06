import { describe, expect, it } from "@jest/globals";
import {
  calculateFuelVolume,
  checkOdometerOrder,
  parseFuelEntryInput,
  parseProfileInput,
  parseVehicleInput,
} from "@/lib/validation";

const now = new Date("2026-03-01T12:00:00Z");

describe("parseFuelEntryInput", () => {
  const valid = {
    vehicleId: "v1",
    odometer: 1200,
    fuel_price: 100,
    amount_paid: 500,
    is_reserve: true,
    filled_at: "2026-02-28T08:00:00Z",
  };

  it("accepts valid input and computes fuel volume on the server", () => {
    const result = parseFuelEntryInput({ ...valid, fuel_volume: 999 }, now);

    expect(result).toEqual({
      ok: true,
      value: {
        vehicleId: "v1",
        odometer: 1200,
        fuel_price: 100,
        amount_paid: 500,
        fuel_volume: 5,
        is_reserve: true,
        filled_at: new Date("2026-02-28T08:00:00Z"),
      },
    });
  });

  it("defaults the fill date to now", () => {
    const result = parseFuelEntryInput({ ...valid, filled_at: undefined }, now);
    expect(result.ok && result.value.filled_at).toEqual(now);
  });

  it.each([
    ["missing vehicle", { vehicleId: "" }],
    ["negative odometer", { odometer: -1 }],
    ["empty odometer", { odometer: "" }],
    ["zero price", { fuel_price: 0 }],
    ["negative amount", { amount_paid: -10 }],
    ["non-numeric amount", { amount_paid: "abc" }],
    ["invalid date", { filled_at: "not-a-date" }],
    ["future date", { filled_at: "2026-03-02T12:00:00Z" }],
  ])("rejects %s", (_label, override) => {
    expect(parseFuelEntryInput({ ...valid, ...override }, now).ok).toBe(false);
  });

  it("rejects a missing body", () => {
    expect(parseFuelEntryInput(null, now).ok).toBe(false);
  });
});

describe("calculateFuelVolume", () => {
  it("divides amount by price and rounds to 3 decimals", () => {
    expect(calculateFuelVolume(1000, 102.45)).toBe(9.761);
  });

  it("returns 0 for invalid values", () => {
    expect(calculateFuelVolume(100, 0)).toBe(0);
    expect(calculateFuelVolume(-5, 100)).toBe(0);
    expect(calculateFuelVolume(Number.NaN, 100)).toBe(0);
  });
});

describe("parseVehicleInput", () => {
  it("accepts and trims valid input", () => {
    expect(parseVehicleInput({ name: " Classic 350 ", vehicleType: "Bike", initial_odometer: 0 })).toEqual({
      ok: true,
      value: { name: "Classic 350", vehicleType: "Bike", initial_odometer: 0 },
    });
  });

  it("rejects missing name, type and negative odometer", () => {
    expect(parseVehicleInput({ name: "", vehicleType: "Bike", initial_odometer: 0 }).ok).toBe(false);
    expect(parseVehicleInput({ name: "A", vehicleType: " ", initial_odometer: 0 }).ok).toBe(false);
    expect(parseVehicleInput({ name: "A", vehicleType: "Bike", initial_odometer: -5 }).ok).toBe(false);
    expect(parseVehicleInput({ name: "A", vehicleType: "Bike" }).ok).toBe(false);
  });
});

describe("parseProfileInput", () => {
  it("normalises whitespace", () => {
    expect(parseProfileInput({ name: "  Jane   Doe " })).toEqual({ ok: true, value: { name: "Jane Doe" } });
  });

  it("rejects empty and overly long names", () => {
    expect(parseProfileInput({ name: "   " }).ok).toBe(false);
    expect(parseProfileInput({ name: "x".repeat(51) }).ok).toBe(false);
  });
});

describe("checkOdometerOrder", () => {
  const others = [
    { odometer: 1100, filled_at: new Date("2026-01-01T00:00:00Z") },
    { odometer: 1500, filled_at: new Date("2026-01-10T00:00:00Z") },
  ];

  it("requires the first entry to exceed the initial odometer", () => {
    const base = { filledAt: new Date("2026-01-01T00:00:00Z"), initialOdometer: 1000, otherEntries: [] };
    expect(checkOdometerOrder({ ...base, odometer: 1000 }).ok).toBe(false);
    expect(checkOdometerOrder({ ...base, odometer: 1001 }).ok).toBe(true);
  });

  it("accepts a reading between neighbouring fills (back-dated entry)", () => {
    expect(
      checkOdometerOrder({ odometer: 1300, filledAt: new Date("2026-01-05T00:00:00Z"), initialOdometer: 1000, otherEntries: others }).ok
    ).toBe(true);
  });

  it("rejects readings out of order with their neighbours", () => {
    const filledAt = new Date("2026-01-05T00:00:00Z");
    expect(checkOdometerOrder({ odometer: 1100, filledAt, initialOdometer: 1000, otherEntries: others }).ok).toBe(false);
    expect(checkOdometerOrder({ odometer: 1500, filledAt, initialOdometer: 1000, otherEntries: others }).ok).toBe(false);
  });

  it("requires a new latest entry to exceed the latest reading", () => {
    const filledAt = new Date("2026-01-20T00:00:00Z");
    expect(checkOdometerOrder({ odometer: 1400, filledAt, initialOdometer: 1000, otherEntries: others }).ok).toBe(false);
    expect(checkOdometerOrder({ odometer: 1600, filledAt, initialOdometer: 1000, otherEntries: others }).ok).toBe(true);
  });
});
