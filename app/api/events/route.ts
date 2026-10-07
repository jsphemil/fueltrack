import { prisma } from "@/lib/prisma";
import {
  checkEventOdometer,
  getOwnedVehicle,
  jsonError,
  parseEvent,
  parseEventKind,
  planReserveResolution,
  withUser,
} from "@/lib/server";
import { readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

// Creates a fill, reserve mark or odometer reading. Ids come from the client,
// so retrying an offline save returns the existing event instead of a duplicate.
export async function POST(request: Request) {
  return withUser(request, "save entry", async (user) => {
    const body = await readJsonBody(request);
    const kind = parseEventKind(body?.kind);
    if (!kind) return jsonError("Unknown entry type", 400);

    const parsed = parseEvent(kind, body);
    if (!parsed.ok) return jsonError(parsed.error, 400);
    const input = parsed.value;

    const existing = await prisma.event.findUnique({ where: { id: input.id } });
    if (existing) {
      return existing.userId === user.id
        ? Response.json({ event: existing, duplicate: true }, { status: 200 })
        : jsonError("Entry id already used", 409);
    }

    const vehicle = await getOwnedVehicle(user.id, input.vehicleId);
    if (!vehicle) return jsonError("Vehicle not found", 404);

    const others = await prisma.event.findMany({ where: { vehicleId: vehicle.id } });
    const order = checkEventOdometer(vehicle, others, input.odometer, input.occurredAt);
    if (!order.ok) return jsonError(order.error, 400);

    const resolution =
      kind === "FILL"
        ? planReserveResolution(vehicle, others, { occurredAt: input.occurredAt, odometer: input.odometer as number }, input.reserveTrip)
        : ({ ok: true, value: null } as const);
    if (!resolution.ok) return jsonError(resolution.error, 400);

    const [event] = await prisma.$transaction([
      prisma.event.create({
        data: { id: input.id, userId: user.id, vehicleId: vehicle.id, kind, ...input.data },
      }),
      ...(resolution.value
        ? [
            prisma.event.update({
              where: { id: resolution.value.id },
              data: { odometer: resolution.value.odometer, odometerApprox: resolution.value.odometerApprox },
            }),
          ]
        : []),
    ]);

    return Response.json({ event, resolvedReserve: resolution.value }, { status: 201 });
  });
}
