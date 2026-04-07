import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type FuelEntryPayload = {
  odometer: number;
  fuel_price: number;
  amount_paid: number;
  fuel_volume: number;
  is_reserve: boolean;
  vehicleId?: string | null;
};

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

export async function GET(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId");

    const entries = await prisma.fuelEntry.findMany({
      where: {
        userId: user.id,
        ...(vehicleId ? { vehicleId } : {}),
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        odometer: true,
        fuel_volume: true,
        is_reserve: true,
        created_at: true,
      },
    });

    return Response.json({ entries }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Failed to fetch fuel entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    const body = (await request.json()) as Partial<FuelEntryPayload>;

    const odometer = Number(body.odometer);
    const fuelPrice = Number(body.fuel_price);
    const amountPaid = Number(body.amount_paid);
    const fuelVolume = Number(body.fuel_volume);
    const isReserve = Boolean(body.is_reserve);
    const vehicleId =
      typeof body.vehicleId === "string" && body.vehicleId.trim().length > 0
        ? body.vehicleId.trim()
        : null;

    if (
      !Number.isFinite(odometer) ||
      !Number.isFinite(fuelPrice) ||
      !Number.isFinite(amountPaid) ||
      !Number.isFinite(fuelVolume)
    ) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const latestEntry = await prisma.fuelEntry.findFirst({
      where: {
        userId: user.id,
        vehicleId,
      },
      orderBy: {
        odometer: "desc",
      },
      select: {
        odometer: true,
      },
    });

    if (latestEntry && odometer <= latestEntry.odometer) {
      return Response.json(
        { message: "Odometer must be greater than previous reading" },
        { status: 400 }
      );
    }

    const savedEntry = await prisma.fuelEntry.create({
      data: {
        userId: user.id,
        vehicleId,
        odometer,
        fuel_price: fuelPrice,
        amount_paid: amountPaid,
        fuel_volume: fuelVolume,
        is_reserve: isReserve,
      },
    });

    return Response.json({ id: savedEntry.id, success: true }, { status: 201 });
  } catch {
    return Response.json({ error: "Failed to save fuel entry" }, { status: 500 });
  }
}
