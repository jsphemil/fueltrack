import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { buildMonthly, type MileageEntry, type MonthlySummary } from "@/lib/mileage";

export const runtime = "nodejs";

type VehicleMonthlyAnalytics = {
  vehicleId: string;
  monthly: MonthlySummary[];
};

// Offset in minutes as returned by Date#getTimezoneOffset; clamp to valid range.
function parseTimezoneOffset(value: string | null) {
  const offset = Number(value);
  return Number.isFinite(offset) && Math.abs(offset) <= 14 * 60 ? offset : 0;
}

export async function GET(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    const { searchParams } = new URL(request.url);
    const vehicleIdFilter = searchParams.get("vehicleId");
    const tzOffset = parseTimezoneOffset(searchParams.get("tzOffset"));

    const entries = await prisma.fuelEntry.findMany({
      where: {
        userId: user.id,
        ...(vehicleIdFilter ? { vehicleId: vehicleIdFilter } : {}),
      },
      select: {
        vehicleId: true,
        odometer: true,
        fuel_volume: true,
        amount_paid: true,
        is_reserve: true,
        filled_at: true,
      },
    });

    const groupedByVehicle = new Map<string, MileageEntry[]>();

    for (const entry of entries) {
      if (!entry.vehicleId) {
        continue;
      }
      const existing = groupedByVehicle.get(entry.vehicleId) ?? [];
      existing.push(entry);
      groupedByVehicle.set(entry.vehicleId, existing);
    }

    const monthly: VehicleMonthlyAnalytics[] = [...groupedByVehicle.entries()].map(
      ([vehicleId, vehicleEntries]) => ({
        vehicleId,
        monthly: buildMonthly(vehicleEntries, tzOffset),
      })
    );

    return Response.json({ monthly }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch monthly analytics", error);
    return Response.json({ error: "Failed to fetch monthly analytics" }, { status: 500 });
  }
}
