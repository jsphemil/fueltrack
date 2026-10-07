import { prisma } from "@/lib/prisma";
import { getOwnedVehicle, jsonError, withUser } from "@/lib/server";
import { parseServiceRecordInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withUser(request, "save service", async (user) => {
    const parsed = parseServiceRecordInput(await readJsonBody(request));
    if (!parsed.ok) return jsonError(parsed.error, 400);

    const { itemIds, ...data } = parsed.value;
    const vehicle = await getOwnedVehicle(user.id, data.vehicleId);
    if (!vehicle) return jsonError("Vehicle not found", 404);
    if (data.odometer < vehicle.startOdometer) return jsonError("Odometer can't be below the vehicle's starting odometer", 400);

    const owned = await prisma.serviceItem.count({ where: { id: { in: itemIds }, vehicleId: vehicle.id } });
    if (owned !== itemIds.length) return jsonError("Service item not found", 404);

    const record = await prisma.serviceRecord.create({
      data: { ...data, userId: user.id, items: { create: itemIds.map((itemId) => ({ itemId })) } },
    });
    return Response.json({ record }, { status: 201 });
  });
}
