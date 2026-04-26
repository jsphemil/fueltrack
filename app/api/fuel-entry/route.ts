import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type FuelEntryPayload = {
  id?: string;
  odometer: number;
  fuel_price: number;
  amount_paid: number;
  fuel_volume: number;
  is_reserve: boolean;
  vehicleId?: string | null;
};

type MonthlySpendSummary = {
  month: string;
  total_spend: number;
};

function formatMonthKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function buildMonthlySpend(entries: Array<{ created_at: Date; amount_paid: number }>) {
  const monthlyTotals = new Map<string, number>();

  for (const entry of entries) {
    const monthKey = formatMonthKey(entry.created_at);
    monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) ?? 0) + entry.amount_paid);
  }

  return [...monthlyTotals.entries()]
    .sort(([monthA], [monthB]) => (monthA < monthB ? 1 : monthA > monthB ? -1 : 0))
    .map(([month, totalSpend]) => ({
      month,
      total_spend: Number(totalSpend.toFixed(2)),
    })) satisfies MonthlySpendSummary[];
}

async function validateOdometerForVehicle(params: {
  userId: string;
  vehicleId: string | null;
  odometer: number;
  excludeId?: string;
}) {
  const latestEntry = await prisma.fuelEntry.findFirst({
    where: {
      userId: params.userId,
      vehicleId: params.vehicleId,
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
    },
    orderBy: [
      { created_at: "desc" },
      { id: "desc" },
    ],
    select: {
      odometer: true,
    },
  });

  if (latestEntry) {
    if (params.odometer <= latestEntry.odometer) {
      return {
        valid: false as const,
        message: "Odometer must be greater than previous reading",
      };
    }

    return { valid: true as const };
  }

  if (params.vehicleId) {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: params.vehicleId,
        userId: params.userId,
      },
      select: {
        initial_odometer: true,
      },
    });

    if (vehicle && params.odometer <= vehicle.initial_odometer) {
      return {
        valid: false as const,
        message: "Odometer must be greater than initial reading",
      };
    }
  }

  return { valid: true as const };
}

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
        fuel_price: true,
        amount_paid: true,
        fuel_volume: true,
        is_reserve: true,
        vehicleId: true,
        created_at: true,
      },
    });

    const spendEntries = await prisma.fuelEntry.findMany({
      where: {
        userId: user.id,
        ...(vehicleId ? { vehicleId } : {}),
      },
      select: {
        amount_paid: true,
        created_at: true,
      },
    });

    const monthly_spend = buildMonthlySpend(spendEntries);

    return Response.json({ entries, monthly_spend }, { status: 200 });
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

    const odometerValidation = await validateOdometerForVehicle({
      userId: user.id,
      vehicleId,
      odometer,
    });
    if (!odometerValidation.valid) {
      return Response.json(
        { message: odometerValidation.message },
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

export async function PUT(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    const body = (await request.json()) as Partial<FuelEntryPayload>;
    const id = String(body.id ?? "").trim();
    const odometer = Number(body.odometer);
    const fuelPrice = Number(body.fuel_price);
    const amountPaid = Number(body.amount_paid);
    const fuelVolume = Number(body.fuel_volume);
    const isReserve = Boolean(body.is_reserve);

    if (
      !id ||
      !Number.isFinite(odometer) ||
      !Number.isFinite(fuelPrice) ||
      !Number.isFinite(amountPaid) ||
      !Number.isFinite(fuelVolume)
    ) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const existingEntry = await prisma.fuelEntry.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        vehicleId: true,
      },
    });

    if (!existingEntry) {
      return Response.json({ error: "Fuel entry not found" }, { status: 404 });
    }

    const odometerValidation = await validateOdometerForVehicle({
      userId: user.id,
      vehicleId: existingEntry.vehicleId,
      odometer,
      excludeId: existingEntry.id,
    });
    if (!odometerValidation.valid) {
      return Response.json(
        { message: odometerValidation.message },
        { status: 400 }
      );
    }

    await prisma.fuelEntry.update({
      where: {
        id: existingEntry.id,
      },
      data: {
        odometer,
        fuel_price: fuelPrice,
        amount_paid: amountPaid,
        fuel_volume: fuelVolume,
        is_reserve: isReserve,
      },
    });

    return Response.json({ success: true }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Failed to update fuel entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    const { searchParams } = new URL(request.url);
    const id = (searchParams.get("id") ?? "").trim();
    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }

    const existingEntry = await prisma.fuelEntry.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existingEntry) {
      return Response.json({ error: "Fuel entry not found" }, { status: 404 });
    }

    await prisma.fuelEntry.delete({
      where: {
        id: existingEntry.id,
      },
    });

    return Response.json({ success: true }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Failed to delete fuel entry" },
      { status: 500 }
    );
  }
}
