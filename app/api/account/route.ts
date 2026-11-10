import { prisma } from "@/lib/prisma";
import { withUser } from "@/lib/server";

export const runtime = "nodejs";

// Deletes the account for good: the profile with every vehicle and entry (cascade),
// then the sign-in itself in Supabase Auth (its sessions go with it). One transaction,
// so a failure leaves everything as it was.
export async function DELETE(request: Request) {
  return withUser(request, "delete account", async (user) => {
    await prisma.$transaction([
      prisma.user.deleteMany({ where: { id: user.id } }),
      prisma.$executeRaw`delete from auth.users where id = ${user.id}::uuid`,
    ]);
    return Response.json({ success: true });
  });
}
