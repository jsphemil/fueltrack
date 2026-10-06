import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { buildMileageTrend } from "@/lib/mileage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    const { searchParams } = new URL(request.url);
    const vehicleIdFilter = searchParams.get("vehicleId");

    if (!vehicleIdFilter) {
      return Response.json({ trend: [] }, { status: 200 });
    }

    const entries = await prisma.fuelEntry.findMany({
      where: { userId: user.id, vehicleId: vehicleIdFilter },
      select: {
        odometer: true,
        fuel_volume: true,
        amount_paid: true,
        is_reserve: true,
        filled_at: true,
      },
    });

    return Response.json({ trend: buildMileageTrend(entries) }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch mileage trend", error);
    return Response.json({ error: "Failed to fetch mileage trend" }, { status: 500 });
  }
}
