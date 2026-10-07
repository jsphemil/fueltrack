import { calculateStats, ownershipCost } from "@/lib/engine";
import { prisma } from "@/lib/prisma";
import { getOwnedVehicle, getVehicleEvents, jsonError, toEngineVehicle, withUser } from "@/lib/server";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

// Offset in minutes as returned by Date#getTimezoneOffset.
function parseTimezoneOffset(value: string | null) {
  const offset = Number(value);
  return Number.isFinite(offset) && Math.abs(offset) <= 14 * 60 ? offset : 0;
}

export async function GET(request: Request, context: Context) {
  return withUser(request, "load stats", async (user) => {
    const { id } = await context.params;
    const vehicle = await getOwnedVehicle(user.id, id);
    if (!vehicle) return jsonError("Vehicle not found", 404);

    const tzOffset = parseTimezoneOffset(new URL(request.url).searchParams.get("tzOffset"));
    const stats = calculateStats(toEngineVehicle(vehicle), await getVehicleEvents(id), tzOffset);

    const [services, expenses] = await Promise.all([
      prisma.serviceRecord.groupBy({ by: ["kind"], where: { vehicleId: id }, _sum: { costPaise: true } }),
      prisma.expense.groupBy({ by: ["category"], where: { vehicleId: id }, _sum: { amountPaise: true } }),
    ]);
    const serviceCost = (kind: string) => services.find((row) => row.kind === kind)?._sum.costPaise ?? 0;
    const ownership = ownershipCost(
      {
        fuelPaise: stats.totalSpendPaise,
        maintenancePaise: serviceCost("MAINTENANCE"),
        repairPaise: serviceCost("REPAIR"),
        expenses: expenses.map((row) => ({ category: row.category, amountPaise: row._sum.amountPaise ?? 0 })),
      },
      stats.distance
    );
    return Response.json({ stats, ownership });
  });
}
