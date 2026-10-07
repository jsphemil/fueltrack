import { describe, expect, it } from "@jest/globals";

import {
  checkOdometerOrder,
  parseFillInput,
  parseOdometerInput,
  parseDocumentInput,
  parseExpenseInput,
  parseIssueInput,
  parseLowFuelInput,
  parseProfileInput,
  parseServiceItemInput,
  parseServiceRecordInput,
  parseReserveInput,
  parseVehicleInput,
} from "@/lib/validation";
import { amountFromVolume, priceFromAmount, volumeFromAmount } from "@/lib/units";

const now = new Date("2026-08-10T12:00:00Z");
const id = "0b7a6a1e-3f7c-4d4b-9a51-2c3d4e5f6a7b";
const base = { id, vehicleId: "v1", occurredAt: "2026-08-10T09:00:00Z", odometerKm: "12345.6" };

describe("units", () => {
  it("converts between amount, price and volume exactly", () => {
    expect(volumeFromAmount(50000, 10245)).toBe(4880); // ₹500 at ₹102.45 → 4.880 L
    expect(amountFromVolume(4880, 10245)).toBe(49996);
    expect(priceFromAmount(50000, 5000)).toBe(10000);
  });
});

describe("parseFillInput", () => {
  it("computes litres from amount and price", () => {
    const result = parseFillInput({ ...base, amount: "500", price: "102.45", fullTank: true }, now);
    expect(result).toEqual({
      ok: true,
      value: {
        id,
        vehicleId: "v1",
        occurredAt: new Date("2026-08-10T09:00:00Z"),
        odometer: 123456,
        volumeMl: 4880,
        amountPaise: 50000,
        pricePaise: 10245,
        fullTank: true,
        note: null,
        reserveTrip: null,
      },
    });
  });

  it("computes amount from litres and price, and price from amount and litres", () => {
    const fromLitres = parseFillInput({ ...base, litres: "5", price: "100" }, now);
    expect(fromLitres.ok && fromLitres.value.amountPaise).toBe(50000);
    const fromAmount = parseFillInput({ ...base, litres: "4", amount: "420" }, now);
    expect(fromAmount.ok && fromAmount.value.pricePaise).toBe(10500);
  });

  it("accepts all three when they agree within ₹1, rejects when they don't", () => {
    expect(parseFillInput({ ...base, amount: "500", price: "102.45", litres: "4.88" }, now).ok).toBe(true);
    expect(parseFillInput({ ...base, amount: "500", price: "102.45", litres: "5.5" }, now).ok).toBe(false);
  });

  it("parses the trip-meter reading for an open reserve mark", () => {
    const result = parseFillInput({ ...base, amount: "200", price: "100", reserveTripKm: "3.5" }, now);
    expect(result.ok && result.value.reserveTrip).toBe(35);
  });

  it.each([
    ["only one of amount/price/litres", { amount: "500" }],
    ["zero amount", { amount: "0", price: "100" }],
    ["negative price", { amount: "500", price: "-1" }],
    ["negative odometer", { amount: "500", price: "100", odometerKm: "-5" }],
    ["missing odometer", { amount: "500", price: "100", odometerKm: "" }],
    ["future date", { amount: "500", price: "100", occurredAt: "2026-08-11T12:00:00Z" }],
    ["invalid id", { amount: "500", price: "100", id: "abc" }],
    ["missing vehicle", { amount: "500", price: "100", vehicleId: "" }],
    ["trip reading too large", { amount: "500", price: "100", reserveTripKm: "900" }],
  ])("rejects %s", (_label, override) => {
    expect(parseFillInput({ ...base, ...override }, now).ok).toBe(false);
  });
});

describe("parseReserveInput and parseOdometerInput", () => {
  it("allows a reserve mark without an odometer reading", () => {
    const result = parseReserveInput({ id, vehicleId: "v1" }, now);
    expect(result).toEqual({ ok: true, value: { id, vehicleId: "v1", occurredAt: now, odometer: null } });
  });

  it("requires a reading for an odometer update", () => {
    expect(parseOdometerInput({ id, vehicleId: "v1" }, now).ok).toBe(false);
    expect(parseOdometerInput({ id, vehicleId: "v1", odometerKm: 1500 }, now).ok).toBe(true);
  });
});

