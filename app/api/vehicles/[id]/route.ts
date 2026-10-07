import { prisma } from "@/lib/prisma";
import { getOwnedVehicle, getVehicleEvents, jsonError, STARTING_POINT_NOTE, summarizeVehicle, withUser } from "@/lib/server";
import { parseVehicleInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  return withUser(request, "update vehicle", async (user) => {
    const { id } = await context.params;
    const vehicle = await getOwnedVehicle(user.id, id);
    if (!vehicle) return jsonError("Vehicle not found", 404);

    const body = await readJsonBody(request);

    // Archive toggle on its own.
    if (body && typeof body.archived === "boolean" && body.name === undefined) {
      const updated = await prisma.vehicle.update({ where: { id }, data: { archived: body.archived } });
      return Response.json({ vehicle: summarizeVehicle(updated, await getVehicleEvents(id)) });
    }

    const parsed = parseVehicleInput(body);
    if (!parsed.ok) return jsonError(parsed.error, 400);

    const firstReading = await prisma.event.findFirst({
      where: {
        vehicleId: id,
        odometer: { not: null },
        OR: [{ note: null }, { note: { not: STARTING_POINT_NOTE } }],
      },
      orderBy: { odometer: "asc" },
      select: { odometer: true },
    });
    if (firstReading?.odometer != null && parsed.value.startOdometer > firstReading.odometer) {
      return jsonError(
        `Starting odometer can't be above your first logged reading (${(firstReading.odometer / 10).toLocaleString("en-IN")} km)`,
        400
      );
    }

    // The starting-point entry follows the vehicle's start odometer.
    const [updated] = await prisma.$transaction([
      prisma.vehicle.update({ where: { id }, data: parsed.value }),
      prisma.event.updateMany({
        where: { vehicleId: id, note: STARTING_POINT_NOTE },
        data: { odometer: parsed.value.startOdometer },
      }),
    ]);
    return Response.json({ vehicle: summarizeVehicle(updated, await getVehicleEvents(id)) });
  });
}

export async function DELETE(request: Request, context: Context) {
  return withUser(request, "delete vehicle", async (user) => {
    const { id } = await context.params;
    const result = await prisma.vehicle.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return jsonError("Vehicle not found", 404);
    return Response.json({ success: true });
  });
}
