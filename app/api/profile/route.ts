import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const DEVELOPMENT_USER_ID = "dev-local-user";

type AuthenticatedUser = {
  id: string;
};

function getBearerToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7).trim();
}

async function getUserFromRequest(request: Request): Promise<{
  user: AuthenticatedUser | null;
  error: string | null;
  status: 200 | 401 | 500;
}> {
  if (process.env.NODE_ENV === "development") {
    await prisma.user.upsert({
      where: { id: DEVELOPMENT_USER_ID },
      update: {},
      create: { id: DEVELOPMENT_USER_ID },
    });

    return {
      user: { id: DEVELOPMENT_USER_ID },
      error: null,
      status: 200,
    };
  }

  const token = getBearerToken(request.headers.get("authorization"));
  if (!token) {
    return { user: null, error: "Unauthorized", status: 401 };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      user: null,
      error: "Missing Supabase environment variables",
      status: 500,
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
    return { user: null, error: "Unauthorized", status: 401 };
  }

  return { user: { id: data.user.id }, error: null, status: 200 };
}

export async function GET(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        userId: true,
        name: true,
        createdAt: true,
      },
    });

    return Response.json({ profile }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch profile", error);
    return Response.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    const body = (await request.json()) as { name?: unknown };
    const name = String(body.name ?? "").trim();

    if (!name) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: { id: user.id },
    });

    const profile = await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: { name },
      create: {
        userId: user.id,
        name,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        createdAt: true,
      },
    });

    return Response.json({ profile, success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to save profile", error);
    return Response.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
