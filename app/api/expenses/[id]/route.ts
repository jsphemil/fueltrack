import { prisma } from "@/lib/prisma";
import { jsonError, withUser } from "@/lib/server";
import { parseExpenseInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

// Edits an expense. It stays on the same vehicle.
export async function PATCH(request: Request, context: Context) {
  return withUser(request, "update expense", async (user) => {
    const { id } = await context.params;
    const existing = await prisma.expense.findFirst({ where: { id, userId: user.id } });
    if (!existing) return jsonError("Expense not found", 404);

    const parsed = parseExpenseInput({ ...(await readJsonBody(request)), vehicleId: existing.vehicleId });
    if (!parsed.ok) return jsonError(parsed.error, 400);

    const { category, occurredOn, amountPaise, note } = parsed.value;
    const expense = await prisma.expense.update({ where: { id }, data: { category, occurredOn, amountPaise, note } });
    return Response.json({ expense });
  });
}

export async function DELETE(request: Request, context: Context) {
  return withUser(request, "delete expense", async (user) => {
    const { id } = await context.params;
    const result = await prisma.expense.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return jsonError("Expense not found", 404);
    return Response.json({ success: true });
  });
}
