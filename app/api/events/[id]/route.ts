import { prisma } from "@/lib/prisma";
import { checkEventOdometer, getOwnedVehicle, jsonError, parseEvent, withUser } from "@/lib/server";
import { readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

// Edits an entry. Its type and vehicle stay the same.
export async function PATCH(request: Request, context: Context) {
  return withUser(request, "update entry", async (user) => {
    const { id } = await context.params;
    const existing = await prisma.event.findFirst({ where: { id, userId: user.id } });
    if (!existing) return jsonError("Entry not found", 404);

    const body = await readJsonBody(request);
    const parsed = parseEvent(existing.kind, { ...body, id, vehicleId: existing.vehicleId });
    if (!parsed.ok) return jsonError(parsed.error, 400);

    const vehicle = await getOwnedVehicle(user.id, existing.vehicleId);
    if (!vehicle) return jsonError("Vehicle not found", 404);

    const others = await prisma.event.findMany({ where: { vehicleId: vehicle.id, id: { not: id } } });
    const order = checkEventOdometer(vehicle, others, parsed.value.odometer, parsed.value.occurredAt);
    if (!order.ok) return jsonError(order.error, 400);

    const event = await prisma.event.update({ where: { id }, data: parsed.value.data });
    return Response.json({ event });
  });
}

export async function DELETE(request: Request, context: Context) {
  return withUser(request, "delete entry", async (user) => {
    const { id } = await context.params;
    const result = await prisma.event.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return jsonError("Entry not found", 404);
    return Response.json({ success: true });
  });
}
