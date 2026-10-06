import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    await prisma.$transaction([
      prisma.userProfile.deleteMany({ where: { userId: user.id } }),
      prisma.fuelEntry.deleteMany({ where: { userId: user.id } }),
      prisma.vehicle.deleteMany({ where: { userId: user.id } }),
    ]);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to reset account", error);
    return Response.json({ error: "Failed to reset account" }, { status: 500 });
  }
}
