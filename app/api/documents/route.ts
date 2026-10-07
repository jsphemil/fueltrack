import { ensureUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedVehicle, jsonError, withUser } from "@/lib/server";
import { parseDocumentInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withUser(request, "load documents", async (user) => {
    const documents = await prisma.document.findMany({ where: { userId: user.id }, orderBy: { expiresOn: "asc" } });
    return Response.json({ documents });
  });
}

export async function POST(request: Request) {
  return withUser(request, "save document", async (user) => {
    const parsed = parseDocumentInput(await readJsonBody(request));
    if (!parsed.ok) return jsonError(parsed.error, 400);
    if (parsed.value.vehicleId && !(await getOwnedVehicle(user.id, parsed.value.vehicleId))) {
      return jsonError("Vehicle not found", 404);
    }

    await ensureUser(user.id);
    const document = await prisma.document.create({ data: { userId: user.id, ...parsed.value } });
    return Response.json({ document }, { status: 201 });
  });
}
