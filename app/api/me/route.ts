import { ensureUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, withUser } from "@/lib/server";
import { parseProfileInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withUser(request, "load profile", async (user) => {
    const record = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
    const vehicleCount = await prisma.vehicle.count({ where: { userId: user.id } });
    return Response.json({ user: { id: user.id, email: user.email ?? null, name: record?.name ?? null, vehicleCount } });
  });
}

export async function PATCH(request: Request) {
  return withUser(request, "save profile", async (user) => {
    const parsed = parseProfileInput(await readJsonBody(request));
    if (!parsed.ok) return jsonError(parsed.error, 400);

    await ensureUser(user.id);
    const record = await prisma.user.update({ where: { id: user.id }, data: { name: parsed.value.name } });
    return Response.json({ user: { id: user.id, email: user.email ?? null, name: record.name } });
  });
}

// Deletes the profile, vehicles and all events. The login itself stays.
export async function DELETE(request: Request) {
  return withUser(request, "delete data", async (user) => {
    await prisma.user.deleteMany({ where: { id: user.id } });
    return Response.json({ success: true });
  });
}
