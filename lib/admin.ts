// Server-only: the admin gate.
import type { AuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, withUser } from "@/lib/server";

// Like withUser, but only for users with isAdmin. Everyone else gets a plain 404,
// so the admin area does not reveal that it exists.
export function withAdmin(request: Request, label: string, handler: (user: AuthenticatedUser) => Promise<Response>) {
  return withUser(request, label, async (user) => {
    const record = await prisma.user.findUnique({ where: { id: user.id }, select: { isAdmin: true } });
    if (!record?.isAdmin) return jsonError("Not found", 404);
    return handler(user);
  });
}
