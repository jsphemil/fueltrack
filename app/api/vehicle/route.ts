import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type VehiclePayload = {
  name: string;
  initial_odometer: number;
};

const DEVELOPMENT_USER_ID = "dev-local-user";

function getBearerToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7).trim();
}

async function getUserFromRequest(request: Request) {
  if (process.env.NODE_ENV === "development") {
    await prisma.user.upsert({
      where: { id: DEVELOPMENT_USER_ID },
      update: {},
      create: { id: DEVELOPMENT_USER_ID },
    });

    return {
      user: { id: DEVELOPMENT_USER_ID },
      error: null,
      status: 200 as const,
    };
  }

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

    const body = (await request.json()) as Partial<VehiclePayload>;
    const name = String(body.name ?? "").trim();
    const initialOdometer = Number(body.initial_odometer);

    if (!name || !Number.isFinite(initialOdometer) || initialOdometer < 0) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        userId: user.id,
        name,
        initial_odometer: initialOdometer,
      },
      select: { id: true },
    });

    return Response.json({ id: vehicle.id, success: true }, { status: 201 });
  } catch {
    return Response.json({ error: "Failed to save vehicle" }, { status: 500 });
  }
}
