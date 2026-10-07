import { prisma } from "@/lib/prisma";
import { getOwnedVehicle, jsonError, withUser } from "@/lib/server";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

// Service history for one vehicle, newest first, with what was done and fixed.
export async function GET(request: Request, context: Context) {
  return withUser(request, "load service history", async (user) => {
    const { id } = await context.params;
    const vehicle = await getOwnedVehicle(user.id, id);
    if (!vehicle) return jsonError("Vehicle not found", 404);

    const records = await prisma.serviceRecord.findMany({
      where: { vehicleId: id },
      orderBy: [{ occurredOn: "desc" }, { odometer: "desc" }],
      include: {
        items: { select: { item: { select: { id: true, name: true } } } },
        issues: { select: { id: true, title: true } },
      },
    });
    return Response.json({
      records: records.map(({ items, ...record }) => ({ ...record, items: items.map(({ item }) => item) })),
    });
  });
}
