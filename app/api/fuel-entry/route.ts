import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type FuelEntryPayload = {
  odometer: number;
  fuel_price: number;
  amount_paid: number;
  fuel_volume: number;
  is_reserve: boolean;
};

function getBearerToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7).trim();
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json(
        { error: "Missing Supabase environment variables" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(
      token
    );

    if (userError || !userData.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<FuelEntryPayload>;

    const odometer = Number(body.odometer);
    const fuelPrice = Number(body.fuel_price);
    const amountPaid = Number(body.amount_paid);
    const fuelVolume = Number(body.fuel_volume);
    const isReserve = Boolean(body.is_reserve);

    if (
      !Number.isFinite(odometer) ||
      !Number.isFinite(fuelPrice) ||
      !Number.isFinite(amountPaid) ||
      !Number.isFinite(fuelVolume)
    ) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const savedEntry = await prisma.fuelEntry.create({
      data: {
        userId: userData.user.id,
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