describe("parseVehicleInput", () => {
  const vehicle = { name: " Splendor ", kind: "Motorcycle", startOdometerKm: "1200" };

  it("accepts a vehicle without tank info", () => {
    expect(parseVehicleInput(vehicle)).toEqual({
      ok: true,
      value: { name: "Splendor", kind: "Motorcycle", startOdometer: 12000, tankCapacityMl: null, reserveMl: null },
    });
  });

  it("validates tank capacity and reserve", () => {
    expect(parseVehicleInput({ ...vehicle, tankCapacityL: "9.8", reserveL: "1.5" })).toMatchObject({
      ok: true,
      value: { tankCapacityMl: 9800, reserveMl: 1500 },
    });
    expect(parseVehicleInput({ ...vehicle, tankCapacityL: "5", reserveL: "6" }).ok).toBe(false);
    expect(parseVehicleInput({ ...vehicle, tankCapacityL: "0.5" }).ok).toBe(false);
    expect(parseVehicleInput({ ...vehicle, kind: "Truck" }).ok).toBe(false);
    expect(parseVehicleInput({ ...vehicle, name: "" }).ok).toBe(false);
  });
});

describe("parseProfileInput", () => {
  it("normalises whitespace and limits length", () => {
    expect(parseProfileInput({ name: "  Jane   Doe " })).toEqual({ ok: true, value: { name: "Jane Doe" } });
    expect(parseProfileInput({ name: "x".repeat(51) }).ok).toBe(false);
  });
});

describe("parseServiceItemInput", () => {
  it("needs a name and at least one interval", () => {
    expect(parseServiceItemInput({ name: " Engine  oil ", intervalKm: "3000", lastDoneKm: "1500.5", lastDoneOn: "2026-09-01" })).toEqual({
      ok: true,
      value: { name: "Engine oil", intervalKm: 3000, intervalMonths: null, baselineOdometer: 15005, baselineDate: new Date("2026-09-01T00:00:00Z") },
    });
    expect(parseServiceItemInput({ name: "Coolant", intervalMonths: "24" })).toMatchObject({ ok: true, value: { baselineOdometer: null, baselineDate: null } });
    expect(parseServiceItemInput({ name: "Oil" }).ok).toBe(false);
    expect(parseServiceItemInput({ name: "", intervalKm: "3000" }).ok).toBe(false);
    for (const intervalKm of ["0", "2500.5", "-1", "100001"]) {
      expect(parseServiceItemInput({ name: "Oil", intervalKm }).ok).toBe(false);
    }
    expect(parseServiceItemInput({ name: "Oil", intervalMonths: "121" }).ok).toBe(false);
  });
});

describe("parseServiceRecordInput", () => {
  const record = { vehicleId: id, kind: "MAINTENANCE", occurredOn: "2026-08-10", odometerKm: "12345.6", costRupees: "850.50", itemIds: [id, id], note: "" };

  it("stores odometer in tenths, cost in paise and de-duplicates items", () => {
    expect(parseServiceRecordInput(record, now)).toEqual({
      ok: true,
      value: {
        vehicleId: id, kind: "MAINTENANCE", occurredOn: new Date("2026-08-10T00:00:00Z"), odometer: 123456, costPaise: 85050,
        itemIds: [id], issueIds: [], note: null,
      },
    });
    expect(parseServiceRecordInput({ ...record, costRupees: "" }, now)).toMatchObject({ ok: true, value: { costPaise: null } });
  });

  it("rejects missing items, future dates and negative cost", () => {
    expect(parseServiceRecordInput({ ...record, itemIds: [] }, now).ok).toBe(false);
    expect(parseServiceRecordInput({ ...record, itemIds: ["x"] }, now).ok).toBe(false);
    expect(parseServiceRecordInput({ ...record, occurredOn: "2026-08-12" }, now).ok).toBe(false);
    expect(parseServiceRecordInput({ ...record, costRupees: "-1" }, now).ok).toBe(false);
    expect(parseServiceRecordInput({ ...record, odometerKm: "" }, now).ok).toBe(false);
    expect(parseServiceRecordInput({ ...record, kind: "WASH" }, now).ok).toBe(false);
  });

  it("lets a repair fix issues, or be described in the note", () => {
    const repair = { ...record, kind: "REPAIR", itemIds: [] };
    expect(parseServiceRecordInput({ ...repair, issueIds: [id] }, now)).toMatchObject({ ok: true, value: { kind: "REPAIR", issueIds: [id], itemIds: [] } });
    expect(parseServiceRecordInput({ ...repair, note: "Replaced clutch cable" }, now).ok).toBe(true);
    expect(parseServiceRecordInput(repair, now).ok).toBe(false);
    expect(parseServiceRecordInput({ ...record, itemIds: [], note: "Oil top-up" }, now).ok).toBe(false); // maintenance needs an item
    expect(parseServiceRecordInput({ ...repair, issueIds: ["x"] }, now).ok).toBe(false);
  });
});

