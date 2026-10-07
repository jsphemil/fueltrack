import { prisma } from "@/lib/prisma";
import { getOwnedVehicle, jsonError, withUser } from "@/lib/server";
import { parseServiceRecordInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withUser(request, "save service", async (user) => {
    const parsed = parseServiceRecordInput(await readJsonBody(request));
    if (!parsed.ok) return jsonError(parsed.error, 400);

    const { itemIds, issueIds, vehicleId, kind, occurredOn, odometer, costPaise, note } = parsed.value;
    const vehicle = await getOwnedVehicle(user.id, vehicleId);
    if (!vehicle) return jsonError("Vehicle not found", 404);
    if (odometer < vehicle.startOdometer) return jsonError("Odometer can't be below the vehicle's starting odometer", 400);

    const ownedItems = await prisma.serviceItem.count({ where: { id: { in: itemIds }, vehicleId: vehicle.id } });
    if (ownedItems !== itemIds.length) return jsonError("Service item not found", 404);
    const openIssues = await prisma.issue.count({ where: { id: { in: issueIds }, vehicleId: vehicle.id, recordId: null } });
    if (openIssues !== issueIds.length) return jsonError("Issue not found or already fixed", 404);

    const record = await prisma.serviceRecord.create({
      data: {
        userId: user.id,
        vehicleId,
        kind,
        occurredOn,
        odometer,
        costPaise,
        note,
        items: { create: itemIds.map((itemId) => ({ itemId })) },
        issues: { connect: issueIds.map((id) => ({ id })) },
      },
    });
    return Response.json({ record }, { status: 201 });
  });
}
