import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function getBearerToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7).trim();
}

async function getUserFromRequest(request: Request) {
  const token = getBearerToken(request.headers.get("authorization"));
  if (!token) {
    return { user: null, error: "Unauthorized", status: 401 as const };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      user: null,
      error: "Missing Supabase environment variables",
      status: 500 as const,
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, error: "Unauthorized", status: 401 as const };
  }

  return { user: { id: data.user.id }, error: null, status: 200 as const };
}

export async function POST(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    await prisma.$transaction([
      prisma.userProfile.deleteMany({
        where: {
          userId: user.id,
        },
      }),
      prisma.fuelEntry.deleteMany({
        where: {
          userId: user.id,
        },
      }),
      prisma.vehicle.deleteMany({
        where: {
          userId: user.id,
        },
      }),
    ]);

    return Response.json({ success: true }, { status: 200 });
  } catch {
    return Response.json({ error: "Failed to reset account" }, { status: 500 });
  }
}