describe("parseExpenseInput", () => {
  const expense = { vehicleId: id, category: "Parking", occurredOn: "2026-08-10", amountRupees: "40.5", note: " Mall " };

  it("stores the amount in paise", () => {
    expect(parseExpenseInput(expense, now)).toEqual({
      ok: true,
      value: { vehicleId: id, category: "Parking", occurredOn: new Date("2026-08-10T00:00:00Z"), amountPaise: 4050, note: "Mall" },
    });
  });

  it("rejects unknown categories, empty or negative amounts and future dates", () => {
    expect(parseExpenseInput({ ...expense, category: "Snacks" }, now).ok).toBe(false);
    for (const amountRupees of ["", "0", "-5", "abc", "1000001"]) {
      expect(parseExpenseInput({ ...expense, amountRupees }, now).ok).toBe(false);
    }
    expect(parseExpenseInput({ ...expense, occurredOn: "2026-08-12" }, now).ok).toBe(false);
  });
});

describe("parseIssueInput", () => {
  it("needs a short description and a date that isn't in the future", () => {
    expect(parseIssueInput({ title: "  Front  brake squeals ", notedOn: "2026-08-09" }, now)).toEqual({
      ok: true,
      value: { title: "Front brake squeals", notedOn: new Date("2026-08-09T00:00:00Z") },
    });
    expect(parseIssueInput({ title: "", notedOn: "2026-08-09" }, now).ok).toBe(false);
    expect(parseIssueInput({ title: "x".repeat(81), notedOn: "2026-08-09" }, now).ok).toBe(false);
    expect(parseIssueInput({ title: "Noise", notedOn: "2026-08-12" }, now).ok).toBe(false);
  });
});

describe("parseDocumentInput", () => {
  const doc = { kind: "Insurance", vehicleId: id, expiresOn: "2027-03-31", note: " Policy 123 " };

  it("stores the expiry as UTC midnight and allows personal documents", () => {
    expect(parseDocumentInput(doc)).toEqual({
      ok: true,
      value: { kind: "Insurance", vehicleId: id, expiresOn: new Date("2027-03-31T00:00:00Z"), note: "Policy 123" },
    });
    expect(parseDocumentInput({ ...doc, kind: "Licence", vehicleId: "" })).toMatchObject({ ok: true, value: { vehicleId: null } });
  });

  it("rejects bad kinds, vehicle ids and dates", () => {
    expect(parseDocumentInput({ ...doc, kind: "Passport" }).ok).toBe(false);
    expect(parseDocumentInput({ ...doc, vehicleId: "v1" }).ok).toBe(false);
    for (const expiresOn of ["", "2027-02-30", "31/03/2027", "2027-3-31"]) {
      expect(parseDocumentInput({ ...doc, expiresOn }).ok).toBe(false);
    }
  });
});

describe("parseLowFuelInput", () => {
  it("accepts whole km in range or null to turn off", () => {
    expect(parseLowFuelInput({ lowFuelKm: "30" })).toEqual({ ok: true, value: { lowFuelKm: 30 } });
    expect(parseLowFuelInput({ lowFuelKm: null })).toEqual({ ok: true, value: { lowFuelKm: null } });
    for (const lowFuelKm of [0, -5, 12.5, 501, "", "abc", undefined]) {
      expect(parseLowFuelInput({ lowFuelKm }).ok).toBe(false);
    }
  });
});

describe("checkOdometerOrder", () => {
  const otherEvents = [
    { odometer: 11000, occurredAt: new Date("2026-08-01T00:00:00Z") },
    { odometer: null, occurredAt: new Date("2026-08-03T00:00:00Z") },
    { odometer: 15000, occurredAt: new Date("2026-08-05T00:00:00Z") },
  ];
  const check = (odometer: number, day: string) =>
    checkOdometerOrder({ odometer, occurredAt: new Date(`2026-08-${day}T00:00:00Z`), startOdometer: 10000, otherEvents }).ok;

  it("accepts readings between neighbours, including equal readings", () => {
    expect(check(12000, "03")).toBe(true);
    expect(check(11000, "02")).toBe(true);
    expect(check(15000, "04")).toBe(true);
  });

  it("rejects readings that go backwards", () => {
    expect(check(10900, "02")).toBe(false);
    expect(check(15100, "04")).toBe(false);
    expect(check(14000, "06")).toBe(false);
    expect(checkOdometerOrder({ odometer: 9000, occurredAt: new Date(), startOdometer: 10000, otherEvents: [] }).ok).toBe(false);
  });
});
