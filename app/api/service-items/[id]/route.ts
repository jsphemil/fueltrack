import { prisma } from "@/lib/prisma";
import { jsonError, withUser } from "@/lib/server";
import { parseServiceItemInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  return withUser(request, "update service item", async (user) => {
    const { id } = await context.params;
    const existing = await prisma.serviceItem.findFirst({ where: { id, userId: user.id } });
    if (!existing) return jsonError("Service item not found", 404);

    const parsed = parseServiceItemInput(await readJsonBody(request));
    if (!parsed.ok) return jsonError(parsed.error, 400);

    // Blank "last done" fields keep the current starting point.
    const { baselineOdometer, baselineDate, ...rest } = parsed.value;
    const item = await prisma.serviceItem.update({
      where: { id },
      data: { ...rest, baselineOdometer: baselineOdometer ?? existing.baselineOdometer, baselineDate: baselineDate ?? existing.baselineDate },
    });
    return Response.json({ item });
  });
}

// Removes the item; past services keep their date, odometer and cost.
export async function DELETE(request: Request, context: Context) {
  return withUser(request, "delete service item", async (user) => {
    const { id } = await context.params;
    const result = await prisma.serviceItem.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return jsonError("Service item not found", 404);
    return Response.json({ success: true });
  });
}
