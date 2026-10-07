import { prisma } from "@/lib/prisma";
import { getOwnedVehicle, jsonError, withUser } from "@/lib/server";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  return withUser(request, "load expenses", async (user) => {
    const { id } = await context.params;
    const vehicle = await getOwnedVehicle(user.id, id);
    if (!vehicle) return jsonError("Vehicle not found", 404);

    const expenses = await prisma.expense.findMany({ where: { vehicleId: id }, orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }] });
    return Response.json({ expenses });
  });
}
