import { prisma } from "@/lib/prisma";
import { getOwnedVehicle, jsonError, withUser } from "@/lib/server";
import { parseExpenseInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withUser(request, "save expense", async (user) => {
    const parsed = parseExpenseInput(await readJsonBody(request));
    if (!parsed.ok) return jsonError(parsed.error, 400);
    if (!(await getOwnedVehicle(user.id, parsed.value.vehicleId))) return jsonError("Vehicle not found", 404);

    const { vehicleId, category, occurredOn, amountPaise, note } = parsed.value;
    const expense = await prisma.expense.create({ data: { userId: user.id, vehicleId, category, occurredOn, amountPaise, note } });
    return Response.json({ expense }, { status: 201 });
  });
}
