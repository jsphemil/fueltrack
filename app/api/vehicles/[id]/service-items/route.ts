import { prisma } from "@/lib/prisma";
import { getOwnedVehicle, jsonError, withUser } from "@/lib/server";
import { parseServiceItemInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

const todayUtc = () => new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);

export async function POST(request: Request, context: Context) {
  return withUser(request, "save service item", async (user) => {
    const { id } = await context.params;
    const vehicle = await getOwnedVehicle(user.id, id);
    if (!vehicle) return jsonError("Vehicle not found", 404);

    const parsed = parseServiceItemInput(await readJsonBody(request));
    if (!parsed.ok) return jsonError(parsed.error, 400);

    const { baselineOdometer, baselineDate, ...rest } = parsed.value;
    const item = await prisma.serviceItem.create({
      data: {
        ...rest,
        userId: user.id,
        vehicleId: vehicle.id,
        baselineOdometer: baselineOdometer ?? vehicle.startOdometer,
        baselineDate: baselineDate ?? todayUtc(),
      },
    });
    return Response.json({ item }, { status: 201 });
  });
}
