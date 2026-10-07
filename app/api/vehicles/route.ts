import { ensureUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVehicleEvents, jsonError, STARTING_POINT_NOTE, summarizeVehicle, withUser } from "@/lib/server";
import { isUuid, parseVehicleInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

const INITIAL_STATES = ["full", "reserve", "unknown"] as const;

export async function GET(request: Request) {
  return withUser(request, "load vehicles", async (user) => {
    const vehicles = await prisma.vehicle.findMany({
      where: { userId: user.id },
      orderBy: [{ archived: "asc" }, { createdAt: "asc" }],
      include: { events: true },
    });
    const now = new Date();
    return Response.json({
      vehicles: vehicles.map(({ events, ...vehicle }) => summarizeVehicle(vehicle, events, now)),
    });
  });
}

// Creates a vehicle, optionally with its current fuel state as a starting point
// so estimates can begin straight away.
export async function POST(request: Request) {
  return withUser(request, "save vehicle", async (user) => {
    const body = await readJsonBody(request);
    const parsed = parseVehicleInput(body);
    if (!parsed.ok) return jsonError(parsed.error, 400);

    const initialState = INITIAL_STATES.find((state) => state === body?.initialState) ?? "unknown";
    if (initialState !== "unknown" && !isUuid(body?.initialEventId)) {
      return jsonError("Starting point id is invalid", 400);
    }

    await ensureUser(user.id);
    const vehicle = await prisma.vehicle.create({ data: { userId: user.id, ...parsed.value } });

    if (initialState !== "unknown") {
      await prisma.event.create({
        data: {
          id: body?.initialEventId as string,
          userId: user.id,
          vehicleId: vehicle.id,
          kind: initialState === "full" ? "FILL" : "RESERVE",
          occurredAt: vehicle.createdAt,
          odometer: vehicle.startOdometer,
          fullTank: initialState === "full",
          note: STARTING_POINT_NOTE,
        },
      });
    }

    const events = await getVehicleEvents(vehicle.id);
    return Response.json({ vehicle: summarizeVehicle(vehicle, events) }, { status: 201 });
  });
}
