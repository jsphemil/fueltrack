import { prisma } from "@/lib/prisma";
import { jsonError, withUser } from "@/lib/server";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: Context) {
  return withUser(request, "delete expense", async (user) => {
    const { id } = await context.params;
    const result = await prisma.expense.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return jsonError("Expense not found", 404);
    return Response.json({ success: true });
  });
}
