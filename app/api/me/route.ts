import { ensureUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, withUser } from "@/lib/server";
import { parseLowFuelInput, parseProfileInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withUser(request, "load profile", async (user) => {
    const record = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, lowFuelKm: true } });
    const vehicleCount = await prisma.vehicle.count({ where: { userId: user.id } });
    return Response.json({ user: { id: user.id, email: user.email ?? null, name: record?.name ?? null, lowFuelKm: record?.lowFuelKm ?? null, vehicleCount } });
  });
}

export async function PATCH(request: Request) {
  return withUser(request, "save profile", async (user) => {
    // A body with lowFuelKm updates the reminder; otherwise the name.
    const body = await readJsonBody(request);
    const parsed = body && "lowFuelKm" in body ? parseLowFuelInput(body) : parseProfileInput(body);
    if (!parsed.ok) return jsonError(parsed.error, 400);

    await ensureUser(user.id);
    const record = await prisma.user.update({ where: { id: user.id }, data: parsed.value });
    return Response.json({ user: { id: user.id, email: user.email ?? null, name: record.name, lowFuelKm: record.lowFuelKm } });
  });
}

// Deletes the profile, vehicles and all events. The login itself stays.
export async function DELETE(request: Request) {
  return withUser(request, "delete data", async (user) => {
    await prisma.user.deleteMany({ where: { id: user.id } });
    return Response.json({ success: true });
  });
}
