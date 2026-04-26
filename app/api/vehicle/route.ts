import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type VehiclePayload = {
  name: string;
  vehicleType?: string;
  type?: string;
  initial_odometer: number;
};

type AuthenticatedUser = {
  id: string;
  email?: string | null;
};

type VehicleStatistics = {
  lastOdometer: number;
  totalFuelSpend: number;
  averageMileage: number | null;
};

function calculateVehicleStatistics(params: {
  initialOdometer: number;
  entries: Array<{
    odometer: number;
    amount_paid: number;
    fuel_volume: number;
  }>;
}): VehicleStatistics {
  const { initialOdometer, entries } = params;

  if (entries.length === 0) {
    return {
      lastOdometer: initialOdometer,
      totalFuelSpend: 0,
      averageMileage: null,
    };
  }

  const orderedEntries = [...entries].sort((a, b) => a.odometer - b.odometer);
  const mileages: number[] = [];

  for (let index = 1; index < orderedEntries.length; index += 1) {
    const previous = orderedEntries[index - 1];
    const current = orderedEntries[index];
    const distance = current.odometer - previous.odometer;

    if (distance <= 0 || previous.fuel_volume <= 0) {
      continue;
    }

    mileages.push(distance / previous.fuel_volume);
  }

  const averageMileage =
    mileages.length > 0
      ? mileages.reduce((sum, value) => sum + value, 0) / mileages.length
      : null;
  const totalFuelSpend = entries.reduce((sum, entry) => sum + entry.amount_paid, 0);
  const lastOdometer = orderedEntries[orderedEntries.length - 1].odometer;

  return {
    lastOdometer,
    totalFuelSpend,
    averageMileage,
  };
}

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

  const user: AuthenticatedUser = {
    id: data.user.id,
    email: data.user.email,
  };

  return { user, error: null, status: 200 as const };
}

export async function POST(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    const body = (await request.json()) as Partial<VehiclePayload>;
    const name = String(body.name ?? "").trim();
    const vehicleType = String(body.vehicleType ?? body.type ?? "").trim();
    const initialOdometer = Number(body.initial_odometer);

    if (!name || !vehicleType || !Number.isFinite(initialOdometer) || initialOdometer < 0) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const userId = user.id;
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      await prisma.user.create({
        data: {
          id: userId,
        },
      });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        userId,
        name,
        vehicleType,
        initial_odometer: initialOdometer,
      },
      select: { id: true, name: true, vehicleType: true, initial_odometer: true },
    });

    return Response.json({ vehicle, success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to save vehicle", error);
    return Response.json({ error: "Failed to save vehicle" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { userId: user.id },
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        name: true,
        vehicleType: true,
        initial_odometer: true,
      },
    });

    const fuelEntries = await prisma.fuelEntry.findMany({
      where: {
        userId: user.id,
        vehicleId: {
          not: null,
        },
      },
      select: {
        vehicleId: true,
        odometer: true,
        amount_paid: true,
        fuel_volume: true,
      },
    });

    const entriesByVehicleId = new Map<
      string,
      Array<{
        odometer: number;
        amount_paid: number;
        fuel_volume: number;
      }>
    >();

    for (const entry of fuelEntries) {
      if (!entry.vehicleId) {
        continue;
      }

      const existingEntries = entriesByVehicleId.get(entry.vehicleId) ?? [];
      existingEntries.push({
        odometer: entry.odometer,
        amount_paid: entry.amount_paid,
        fuel_volume: entry.fuel_volume,
      });
      entriesByVehicleId.set(entry.vehicleId, existingEntries);
    }

    const vehiclesWithStatistics = vehicles.map((vehicle) => {
      const vehicleEntries = entriesByVehicleId.get(vehicle.id) ?? [];
      const statistics = calculateVehicleStatistics({
        initialOdometer: vehicle.initial_odometer,
        entries: vehicleEntries,
      });

      return {
        ...vehicle,
        ...statistics,
      };
    });

    return Response.json({ vehicles: vehiclesWithStatistics }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch vehicles", error);
    return Response.json({ error: "Failed to fetch vehicles" }, { status: 500 });
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

    const existingVehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existingVehicle) {
      return Response.json({ error: "Vehicle not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.fuelEntry.deleteMany({
        where: {
          userId: user.id,
          vehicleId: existingVehicle.id,
        },
      }),
      prisma.vehicle.delete({
        where: {
          id: existingVehicle.id,
        },
      }),
    ]);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete vehicle", error);
    return Response.json({ error: "Failed to delete vehicle" }, { status: 500 });
  }
}
