import { Prisma } from "@prisma/client";

import { ensureUser } from "@/lib/auth";
import { mergePreferences } from "@/lib/preferences";
import { prisma } from "@/lib/prisma";
import { jsonError, withUser } from "@/lib/server";
import { parseLowFuelInput, parsePreferencesInput, parseProfileInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withUser(request, "load profile", async (user) => {
    const record = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, lowFuelKm: true, preferences: true } });
    const vehicleCount = await prisma.vehicle.count({ where: { userId: user.id } });
    return Response.json({ user: { id: user.id, email: user.email ?? null, name: record?.name ?? null, lowFuelKm: record?.lowFuelKm ?? null, preferences: mergePreferences(record?.preferences), vehicleCount } });
  });
}

export async function PATCH(request: Request) {
  return withUser(request, "save profile", async (user) => {
    const body = await readJsonBody(request);

    // A body with preferences changes the named customisation keys (null resets all).
    if (body && "preferences" in body) {
      const parsedPreferences = parsePreferencesInput(body);
      if (!parsedPreferences.ok) return jsonError(parsedPreferences.error, 400);

      await ensureUser(user.id);
      const current = await prisma.user.findUnique({ where: { id: user.id }, select: { preferences: true } });
      const next = parsedPreferences.value === null ? Prisma.DbNull : mergePreferences({ ...mergePreferences(current?.preferences), ...parsedPreferences.value });
      const saved = await prisma.user.update({ where: { id: user.id }, data: { preferences: next } });
      return Response.json({ user: { id: user.id, email: user.email ?? null, name: saved.name, lowFuelKm: saved.lowFuelKm, preferences: mergePreferences(saved.preferences) } });
    }

    // A body with lowFuelKm updates the reminder; otherwise the name.
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
