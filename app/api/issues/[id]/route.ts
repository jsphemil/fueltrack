import { prisma } from "@/lib/prisma";
import { jsonError, withUser } from "@/lib/server";
import { parseIssueInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  return withUser(request, "update issue", async (user) => {
    const { id } = await context.params;
    const existing = await prisma.issue.findFirst({ where: { id, userId: user.id } });
    if (!existing) return jsonError("Issue not found", 404);

    const parsed = parseIssueInput(await readJsonBody(request));
    if (!parsed.ok) return jsonError(parsed.error, 400);

    const issue = await prisma.issue.update({ where: { id }, data: parsed.value });
    return Response.json({ issue });
  });
}

// For issues noted by mistake or that went away on their own.
export async function DELETE(request: Request, context: Context) {
  return withUser(request, "delete issue", async (user) => {
    const { id } = await context.params;
    const result = await prisma.issue.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return jsonError("Issue not found", 404);
    return Response.json({ success: true });
  });
}
