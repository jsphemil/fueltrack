import { calculateStats } from "@/lib/engine";
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
    return Response.json({ stats });
  });
}
