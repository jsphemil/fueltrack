import { prisma } from "@/lib/prisma";
import { getOwnedVehicle, jsonError, withUser } from "@/lib/server";
import { parseDocumentInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  return withUser(request, "update document", async (user) => {
    const { id } = await context.params;
    const existing = await prisma.document.findFirst({ where: { id, userId: user.id } });
    if (!existing) return jsonError("Document not found", 404);

    const parsed = parseDocumentInput(await readJsonBody(request));
    if (!parsed.ok) return jsonError(parsed.error, 400);
    if (parsed.value.vehicleId && !(await getOwnedVehicle(user.id, parsed.value.vehicleId))) {
      return jsonError("Vehicle not found", 404);
    }

    const document = await prisma.document.update({ where: { id }, data: parsed.value });
    return Response.json({ document });
  });
}

export async function DELETE(request: Request, context: Context) {
  return withUser(request, "delete document", async (user) => {
    const { id } = await context.params;
    const result = await prisma.document.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return jsonError("Document not found", 404);
    return Response.json({ success: true });
  });
}
