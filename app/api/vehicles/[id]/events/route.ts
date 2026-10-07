import { buildTimeline, getOwnedVehicle, getVehicleEvents, jsonError, withUser } from "@/lib/server";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  return withUser(request, "load history", async (user) => {
    const { id } = await context.params;
    const vehicle = await getOwnedVehicle(user.id, id);
    if (!vehicle) return jsonError("Vehicle not found", 404);
    return Response.json(buildTimeline(vehicle, await getVehicleEvents(id)));
  });
}
