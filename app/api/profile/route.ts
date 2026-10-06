import { prisma } from "@/lib/prisma";
import { ensureUser, getUserFromRequest } from "@/lib/auth";
import { parseProfileInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

const profileSelect = {
  id: true,
  userId: true,
  name: true,
  createdAt: true,
} as const;

export async function GET(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: profileSelect,
    });

    return Response.json({ profile }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch profile", error);
    return Response.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    const parsed = parseProfileInput(await readJsonBody(request));
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    await ensureUser(user.id);

    const profile = await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: { name: parsed.value.name },
      create: { userId: user.id, name: parsed.value.name },
      select: profileSelect,
    });

    return Response.json({ profile, success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to save profile", error);
    return Response.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
