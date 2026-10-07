import { prisma } from "@/lib/prisma";
import { getOwnedVehicle, jsonError, withUser } from "@/lib/server";
import { parseIssueInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

// Notes a problem with the vehicle; it stays open until a service fixes it.
export async function POST(request: Request, context: Context) {
  return withUser(request, "save issue", async (user) => {
    const { id } = await context.params;
    const vehicle = await getOwnedVehicle(user.id, id);
    if (!vehicle) return jsonError("Vehicle not found", 404);

    const parsed = parseIssueInput(await readJsonBody(request));
    if (!parsed.ok) return jsonError(parsed.error, 400);

    const issue = await prisma.issue.create({ data: { ...parsed.value, userId: user.id, vehicleId: vehicle.id } });
    return Response.json({ issue }, { status: 201 });
  });
}
