import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type MonthlyVehicleSummary = {
  month: string;
  total_spend: number;
  total_distance: number;
  average_mileage: number | null;
};

type VehicleMonthlyAnalytics = {
  vehicleId: string;
  monthly: MonthlyVehicleSummary[];
};

function formatMonthKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function buildVehicleMonthlyAnalytics(entries: Array<{
  odometer: number;
  fuel_volume: number;
  amount_paid: number;
  created_at: Date;
}>): MonthlyVehicleSummary[] {
  const orderedEntries = [...entries].sort((a, b) => a.odometer - b.odometer);
  const monthlyMap = new Map<
    string,
    { totalSpend: number; totalDistance: number; mileageSum: number; mileageCount: number }
  >();

  for (let index = 0; index < orderedEntries.length; index += 1) {
    const current = orderedEntries[index];
    const monthKey = formatMonthKey(current.created_at);
    const monthBucket = monthlyMap.get(monthKey) ?? {
      totalSpend: 0,
      totalDistance: 0,
      mileageSum: 0,
      mileageCount: 0,
    };

    monthBucket.totalSpend += current.amount_paid;

    if (index > 0) {
      const previous = orderedEntries[index - 1];
      const distance = current.odometer - previous.odometer;

      if (distance > 0) {
        monthBucket.totalDistance += distance;

        if (previous.fuel_volume > 0) {
          monthBucket.mileageSum += distance / previous.fuel_volume;
          monthBucket.mileageCount += 1;
        }
      }
    }

    monthlyMap.set(monthKey, monthBucket);
  }

  return [...monthlyMap.entries()]
    .sort(([monthA], [monthB]) => (monthA < monthB ? 1 : monthA > monthB ? -1 : 0))
    .map(([month, bucket]) => ({
      month,
      total_spend: Number(bucket.totalSpend.toFixed(2)),
      total_distance: Number(bucket.totalDistance.toFixed(2)),
      average_mileage:
        bucket.mileageCount > 0
          ? Number((bucket.mileageSum / bucket.mileageCount).toFixed(2))
          : null,
    }));
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
    const vehicleIdFilter = searchParams.get("vehicleId");

    const entries = await prisma.fuelEntry.findMany({
      where: {
        userId: user.id,
        ...(vehicleIdFilter ? { vehicleId: vehicleIdFilter } : {}),
      },
      select: {
        vehicleId: true,
        odometer: true,
        fuel_volume: true,
        amount_paid: true,
        created_at: true,
      },
    });

    const groupedByVehicle = new Map<string, typeof entries>();

    for (const entry of entries) {
      if (!entry.vehicleId) {
        continue;
      }
      const existing = groupedByVehicle.get(entry.vehicleId) ?? [];
      existing.push(entry);
      groupedByVehicle.set(entry.vehicleId, existing);
    }

    const monthly: VehicleMonthlyAnalytics[] = [...groupedByVehicle.entries()].map(
      ([vehicleId, vehicleEntries]) => ({
        vehicleId,
        monthly: buildVehicleMonthlyAnalytics(vehicleEntries),
      })
    );

    return Response.json({ monthly }, { status: 200 });
  } catch {
    return Response.json({ error: "Failed to fetch monthly analytics" }, { status: 500 });
  }
}
