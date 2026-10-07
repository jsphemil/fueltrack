// API integration tests against a real Postgres database.
// Opt-in: TEST_DATABASE_URL=postgresql://... npm test
// The database is modified, so never point this at production.
import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";
import { randomUUID } from "node:crypto";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

let currentUser = "user-a";
jest.mock("@/lib/auth", () => ({
  getUserFromRequest: async () => ({ user: { id: currentUser, email: `${currentUser}@example.com` }, error: null, status: 200 }),
  ensureUser: async (id: string) => {
    const { prisma } = await import("@/lib/prisma");
    await prisma.user.upsert({ where: { id }, update: {}, create: { id } });
  },
}));

type Routes = {
  me: typeof import("@/app/api/me/route");
  vehicles: typeof import("@/app/api/vehicles/route");
  vehicle: typeof import("@/app/api/vehicles/[id]/route");
  timeline: typeof import("@/app/api/vehicles/[id]/events/route");
  stats: typeof import("@/app/api/vehicles/[id]/stats/route");
  events: typeof import("@/app/api/events/route");
  event: typeof import("@/app/api/events/[id]/route");
  exportCsv: typeof import("@/app/api/export/route");
};
let routes: Routes;

const req = (method: string, body?: unknown, path = "/") =>
  new Request(`http://test${path}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const json = async (response: Response) => ({ status: response.status, body: (await response.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any

describeIfDb("API", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    routes = {
      me: await import("@/app/api/me/route"),
      vehicles: await import("@/app/api/vehicles/route"),
      vehicle: await import("@/app/api/vehicles/[id]/route"),
      timeline: await import("@/app/api/vehicles/[id]/events/route"),
      stats: await import("@/app/api/vehicles/[id]/stats/route"),
      events: await import("@/app/api/events/route"),
      event: await import("@/app/api/events/[id]/route"),
      exportCsv: await import("@/app/api/export/route"),
    };
    currentUser = "user-a";
    await routes.me.DELETE(req("DELETE"));
    currentUser = "user-b";
    await routes.me.DELETE(req("DELETE"));
    currentUser = "user-a";
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$disconnect();
  });

  it("runs the reserve → fill → reserve flow end to end", async () => {
    // Vehicle starting on reserve at 1000 km, 12 L tank with 2 L reserve.
    let res = await json(await routes.vehicles.POST(req("POST", {
      name: "Splendor", kind: "Motorcycle", startOdometerKm: 1000, tankCapacityL: 12, reserveL: 2,
      initialState: "reserve", initialEventId: randomUUID(),
    })));
    expect(res.status).toBe(201);
    const vehicleId = res.body.vehicle.id as string;
    expect(res.body.vehicle.gauge.status).toBe("on-reserve");

    // Entries happen after the vehicle's starting point (created just now).
    const t = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();
    const post = (body: Record<string, unknown>) =>
      routes.events.POST(req("POST", { id: randomUUID(), vehicleId, ...body }));

    // Fill 8 L, ride 400 km, tap reserve (no odometer), then fill with a 3 km trip reading.
    expect((await post({ kind: "FILL", occurredAt: t(1), odometerKm: 1001, amount: 800, price: 100 })).status).toBe(201);
    const reserveId = randomUUID();
    expect((await routes.events.POST(req("POST", { id: reserveId, vehicleId, kind: "RESERVE", occurredAt: t(10) }))).status).toBe(201);
    res = await json(await post({ kind: "FILL", occurredAt: t(11), odometerKm: 1404, amount: 600, price: 100, reserveTripKm: 3 }));
    expect(res.status).toBe(201);
    expect(res.body.resolvedReserve).toEqual({ id: reserveId, odometer: 14010, odometerApprox: false });

    // Cycle: 1000 → 1401 km on 8 L. Then 6 L above reserve.
    res = await json(await routes.vehicles.GET(req("GET")));
    const gauge = res.body.vehicles[0].gauge;
    expect(gauge.status).toBe("ok");
    expect(gauge.efficiency).toBe(50.13); // 401 km / 8 L
    expect(gauge.kmToReserve).toBe(Math.round(6 * 50.13 - 3)); // 3 km ridden since reserve

    res = await json(await routes.timeline.GET(req("GET"), ctx(vehicleId)));
    expect(res.body.events).toHaveLength(4);
    expect(res.body.cycles[0]).toMatchObject({ type: "RR", distance: 4010, burnedMl: 8000, status: "ok" });

    res = await json(await routes.stats.GET(req("GET", undefined, "/?tzOffset=-330"), ctx(vehicleId)));
    expect(res.body.stats).toMatchObject({ totalSpendPaise: 140000, fillCount: 2, avgReserveKm: 2 }); // 1 km and 3 km on reserve
  });

  it("is idempotent for retried offline saves and checks odometer order", async () => {
    const vehicle = await json(await routes.vehicles.POST(req("POST", { name: "Activa", kind: "Scooter", startOdometerKm: 500 })));
    const vehicleId = vehicle.body.vehicle.id as string;
    const event = { id: randomUUID(), vehicleId, kind: "ODOMETER", odometerKm: 600 };

    expect((await routes.events.POST(req("POST", event))).status).toBe(201);
    const retry = await json(await routes.events.POST(req("POST", event)));
    expect(retry).toMatchObject({ status: 200, body: { duplicate: true } });

    const backwards = await json(await routes.events.POST(req("POST", { ...event, id: randomUUID(), odometerKm: 550 })));
    expect(backwards.status).toBe(400);
    expect(backwards.body.error).toMatch(/earlier reading/);

    const edit = await json(await routes.event.PATCH(req("PATCH", { odometerKm: 650 }), ctx(event.id)));
    expect(edit.body.event.odometer).toBe(6500);

    const tooHigh = await json(await routes.vehicle.PATCH(req("PATCH", { name: "Activa", kind: "Scooter", startOdometerKm: 700 }), ctx(vehicleId)));
    expect(tooHigh.status).toBe(400);
  });

  it("keeps users' data separate", async () => {
    const mine = await json(await routes.vehicles.GET(req("GET")));
    const vehicleId = mine.body.vehicles[0].id as string;

    currentUser = "user-b";
    expect((await routes.timeline.GET(req("GET"), ctx(vehicleId))).status).toBe(404);
    expect((await routes.events.POST(req("POST", { id: randomUUID(), vehicleId, kind: "ODOMETER", odometerKm: 5000 }))).status).toBe(404);
    expect((await routes.vehicle.DELETE(req("DELETE"), ctx(vehicleId))).status).toBe(404);
    currentUser = "user-a";
  });

  it("exports CSV, deletes a vehicle with its entries and wipes all data", async () => {
    const csv = await routes.exportCsv.GET(req("GET"));
    expect(await csv.text()).toMatch(/^vehicle,type,date/);

    const list = await json(await routes.vehicles.GET(req("GET")));
    const [first, second] = list.body.vehicles;
    expect((await routes.vehicle.DELETE(req("DELETE"), ctx(first.id))).status).toBe(200);
    expect((await routes.timeline.GET(req("GET"), ctx(first.id))).status).toBe(404);

    expect((await routes.me.DELETE(req("DELETE"))).status).toBe(200);
    expect((await routes.timeline.GET(req("GET"), ctx(second.id))).status).toBe(404);
    const me = await json(await routes.me.GET(req("GET")));
    expect(me.body.user.vehicleCount).toBe(0);
  });
});
