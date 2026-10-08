import { prisma } from "@/lib/prisma";
import { getOwnedVehicle, jsonError, withUser } from "@/lib/server";
import { parseServiceRecordInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

// Edits a visit. It stays on the same vehicle; items and fixed issues are replaced by the new lists.
export async function PATCH(request: Request, context: Context) {
  return withUser(request, "update service", async (user) => {
    const { id } = await context.params;
    const existing = await prisma.serviceRecord.findFirst({ where: { id, userId: user.id } });
    if (!existing) return jsonError("Service not found", 404);

    const parsed = parseServiceRecordInput({ ...(await readJsonBody(request)), vehicleId: existing.vehicleId });
    if (!parsed.ok) return jsonError(parsed.error, 400);

    const { itemIds, issueIds, kind, occurredOn, odometer, costPaise, note } = parsed.value;
    const vehicle = await getOwnedVehicle(user.id, existing.vehicleId);
    if (!vehicle) return jsonError("Vehicle not found", 404);
    if (odometer < vehicle.startOdometer) return jsonError("Odometer can't be below the vehicle's starting odometer", 400);

    const ownedItems = await prisma.serviceItem.count({ where: { id: { in: itemIds }, vehicleId: vehicle.id } });
    if (ownedItems !== itemIds.length) return jsonError("Service item not found", 404);
    // Issues this visit already fixed stay selectable, along with the still-open ones.
    const usableIssues = await prisma.issue.count({
      where: { id: { in: issueIds }, vehicleId: vehicle.id, OR: [{ recordId: null }, { recordId: id }] },
    });
    if (usableIssues !== issueIds.length) return jsonError("Issue not found or already fixed", 404);

    const record = await prisma.serviceRecord.update({
      where: { id },
      data: {
        kind,
        occurredOn,
        odometer,
        costPaise,
        note,
        items: { deleteMany: {}, create: itemIds.map((itemId) => ({ itemId })) },
        issues: { set: issueIds.map((issueId) => ({ id: issueId })) }, // issues left out reopen
      },
    });
    return Response.json({ record });
  });
}

export async function DELETE(request: Request, context: Context) {
  return withUser(request, "delete service", async (user) => {
    const { id } = await context.params;
    const result = await prisma.serviceRecord.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return jsonError("Service not found", 404);
    return Response.json({ success: true });
  });
}
